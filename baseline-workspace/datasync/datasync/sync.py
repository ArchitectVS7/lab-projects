"""Core synchronization logic for DataSync."""

import logging
from datetime import datetime
from typing import Any, Generator

import psycopg2
from psycopg2.extras import RealDictCursor
from pymongo import MongoClient, UpdateOne
from pymongo.database import Database

from .config import load_config, get_postgres_dsn, get_mongo_uri

logger = logging.getLogger(__name__)


class DataSync:
    """Main synchronization class for PostgreSQL <-> MongoDB."""
    
    def __init__(self, config_path: str = "config.yaml"):
        """Initialize DataSync with configuration.
        
        Args:
            config_path: Path to the configuration file.
        """
        self.config = load_config(config_path)
        self.pg_conn = None
        self.mongo_client = None
        self.mongo_db = None
        
        self._setup_logging()
    
    def _setup_logging(self):
        """Configure logging based on config settings."""
        log_config = self.config.get('logging', {})
        level = getattr(logging, log_config.get('level', 'INFO'))
        log_file = log_config.get('file')
        
        handlers = [logging.StreamHandler()]
        if log_file:
            from pathlib import Path
            Path(log_file).parent.mkdir(parents=True, exist_ok=True)
            handlers.append(logging.FileHandler(log_file))
        
        logging.basicConfig(
            level=level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=handlers
        )
    
    def connect(self):
        """Establish connections to both databases."""
        logger.info("Connecting to PostgreSQL...")
        pg_config = self.config['postgresql']
        self.pg_conn = psycopg2.connect(
            get_postgres_dsn(self.config),
            cursor_factory=RealDictCursor
        )
        self.pg_conn.autocommit = False
        logger.info("PostgreSQL connected.")
        
        logger.info("Connecting to MongoDB...")
        mongo_config = self.config['mongodb']
        self.mongo_client = MongoClient(
            get_mongo_uri(self.config),
            authSource=mongo_config.get('auth_source', 'admin')
        )
        self.mongo_db = self.mongo_client[mongo_config['database']]
        # Verify connection
        self.mongo_client.admin.command('ping')
        logger.info("MongoDB connected.")
    
    def disconnect(self):
        """Close all database connections."""
        if self.pg_conn:
            self.pg_conn.close()
            logger.info("PostgreSQL disconnected.")
        
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("MongoDB disconnected.")
    
    def _fetch_postgres_batch(
        self, 
        table: str, 
        batch_size: int,
        offset: int = 0
    ) -> Generator[list[dict], None, None]:
        """Fetch records from PostgreSQL in batches.
        
        Args:
            table: Table name to fetch from.
            batch_size: Number of records per batch.
            offset: Starting offset.
            
        Yields:
            List of records as dictionaries.
        """
        with self.pg_conn.cursor() as cursor:
            while True:
                cursor.execute(
                    f"SELECT * FROM {table} ORDER BY id LIMIT %s OFFSET %s",
                    (batch_size, offset)
                )
                records = cursor.fetchall()
                
                if not records:
                    break
                
                yield [dict(record) for record in records]
                offset += batch_size
    
    def _sync_to_mongo(self, records: list[dict], collection_name: str) -> int:
        """Upsert records to MongoDB collection.
        
        Args:
            records: List of records to upsert.
            collection_name: Target MongoDB collection.
            
        Returns:
            Number of modified/inserted documents.
        """
        if not records:
            return 0
        
        collection = self.mongo_db[collection_name]
        
        # Prepare bulk upsert operations
        operations = []
        for record in records:
            # Convert PostgreSQL types for MongoDB compatibility
            doc = self._convert_pg_to_mongo(record)
            
            operations.append(
                UpdateOne(
                    {'_pg_id': doc['_pg_id']},  # Match on PostgreSQL ID
                    {'$set': doc},
                    upsert=True
                )
            )
        
        result = collection.bulk_write(operations, ordered=False)
        return result.modified_count + result.upserted_count
    
    def _convert_pg_to_mongo(self, record: dict) -> dict:
        """Convert PostgreSQL record to MongoDB document.
        
        Args:
            record: PostgreSQL record dictionary.
            
        Returns:
            MongoDB-compatible document.
        """
        doc = {}
        
        for key, value in record.items():
            # Store original PostgreSQL ID for reference
            if key == 'id':
                doc['_pg_id'] = value
            
            # Convert datetime objects
            if isinstance(value, datetime):
                doc[key] = value
            # Handle None values
            elif value is None:
                doc[key] = None
            else:
                doc[key] = value
        
        doc['_synced_at'] = datetime.utcnow()
        return doc
    
    def _fetch_mongo_batch(
        self,
        collection_name: str,
        batch_size: int,
        skip: int = 0
    ) -> Generator[list[dict], None, None]:
        """Fetch documents from MongoDB in batches.
        
        Args:
            collection_name: Collection to fetch from.
            batch_size: Number of documents per batch.
            skip: Starting offset.
            
        Yields:
            List of documents.
        """
        collection = self.mongo_db[collection_name]
        
        while True:
            documents = list(
                collection.find()
                .skip(skip)
                .limit(batch_size)
            )
            
            if not documents:
                break
            
            yield documents
            skip += batch_size
    
    def _sync_to_postgres(self, documents: list[dict], table: str) -> int:
        """Upsert documents to PostgreSQL table.
        
        Args:
            documents: List of MongoDB documents.
            table: Target PostgreSQL table.
            
        Returns:
            Number of affected rows.
        """
        if not documents:
            return 0
        
        affected = 0
        
        with self.pg_conn.cursor() as cursor:
            for doc in documents:
                # Convert MongoDB document to PostgreSQL record
                record = self._convert_mongo_to_pg(doc)
                
                if not record:
                    continue
                
                # Build upsert query
                columns = list(record.keys())
                values = list(record.values())
                placeholders = ', '.join(['%s'] * len(values))
                
                # Use PostgreSQL's ON CONFLICT for upsert
                update_clause = ', '.join([f"{col} = EXCLUDED.{col}" for col in columns if col != 'id'])
                
                query = f"""
                    INSERT INTO {table} ({', '.join(columns)})
                    VALUES ({placeholders})
                    ON CONFLICT (id) DO UPDATE SET {update_clause}
                """
                
                cursor.execute(query, values)
                affected += cursor.rowcount
        
        self.pg_conn.commit()
        return affected
    
    def _convert_mongo_to_pg(self, document: dict) -> dict | None:
        """Convert MongoDB document to PostgreSQL record.
        
        Args:
            document: MongoDB document.
            
        Returns:
            PostgreSQL-compatible record, or None if conversion fails.
        """
        record = {}
        
        for key, value in document.items():
            # Skip MongoDB internal fields
            if key.startswith('_'):
                # But use _pg_id as the PostgreSQL id
                if key == '_pg_id':
                    record['id'] = value
                continue
            
            record[key] = value
        
        return record if record else None
    
    def sync(self) -> dict:
        """Execute synchronization based on configuration.
        
        Returns:
            Dictionary with sync statistics.
        """
        direction = self.config['sync'].get('direction', 'postgres_to_mongo')
        mappings = self.config['sync'].get('mappings', [])
        batch_size = self.config['sync'].get('batch_size', 1000)
        
        stats = {
            'direction': direction,
            'started_at': datetime.utcnow().isoformat(),
            'tables': {},
            'total_synced': 0
        }
        
        logger.info(f"Starting sync: {direction}")
        
        for mapping in mappings:
            pg_table = mapping['postgres_table']
            mongo_collection = mapping['mongo_collection']
            table_stats = {'synced': 0, 'errors': 0}
            
            try:
                if direction in ('postgres_to_mongo', 'bidirectional'):
                    logger.info(f"Syncing {pg_table} -> {mongo_collection}")
                    
                    for batch in self._fetch_postgres_batch(pg_table, batch_size):
                        synced = self._sync_to_mongo(batch, mongo_collection)
                        table_stats['synced'] += synced
                        logger.debug(f"Synced batch of {synced} records")
                
                if direction in ('mongo_to_postgres', 'bidirectional'):
                    logger.info(f"Syncing {mongo_collection} -> {pg_table}")
                    
                    for batch in self._fetch_mongo_batch(mongo_collection, batch_size):
                        synced = self._sync_to_postgres(batch, pg_table)
                        table_stats['synced'] += synced
                        logger.debug(f"Synced batch of {synced} records")
                
                logger.info(f"Completed {pg_table}: {table_stats['synced']} records")
                
            except Exception as e:
                logger.error(f"Error syncing {pg_table}: {e}")
                table_stats['errors'] += 1
                raise
            
            stats['tables'][pg_table] = table_stats
            stats['total_synced'] += table_stats['synced']
        
        stats['completed_at'] = datetime.utcnow().isoformat()
        logger.info(f"Sync completed. Total: {stats['total_synced']} records")
        
        return stats
    
    def run_continuous(self):
        """Run sync continuously at configured interval."""
        import time
        
        interval = self.config['sync'].get('interval', 60)
        logger.info(f"Starting continuous sync (interval: {interval}s)")
        
        try:
            while True:
                try:
                    stats = self.sync()
                    logger.info(f"Sync cycle complete: {stats['total_synced']} records")
                except Exception as e:
                    logger.error(f"Sync cycle failed: {e}")
                
                time.sleep(interval)
        except KeyboardInterrupt:
            logger.info("Continuous sync stopped by user")
    
    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.disconnect()
        return False
