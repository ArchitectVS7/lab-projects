"""Main synchronization logic for DataSync."""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from dataclasses import dataclass, field

from .config import Config
from .db import PostgresConnection, MongoConnection

logger = logging.getLogger(__name__)


@dataclass
class SyncStats:
    """Statistics for a sync operation."""
    table: str
    direction: str
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None
    rows_processed: int = 0
    rows_inserted: int = 0
    rows_updated: int = 0
    rows_skipped: int = 0
    errors: list[str] = field(default_factory=list)
    
    @property
    def duration_seconds(self) -> float | None:
        if self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    def to_dict(self) -> dict:
        return {
            'table': self.table,
            'direction': self.direction,
            'started_at': self.started_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration_seconds': self.duration_seconds,
            'rows_processed': self.rows_processed,
            'rows_inserted': self.rows_inserted,
            'rows_updated': self.rows_updated,
            'rows_skipped': self.rows_skipped,
            'errors': self.errors,
        }


class ConflictResolver:
    """Handles sync conflict resolution strategies."""
    
    STRATEGIES = {'latest_wins', 'postgres_priority', 'mongo_priority', 'source_wins'}
    
    def __init__(self, strategy: str = 'latest_wins'):
        if strategy not in self.STRATEGIES:
            logger.warning(f"Unknown strategy '{strategy}', using 'latest_wins'")
            strategy = 'latest_wins'
        self.strategy = strategy
    
    def resolve(
        self, 
        source_doc: dict, 
        target_doc: dict | None,
        source_type: str,  # 'postgres' or 'mongo'
    ) -> dict | None:
        """Resolve conflicts between source and target documents.
        
        Returns the document to write, or None to skip.
        """
        if target_doc is None:
            return source_doc
        
        if self.strategy == 'source_wins':
            return source_doc
        
        elif self.strategy == 'postgres_priority':
            return source_doc if source_type == 'postgres' else None
        
        elif self.strategy == 'mongo_priority':
            return source_doc if source_type == 'mongo' else None
        
        elif self.strategy == 'latest_wins':
            # Compare updated_at timestamps
            source_time = self._get_timestamp(source_doc)
            target_time = self._get_timestamp(target_doc)
            
            if source_time is None and target_time is None:
                return source_doc
            if source_time is None:
                return None
            if target_time is None:
                return source_doc
            
            return source_doc if source_time >= target_time else None
        
        return source_doc
    
    def _get_timestamp(self, doc: dict) -> datetime | None:
        """Extract timestamp from document, checking common field names."""
        for field in ('updated_at', 'updatedAt', 'modified_at', 'modifiedAt', '_updated'):
            if field in doc:
                val = doc[field]
                if isinstance(val, datetime):
                    return val
                # Try parsing string timestamps
                if isinstance(val, str):
                    try:
                        return datetime.fromisoformat(val.replace('Z', '+00:00'))
                    except ValueError:
                        pass
        return None


