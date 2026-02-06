"""Main synchronization engine for DataSync."""

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable
from bson import ObjectId

from .config_loader import Config
from .db import PostgresConnection, MongoConnection

logger = logging.getLogger(__name__)


@dataclass
class SyncStats:
    """Statistics for a sync operation."""
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    pg_to_mongo: int = 0
    mongo_to_pg: int = 0
    conflicts: int = 0
    errors: int = 0
    
    @property
    def total(self) -> int:
        return self.pg_to_mongo + self.mongo_to_pg
    
    @property
    def duration_seconds(self) -> float:
        return (datetime.now(timezone.utc) - self.started_at).total_seconds()


@dataclass 
class TableMapping:
    """Mapping between PostgreSQL table and MongoDB collection."""
    postgres_table: str
    mongo_collection: str
    primary_key: str
    transform_to_mongo: Callable[[dict], dict] | None = None
    transform_to_pg: Callable[[dict], dict] | None = None


class SyncEngine:
    """
    Bidirectional sync engine between PostgreSQL and MongoDB.
    
    Supports three modes:
    - pg_to_mongo: One-way sync from PostgreSQL to MongoDB
    - mongo_to_pg: One-way sync from MongoDB to PostgreSQL  
    - bidirectional: Two-way sync with conflict resolution
    """
    
    SYNC_METADATA_FIELD = "_sync_updated_at"
    
    def __init__(self, config: Config):
        self.config = config
        self.pg = PostgresConnection(config)
        self.mongo = MongoConnection(config)
        self.mappings: list[TableMapping] = []
        self._running = False
        
        # Parse mappings from config
        for m in config.mappings:
            self.mappings.append(TableMapping(
                postgres_table=m['postgres_table'],
                mongo_collection=m['mongo_collection'],
                primary_key=m.get('primary_key', 'id'),
            ))
    
    def connect(self) -> None:
        """Establish database connections."""
        self.pg.connect()
        self.mongo.connect()
        logger.info("SyncEngine connected to all databases")
    
    def close(self) -> None:
        """Close database connections."""
        self._running = False
        self.pg.close()
        self.mongo.close()
        logger.info("SyncEngine connections closed")
    
    def _normalize_doc(self, doc: dict) -> dict:
        """Normalize document for comparison (handle ObjectId, etc)."""
        result = {}
        for k, v in doc.items():
            if k == '_id' and isinstance(v, ObjectId):
                continue  # Skip MongoDB _id
            if isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, datetime):
                result[k] = v.isoformat()
            else:
                result[k] = v
        return result
    
    def _resolve_conflict(
        self, 
        pg_row: dict, 
        mongo_doc: dict, 
        key: str
    ) -> tuple[str, dict]:
        """
        Resolve conflict between PostgreSQL and MongoDB records.
        
        Returns:
            Tuple of (winner: 'pg' | 'mongo', resolved_data: dict)
        """
        strategy = self.config.conflict_resolution
        
        pg_updated = pg_row.get(self.SYNC_METADATA_FIELD) or pg_row.get('updated_at')
        mongo_updated = mongo_doc.get(self.SYNC_METADATA_FIELD) or mongo_doc.get('updated_at')
        
        if strategy == 'source_wins':
            # In bidirectional, treat PG as source
            return 'pg', pg_row
        
        elif strategy == 'target_wins':
            # In bidirectional, treat Mongo as target
            return 'mongo', mongo_doc
        
        elif strategy == 'latest_wins':
            # Compare timestamps
            if pg_updated and mongo_updated:
                pg_time = pg_updated if isinstance(pg_updated, datetime) else datetime.fromisoformat(str(pg_updated))
                mongo_time = mongo_updated if isinstance(mongo_updated, datetime) else datetime.fromisoformat(str(mongo_updated))
                
                if pg_time >= mongo_time:
                    return 'pg', pg_row
                else:
                    return 'mongo', mongo_doc
            elif pg_updated:
                return 'pg', pg_row
            elif mongo_updated:
                return 'mongo', mongo_doc
            else:
                # No timestamps, default to PG
                return 'pg', pg_row
        
        else:  # manual or unknown
            logger.warning(f"Conflict on {key} requires manual resolution")
            return 'skip', {}
    
    def sync_pg_to_mongo(self, mapping: TableMapping, stats: SyncStats) -> None:
        """Sync records from PostgreSQL to MongoDB."""
        table = mapping.postgres_table
        collection = mapping.mongo_collection
        pk = mapping.primary_key
        
        logger.info(f"Syncing {table} -> {collection}")
        
        # Fetch all PG records in batches
        offset = 0
        while True:
            query = f'SELECT * FROM "{table}" ORDER BY "{pk}" LIMIT %s OFFSET %s'
            rows = self.pg.fetch_all(query, (self.config.batch_size, offset))
            
            if not rows:
                break
            
            # Process batch
            for row in rows:
                try:
                    doc = self._normalize_doc(row)
                    doc[self.SYNC_METADATA_FIELD] = datetime.now(timezone.utc)
                    
                    if mapping.transform_to_mongo:
                        doc = mapping.transform_to_mongo(doc)
                    
                    self.mongo.upsert(collection, doc, pk)
                    stats.pg_to_mongo += 1
                    
                except Exception as e:
                    logger.error(f"Error syncing row {row.get(pk)}: {e}")
                    stats.errors += 1
            
            offset += len(rows)
            logger.debug(f"Processed {offset} rows from {table}")
    
    def sync_mongo_to_pg(self, mapping: TableMapping, stats: SyncStats) -> None:
        """Sync records from MongoDB to PostgreSQL."""
        table = mapping.postgres_table
        collection = mapping.mongo_collection
        pk = mapping.primary_key
        
        logger.info(f"Syncing {collection} -> {table}")
        
        # Get table columns from PG
        col_query = """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s
        """
        columns_result = self.pg.fetch_all(col_query, (table,))
        pg_columns = {row['column_name'] for row in columns_result}
        
        # Fetch all Mongo documents
        skip = 0
        while True:
            docs = self.mongo.db[collection].find().skip(skip).limit(self.config.batch_size)
            docs = list(docs)
            
            if not docs:
                break
            
            for doc in docs:
                try:
                    normalized = self._normalize_doc(doc)
                    
                    if mapping.transform_to_pg:
                        normalized = mapping.transform_to_pg(normalized)
                    
                    # Filter to only PG columns
                    filtered = {k: v for k, v in normalized.items() if k in pg_columns}
                    filtered[self.SYNC_METADATA_FIELD] = datetime.now(timezone.utc)
                    
                    if not filtered.get(pk):
                        continue
                    
                    # Upsert to PG
                    columns = list(filtered.keys())
                    values = [filtered[c] for c in columns]
                    
                    placeholders = ', '.join(['%s'] * len(columns))
                    col_list = ', '.join(f'"{c}"' for c in columns)
                    update_set = ', '.join(f'"{c}" = EXCLUDED."{c}"' for c in columns if c != pk)
                    
                    query = f"""
                        INSERT INTO "{table}" ({col_list})
                        VALUES ({placeholders})
                        ON CONFLICT ("{pk}") DO UPDATE SET {update_set}
                    """
                    
                    self.pg.execute(query, tuple(values))
                    stats.mongo_to_pg += 1
                    
                except Exception as e:
                    logger.error(f"Error syncing doc {doc.get(pk)}: {e}")
                    stats.errors += 1
            
            skip += len(docs)
            logger.debug(f"Processed {skip} documents from {collection}")
    
    def sync_bidirectional(self, mapping: TableMapping, stats: SyncStats) -> None:
        """Perform bidirectional sync with conflict resolution."""
        table = mapping.postgres_table
        collection = mapping.mongo_collection
        pk = mapping.primary_key
        
        logger.info(f"Bidirectional sync: {table} <-> {collection}")
        
        # Build indexes of existing records
        pg_rows = {row[pk]: row for row in self.pg.fetch_all(f'SELECT * FROM "{table}"')}
        mongo_docs = {doc[pk]: doc for doc in self.mongo.find(collection) if pk in doc}
        
        all_keys = set(pg_rows.keys()) | set(mongo_docs.keys())
        
        for key in all_keys:
            try:
                pg_row = pg_rows.get(key)
                mongo_doc = mongo_docs.get(key)
                
                now = datetime.now(timezone.utc)
                
                if pg_row and not mongo_doc:
                    # Only in PG -> sync to Mongo
                    doc = self._normalize_doc(pg_row)
                    doc[self.SYNC_METADATA_FIELD] = now
                    self.mongo.upsert(collection, doc, pk)
                    stats.pg_to_mongo += 1
                    
                elif mongo_doc and not pg_row:
                    # Only in Mongo -> sync to PG
                    self._upsert_to_pg(mapping, mongo_doc, now)
                    stats.mongo_to_pg += 1
                    
                else:
                    # Exists in both -> check for conflict
                    pg_normalized = self._normalize_doc(pg_row)
                    mongo_normalized = self._normalize_doc(mongo_doc)
                    
                    # Remove sync metadata for comparison
                    pg_compare = {k: v for k, v in pg_normalized.items() if k != self.SYNC_METADATA_FIELD}
                    mongo_compare = {k: v for k, v in mongo_normalized.items() if k != self.SYNC_METADATA_FIELD}
                    
                    if pg_compare != mongo_compare:
                        stats.conflicts += 1
                        winner, resolved = self._resolve_conflict(pg_row, mongo_doc, key)
                        
                        if winner == 'pg':
                            doc = self._normalize_doc(resolved)
                            doc[self.SYNC_METADATA_FIELD] = now
                            self.mongo.upsert(collection, doc, pk)
                            stats.pg_to_mongo += 1
                        elif winner == 'mongo':
                            self._upsert_to_pg(mapping, resolved, now)
                            stats.mongo_to_pg += 1
                        # else: skip
                        
            except Exception as e:
                logger.error(f"Error syncing key {key}: {e}")
                stats.errors += 1
    
    def _upsert_to_pg(self, mapping: TableMapping, doc: dict, timestamp: datetime) -> None:
        """Helper to upsert a document to PostgreSQL."""
        table = mapping.postgres_table
        pk = mapping.primary_key
        
        # Get columns
        col_query = """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s
        """
        columns_result = self.pg.fetch_all(col_query, (table,))
        pg_columns = {row['column_name'] for row in columns_result}
        
        normalized = self._normalize_doc(doc)
        filtered = {k: v for k, v in normalized.items() if k in pg_columns}
        filtered[self.SYNC_METADATA_FIELD] = timestamp
        
        columns = list(filtered.keys())
        values = [filtered[c] for c in columns]
        
        placeholders = ', '.join(['%s'] * len(columns))
        col_list = ', '.join(f'"{c}"' for c in columns)
        update_set = ', '.join(f'"{c}" = EXCLUDED."{c}"' for c in columns if c != pk)
        
        query = f"""
            INSERT INTO "{table}" ({col_list})
            VALUES ({placeholders})
            ON CONFLICT ("{pk}") DO UPDATE SET {update_set}
        """
        
        self.pg.execute(query, tuple(values))
    
    def sync_once(self) -> SyncStats:
        """Perform a single sync cycle for all mappings."""
        stats = SyncStats()
        direction = self.config.sync_direction
        
        logger.info(f"Starting sync cycle (direction: {direction})")
        
        for mapping in self.mappings:
            try:
                if direction == 'pg_to_mongo':
                    self.sync_pg_to_mongo(mapping, stats)
                elif direction == 'mongo_to_pg':
                    self.sync_mongo_to_pg(mapping, stats)
                elif direction == 'bidirectional':
                    self.sync_bidirectional(mapping, stats)
                else:
                    logger.error(f"Unknown sync direction: {direction}")
                    
            except Exception as e:
                logger.error(f"Error syncing {mapping.postgres_table}: {e}")
                stats.errors += 1
        
        logger.info(
            f"Sync complete in {stats.duration_seconds:.2f}s: "
            f"PG->Mongo={stats.pg_to_mongo}, Mongo->PG={stats.mongo_to_pg}, "
            f"conflicts={stats.conflicts}, errors={stats.errors}"
        )
        
        return stats
    
    def run(self) -> None:
        """Run continuous sync loop."""
        self._running = True
        logger.info(f"Starting continuous sync (interval: {self.config.poll_interval}s)")
        
        while self._running:
            try:
                self.sync_once()
            except Exception as e:
                logger.error(f"Sync cycle failed: {e}")
            
            # Wait for next cycle
            for _ in range(self.config.poll_interval):
                if not self._running:
                    break
                time.sleep(1)
        
        logger.info("Sync loop stopped")
    
    def stop(self) -> None:
        """Stop the continuous sync loop."""
        self._running = False
