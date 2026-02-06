"""
DataSync - PostgreSQL to MongoDB synchronization engine
"""

import os
import re
import time
import logging
from datetime import datetime
from typing import Any

import yaml
import psycopg2
from psycopg2.extras import RealDictCursor
from pymongo import MongoClient
from pymongo.errors import PyMongoError


class ConfigLoader:
    """Loads config with environment variable substitution."""
    
    ENV_PATTERN = re.compile(r'\$\{(\w+)\}')
    
    @classmethod
    def load(cls, path: str = "config.yaml") -> dict:
        with open(path, 'r') as f:
            content = f.read()
        
        # Substitute ${VAR} with environment variables
        def replace_env(match):
            var_name = match.group(1)
            return os.environ.get(var_name, match.group(0))
        
        content = cls.ENV_PATTERN.sub(replace_env, content)
        return yaml.safe_load(content)


class DataSync:
    """Main synchronization engine between PostgreSQL and MongoDB."""
    
    def __init__(self, config_path: str = "config.yaml"):
        self.config = ConfigLoader.load(config_path)
        self._setup_logging()
        self.pg_conn = None
        self.mongo_client = None
        self.mongo_db = None
        
    def _setup_logging(self):
        """Configure logging from config."""
        log_config = self.config.get('logging', {})
        
        # Ensure log directory exists
        log_file = log_config.get('file', 'logs/datasync.log')
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        
        logging.basicConfig(
            level=getattr(logging, log_config.get('level', 'INFO')),
            format=log_config.get('format', '%(asctime)s - %(levelname)s - %(message)s'),
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger('DataSync')
    
    def connect_postgresql(self):
        """Establish PostgreSQL connection."""
        pg_config = self.config['postgresql']
        
        if 'uri' in pg_config and pg_config['uri']:
            self.pg_conn = psycopg2.connect(pg_config['uri'])
        else:
            self.pg_conn = psycopg2.connect(
                host=pg_config['host'],
                port=pg_config['port'],
                database=pg_config['database'],
                user=pg_config['username'],
                password=pg_config['password']
            )
        
        self.logger.info("Connected to PostgreSQL")
    
    def connect_mongodb(self):
        """Establish MongoDB connection."""
        mongo_config = self.config['mongodb']
        
        if 'uri' in mongo_config and mongo_config['uri']:
            self.mongo_client = MongoClient(mongo_config['uri'])
        else:
            self.mongo_client = MongoClient(
                host=mongo_config['host'],
                port=mongo_config['port'],
                username=mongo_config['username'],
                password=mongo_config['password'],
                authSource=mongo_config.get('auth_source', 'admin')
            )
        
        self.mongo_db = self.mongo_client[mongo_config['database']]
        self.logger.info("Connected to MongoDB")
    
    def connect(self):
        """Connect to both databases."""
        self.connect_postgresql()
        self.connect_mongodb()
    
    def disconnect(self):
        """Close all database connections."""
        if self.pg_conn:
            self.pg_conn.close()
            self.logger.info("Disconnected from PostgreSQL")
        if self.mongo_client:
            self.mongo_client.close()
            self.logger.info("Disconnected from MongoDB")
    
    def get_pg_tables(self) -> list[str]:
        """Get list of tables from PostgreSQL."""
        with self.pg_conn.cursor() as cur:
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
            """)
            return [row[0] for row in cur.fetchall()]
    
    def fetch_pg_batch(self, table: str, offset: int, limit: int) -> list[dict]:
        """Fetch a batch of rows from PostgreSQL."""
        with self.pg_conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f'SELECT * FROM "{table}" ORDER BY id OFFSET %s LIMIT %s',
                (offset, limit)
            )
            return [dict(row) for row in cur.fetchall()]
    
    def get_pg_count(self, table: str) -> int:
        """Get total row count for a table."""
        with self.pg_conn.cursor() as cur:
            cur.execute(f'SELECT COUNT(*) FROM "{table}"')
            return cur.fetchone()[0]
    
    def resolve_conflict(self, source_doc: dict, target_doc: dict) -> dict:
        """Resolve sync conflicts based on configured strategy."""
        strategy = self.config['sync'].get('conflict_resolution', 'source_wins')
        
        if strategy == 'source_wins':
            return source_doc
        elif strategy == 'target_wins':
            return target_doc
        elif strategy == 'latest':
            # Compare updated_at timestamps if available
            source_time = source_doc.get('updated_at', datetime.min)
            target_time = target_doc.get('updated_at', datetime.min)
            return source_doc if source_time >= target_time else target_doc
        else:
            return source_doc
    
    def sync_table(self, table: str) -> dict[str, int]:
        """Sync a single table from PostgreSQL to MongoDB."""
        sync_config = self.config['sync']
        batch_size = sync_config.get('batch_size', 1000)
        
        collection = self.mongo_db[table]
        total_count = self.get_pg_count(table)
        
        stats = {'inserted': 0, 'updated': 0, 'skipped': 0, 'errors': 0}
        offset = 0
        
        self.logger.info(f"Syncing table '{table}' ({total_count} rows)")
        
        while offset < total_count:
            batch = self.fetch_pg_batch(table, offset, batch_size)
            
            for row in batch:
                try:
                    row_id = row.get('id')
                    if row_id is None:
                        self.logger.warning(f"Row without 'id' in {table}, skipping")
                        stats['skipped'] += 1
                        continue
                    
                    # Check if document exists in MongoDB
                    existing = collection.find_one({'id': row_id})
                    
                    if existing:
                        # Resolve conflict and update
                        resolved = self.resolve_conflict(row, existing)
                        if resolved != existing:
                            row['_synced_at'] = datetime.utcnow()
                            collection.replace_one({'id': row_id}, row)
                            stats['updated'] += 1
                        else:
                            stats['skipped'] += 1
                    else:
                        # Insert new document
                        row['_synced_at'] = datetime.utcnow()
                        collection.insert_one(row)
                        stats['inserted'] += 1
                        
                except PyMongoError as e:
                    self.logger.error(f"Error syncing row {row.get('id')} from {table}: {e}")
                    stats['errors'] += 1
            
            offset += batch_size
            self.logger.debug(f"Processed {min(offset, total_count)}/{total_count} rows")
        
        return stats
    
    def sync_with_retry(self, table: str) -> dict[str, int]:
        """Sync a table with retry logic."""
        sync_config = self.config['sync']
        max_attempts = sync_config.get('retry_attempts', 3)
        retry_delay = sync_config.get('retry_delay_seconds', 5)
        
        for attempt in range(1, max_attempts + 1):
            try:
                return self.sync_table(table)
            except Exception as e:
                self.logger.error(f"Sync attempt {attempt}/{max_attempts} failed for '{table}': {e}")
                if attempt < max_attempts:
                    self.logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    raise
    
    def sync_all(self, tables: list[str] | None = None) -> dict[str, dict[str, int]]:
        """Sync all tables (or specified tables) from PostgreSQL to MongoDB."""
        if tables is None:
            tables = self.get_pg_tables()
        
        self.logger.info(f"Starting sync for {len(tables)} tables")
        results = {}
        
        for table in tables:
            try:
                results[table] = self.sync_with_retry(table)
                self.logger.info(
                    f"Completed '{table}': "
                    f"{results[table]['inserted']} inserted, "
                    f"{results[table]['updated']} updated, "
                    f"{results[table]['skipped']} skipped, "
                    f"{results[table]['errors']} errors"
                )
            except Exception as e:
                self.logger.error(f"Failed to sync '{table}': {e}")
                results[table] = {'error': str(e)}
        
        return results
    
    def run_continuous(self, tables: list[str] | None = None):
        """Run sync continuously at configured interval."""
        interval = self.config['sync'].get('interval_seconds', 300)
        self.logger.info(f"Starting continuous sync (interval: {interval}s)")
        
        try:
            while True:
                self.sync_all(tables)
                self.logger.info(f"Sleeping for {interval} seconds...")
                time.sleep(interval)
        except KeyboardInterrupt:
            self.logger.info("Sync interrupted by user")
    
    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()


def main():
    """CLI entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='DataSync - PostgreSQL to MongoDB sync')
    parser.add_argument('-c', '--config', default='config.yaml', help='Config file path')
    parser.add_argument('-t', '--tables', nargs='*', help='Specific tables to sync')
    parser.add_argument('--continuous', action='store_true', help='Run continuously')
    parser.add_argument('--once', action='store_true', help='Run once and exit')
    
    args = parser.parse_args()
    
    with DataSync(args.config) as sync:
        if args.continuous:
            sync.run_continuous(args.tables)
        else:
            results = sync.sync_all(args.tables)
            print("\n=== Sync Results ===")
            for table, stats in results.items():
                print(f"{table}: {stats}")


if __name__ == '__main__':
    main()