class DataSync:
    """Main synchronization engine."""
    
    def __init__(self, config: Config):
        self.config = config
        self.postgres = PostgresConnection(config)
        self.mongo = MongoConnection(config)
        self.resolver = ConflictResolver(
            config.sync.get('conflict_resolution', 'latest_wins')
        )
        self.batch_size = config.sync.get('batch_size', 1000)
        self.direction = config.sync.get('direction', 'postgres_to_mongo')
    
    def connect(self) -> None:
        """Establish all database connections."""
        logger.info("Connecting to databases...")
        self.postgres.connect()
        self.mongo.connect()
        logger.info("All database connections established")
    
    def close(self) -> None:
        """Close all database connections."""
        logger.info("Closing database connections...")
        self.postgres.close()
        self.mongo.close()
    
    def __enter__(self) -> 'DataSync':
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()
    
    def _convert_pg_to_mongo(self, row: dict) -> dict:
        """Convert PostgreSQL row to MongoDB-compatible document."""
        converted = {}
        for key, value in row.items():
            if isinstance(value, Decimal):
                converted[key] = float(value)
            elif isinstance(value, (bytes, memoryview)):
                converted[key] = bytes(value)
            elif value is None:
                converted[key] = None
            else:
                converted[key] = value
        return converted
    
    def _convert_mongo_to_pg(self, doc: dict) -> dict:
        """Convert MongoDB document to PostgreSQL-compatible row."""
        converted = {}
        for key, value in doc.items():
            if key == '_id':
                continue  # Skip MongoDB's _id
            converted[key] = value
        return converted
    
    def _get_tables_to_sync(self) -> list[dict]:
        """Get list of tables to sync, auto-discovering if not configured."""
        configured_tables = self.config.sync.get('tables', [])
        
        if configured_tables:
            # Use configured tables
            tables = []
            for t in configured_tables:
                if isinstance(t, str):
                    tables.append({
                        'name': t,
                        'collection': t,
                        'primary_key': self.postgres.get_primary_key(t) or 'id'
                    })
                else:
                    tables.append({
                        'name': t.get('name', t.get('table')),
                        'collection': t.get('collection', t.get('name', t.get('table'))),
                        'primary_key': t.get('primary_key', 'id')
                    })
            return tables
        
        # Auto-discover from PostgreSQL
        logger.info("No tables configured, auto-discovering from PostgreSQL...")
        pg_tables = self.postgres.get_tables()
        
        tables = []
        for table_name in pg_tables:
            pk = self.postgres.get_primary_key(table_name)
            if pk:
                tables.append({
                    'name': table_name,
                    'collection': table_name,
                    'primary_key': pk
                })
            else:
                logger.warning(f"Skipping table '{table_name}' - no primary key found")
        
        logger.info(f"Discovered {len(tables)} tables: {[t['name'] for t in tables]}")
        return tables
    
    def sync_postgres_to_mongo(self, table_config: dict) -> SyncStats:
        """Sync a table from PostgreSQL to MongoDB."""
        table_name = table_config['name']
        collection_name = table_config['collection']
        primary_key = table_config['primary_key']
        
        stats = SyncStats(table=table_name, direction='postgres_to_mongo')
        logger.info(f"Syncing PostgreSQL:{table_name} → MongoDB:{collection_name}")
        
        try:
            total_rows = self.postgres.get_row_count(table_name)
            logger.info(f"Total rows to process: {total_rows}")
            
            offset = 0
            while offset < total_rows:
                batch = self.postgres.fetch_batch(table_name, primary_key, self.batch_size, offset)
                if not batch:
                    break
                
                documents_to_write = []
                for row in batch:
                    doc = self._convert_pg_to_mongo(row)
                    existing = self.mongo.get_document(collection_name, primary_key, doc[primary_key])
                    resolved = self.resolver.resolve(doc, existing, 'postgres')
                    
                    if resolved is not None:
                        documents_to_write.append(resolved)
                        if existing is None:
                            stats.rows_inserted += 1
                        else:
                            stats.rows_updated += 1
                    else:
                        stats.rows_skipped += 1
                
                if documents_to_write:
                    self.mongo.upsert_batch(collection_name, documents_to_write, primary_key)
                
                stats.rows_processed += len(batch)
                offset += self.batch_size
                
                pct = 100 * stats.rows_processed / total_rows
                logger.debug(f"Progress: {stats.rows_processed}/{total_rows} ({pct:.1f}%)")
        
        except Exception as e:
            error_msg = f"Error syncing {table_name}: {e}"
            logger.error(error_msg, exc_info=True)
            stats.errors.append(error_msg)
        
        stats.completed_at = datetime.now(timezone.utc)
        logger.info(
            f"Completed {table_name}: {stats.rows_inserted} inserted, "
            f"{stats.rows_updated} updated, {stats.rows_skipped} skipped "
            f"({stats.duration_seconds:.2f}s)"
        )
        return stats
    
    def sync_mongo_to_postgres(self, table_config: dict) -> SyncStats:
        """Sync a collection from MongoDB to PostgreSQL.
        
        Note: This requires the PostgreSQL table to already exist with matching schema.
        """
        table_name = table_config['name']
        collection_name = table_config['collection']
        primary_key = table_config['primary_key']
        
        stats = SyncStats(table=table_name, direction='mongo_to_postgres')
        logger.info(f"Syncing MongoDB:{collection_name} → PostgreSQL:{table_name}")
        
        try:
            collection = self.mongo.db[collection_name]
            total_docs = collection.count_documents({})
            logger.info(f"Total documents to process: {total_docs}")
            
            # Use cursor with batch_size for memory efficiency
            cursor = collection.find().batch_size(self.batch_size)
            
            batch = []
            for doc in cursor:
                row = self._convert_mongo_to_pg(doc)
                batch.append(row)
                
                if len(batch) >= self.batch_size:
                    self._upsert_pg_batch(table_name, batch, primary_key, stats)
                    batch = []
            
            # Process remaining
            if batch:
                self._upsert_pg_batch(table_name, batch, primary_key, stats)
        
        except Exception as e:
            error_msg = f"Error syncing {collection_name}: {e}"
            logger.error(error_msg, exc_info=True)
            stats.errors.append(error_msg)
        
        stats.completed_at = datetime.now(timezone.utc)
        logger.info(
            f"Completed {collection_name}: {stats.rows_inserted} inserted, "
            f"{stats.rows_updated} updated, {stats.rows_skipped} skipped "
            f"({stats.duration_seconds:.2f}s)"
        )
        return stats
    
    def _upsert_pg_batch(
        self, 
        table: str, 
        rows: list[dict], 
        primary_key: str,
        stats: SyncStats
    ) -> None:
        """Upsert a batch of rows to PostgreSQL using ON CONFLICT."""
        if not rows:
            return
        
        # Get column names from first row
        columns = list(rows[0].keys())
        col_names = ', '.join(f'"{c}"' for c in columns)
        placeholders = ', '.join(['%s'] * len(columns))
        update_set = ', '.join(f'"{c}" = EXCLUDED."{c}"' for c in columns if c != primary_key)
        
        query = f'''
            INSERT INTO "{table}" ({col_names})
            VALUES ({placeholders})
            ON CONFLICT ("{primary_key}") DO UPDATE SET {update_set}
        '''
        
        with self.postgres.cursor() as cur:
            for row in rows:
                values = [row.get(c) for c in columns]
                try:
                    cur.execute(query, values)
                    stats.rows_processed += 1
                    # PostgreSQL doesn't easily tell us insert vs update in ON CONFLICT
                    stats.rows_updated += 1
                except Exception as e:
                    stats.errors.append(f"Row {row.get(primary_key)}: {e}")
    
    def sync_table(self, table_config: dict) -> list[SyncStats]:
        """Sync a table according to configured direction."""
        all_stats = []
        
        if self.direction in ('postgres_to_mongo', 'bidirectional'):
            stats = self.sync_postgres_to_mongo(table_config)
            all_stats.append(stats)
        
        if self.direction in ('mongo_to_postgres', 'bidirectional'):
            stats = self.sync_mongo_to_postgres(table_config)
            all_stats.append(stats)
        
        return all_stats
    
    def sync_all(self) -> list[SyncStats]:
        """Sync all configured (or discovered) tables."""
        tables = self._get_tables_to_sync()
        
        if not tables:
            logger.warning("No tables to sync")
            return []
        
        logger.info(f"Starting sync for {len(tables)} table(s), direction: {self.direction}")
        
        all_stats = []
        for table_config in tables:
            stats = self.sync_table(table_config)
            all_stats.extend(stats)
        
        total_processed = sum(s.rows_processed for s in all_stats)
        total_errors = sum(len(s.errors) for s in all_stats)
        
        logger.info(f"Sync complete: {total_processed} rows processed, {total_errors} errors")
        return all_stats
