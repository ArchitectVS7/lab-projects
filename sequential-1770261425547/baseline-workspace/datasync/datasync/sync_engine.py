"""Core synchronization engine for PostgreSQL ↔ MongoDB."""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from dataclasses import dataclass, field

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
from pymongo import MongoClient
from bson import ObjectId

from .config import Config


@dataclass
class SyncRecord:
    """Represents a record to be synced."""
    table: str
    primary_key: Any
    data: Dict[str, Any]
    updated_at: Optional[datetime] = None
    source: str = "postgres"  # postgres | mongo


@dataclass
class SyncResult:
    """Result of a sync operation."""
    records_synced: int = 0
    records_skipped: int = 0
    conflicts_resolved: int = 0
    errors: List[str] = field(default_factory=list)
    
    @property
    def success(self) -> bool:
        return len(self.errors) == 0


class SyncEngine:
    """Bidirectional sync engine between PostgreSQL and MongoDB."""
    
    def __init__(self, config: Config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self._pg_pool: Optional[pool.ThreadedConnectionPool] = None
        self._mongo_client: Optional[MongoClient] = None
        self._mongo_db = None
    
    def connect(self) -> None:
        """Establish connections to both databases."""
        self._connect_postgres()
        self._connect_mongo()
        self.logger.info("Connected to both PostgreSQL and MongoDB")
    
    def _connect_postgres(self) -> None:
        """Initialize PostgreSQL connection pool."""
        pg_config = self.config.postgresql
        self._pg_pool = pool.ThreadedConnectionPool(
            minconn=pg_config.min_connections,
            maxconn=pg_config.max_connections,
            host=pg_config.host,
            port=pg_config.port,
            database=pg_config.database,
            user=pg_config.username,
            password=pg_config.password,
            connect_timeout=pg_config.timeout,
        )
        self.logger.debug(f"PostgreSQL pool created: {pg_config.host}:{pg_config.port}/{pg_config.database}")
    
    def _connect_mongo(self) -> None:
        """Initialize MongoDB connection."""
        mongo_config = self.config.mongodb
        self._mongo_client = MongoClient(mongo_config.connection_string)
        self._mongo_db = self._mongo_client[mongo_config.database]
        # Verify connection
        self._mongo_client.admin.command('ping')
        self.logger.debug(f"MongoDB connected: {mongo_config.host}:{mongo_config.port}/{mongo_config.database}")
    
    def disconnect(self) -> None:
        """Close all database connections."""
        if self._pg_pool:
            self._pg_pool.closeall()
            self._pg_pool = None
        if self._mongo_client:
            self._mongo_client.close()
            self._mongo_client = None
            self._mongo_db = None
        self.logger.info("Disconnected from all databases")
    
    def get_postgres_tables(self) -> List[str]:
        """Get list of tables from PostgreSQL."""
        conn = self._pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_type = 'BASE TABLE'
                """)
                return [row[0] for row in cur.fetchall()]
        finally:
            self._pg_pool.putconn(conn)
    
    def get_mongo_collections(self) -> List[str]:
        """Get list of collections from MongoDB."""
        return self._mongo_db.list_collection_names()
    
    def _get_tables_to_sync(self) -> List[str]:
        """Determine which tables/collections to sync."""
        if self.config.sync.tables:
            return self.config.sync.tables
        
        # Union of postgres tables and mongo collections
        pg_tables = set(self.get_postgres_tables())
        mongo_collections = set(self.get_mongo_collections())
        
        direction = self.config.sync.direction
        if direction == "postgres_to_mongo":
            return list(pg_tables)
        elif direction == "mongo_to_postgres":
            return list(mongo_collections)
        else:  # bidirectional
            return list(pg_tables | mongo_collections)
    
    def _get_primary_key(self, table: str) -> str:
        """Get primary key column for a PostgreSQL table."""
        conn = self._pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT a.attname
                    FROM pg_index i
                    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                    WHERE i.indrelid = %s::regclass AND i.indisprimary
                """, (table,))
                row = cur.fetchone()
                return row[0] if row else 'id'
        except Exception:
            return 'id'
        finally:
            self._pg_pool.putconn(conn)
    
    def _fetch_postgres_batch(self, table: str, offset: int, pk_col: str) -> List[Dict]:
        """Fetch a batch of records from PostgreSQL."""
        conn = self._pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"SELECT * FROM {table} ORDER BY {pk_col} LIMIT %s OFFSET %s",
                    (self.config.sync.batch_size, offset)
                )
                return [dict(row) for row in cur.fetchall()]
        finally:
            self._pg_pool.putconn(conn)
    
    def _fetch_mongo_batch(self, collection: str, skip: int) -> List[Dict]:
        """Fetch a batch of documents from MongoDB."""
        coll = self._mongo_db[collection]
        docs = list(coll.find().skip(skip).limit(self.config.sync.batch_size))
        # Convert ObjectId to string for compatibility
        for doc in docs:
            if '_id' in doc and isinstance(doc['_id'], ObjectId):
                doc['_id'] = str(doc['_id'])
        return docs
    
    def _convert_for_mongo(self, record: Dict, pk_col: str) -> Dict:
        """Convert a PostgreSQL record for MongoDB storage."""
        doc = dict(record)
        # Use primary key as _id if not 'id'
        if pk_col != '_id' and pk_col in doc:
            doc['_id'] = doc.pop(pk_col)
        # Convert datetime objects
        for key, value in doc.items():
            if isinstance(value, datetime):
                doc[key] = value
        doc['_sync_source'] = 'postgres'
        doc['_sync_at'] = datetime.utcnow()
        return doc
    
    def _convert_for_postgres(self, doc: Dict, pk_col: str) -> Dict:
        """Convert a MongoDB document for PostgreSQL storage."""
        record = dict(doc)
        # Convert _id back to primary key
        if '_id' in record:
            record[pk_col] = record.pop('_id')
        # Remove sync metadata
        record.pop('_sync_source', None)
        record.pop('_sync_at', None)
        return record
    
    def _upsert_to_mongo(self, collection: str, doc: Dict) -> bool:
        """Upsert a document to MongoDB."""
        try:
            coll = self._mongo_db[collection]
            doc_id = doc.get('_id')
            if doc_id:
                coll.replace_one({'_id': doc_id}, doc, upsert=True)
            else:
                coll.insert_one(doc)
            return True
        except Exception as e:
            self.logger.error(f"MongoDB upsert failed: {e}")
            return False
    
    def _upsert_to_postgres(self, table: str, record: Dict, pk_col: str) -> bool:
        """Upsert a record to PostgreSQL."""
        conn = self._pg_pool.getconn()
        try:
            with conn.cursor() as cur:
                columns = list(record.keys())
                values = list(record.values())
                placeholders = ', '.join(['%s'] * len(values))
                col_list = ', '.join(columns)
                update_set = ', '.join([f"{col} = EXCLUDED.{col}" for col in columns if col != pk_col])
                
                sql = f"""
                    INSERT INTO {table} ({col_list})
                    VALUES ({placeholders})
                    ON CONFLICT ({pk_col}) DO UPDATE SET {update_set}
                """
                cur.execute(sql, values)
                conn.commit()
                return True
        except Exception as e:
            conn.rollback()
            self.logger.error(f"PostgreSQL upsert failed: {e}")
            return False
        finally:
            self._pg_pool.putconn(conn)
    
    def _resolve_conflict(self, pg_record: Dict, mongo_doc: Dict) -> str:
        """Resolve sync conflict based on configured strategy."""
        strategy = self.config.sync.conflict_resolution
        
        if strategy == "postgres_priority":
            return "postgres"
        elif strategy == "mongo_priority":
            return "mongo"
        else:  # latest_wins
            pg_time = pg_record.get('updated_at') or pg_record.get('created_at')
            mongo_time = mongo_doc.get('_sync_at') or mongo_doc.get('updated_at')
            
            if pg_time and mongo_time:
                return "postgres" if pg_time > mongo_time else "mongo"
            elif pg_time:
                return "postgres"
            elif mongo_time:
                return "mongo"
            return "postgres"  # Default to postgres if no timestamps
    
    def sync_table(self, table: str) -> SyncResult:
        """Sync a single table/collection."""
        result = SyncResult()
        pk_col = self._get_primary_key(table)
        direction = self.config.sync.direction
        
        self.logger.info(f"Syncing table: {table} (direction: {direction})")
        
        try:
            if direction in ("postgres_to_mongo", "bidirectional"):
                self._sync_postgres_to_mongo(table, pk_col, result)
            
            if direction in ("mongo_to_postgres", "bidirectional"):
                self._sync_mongo_to_postgres(table, pk_col, result)
                
        except Exception as e:
            result.errors.append(f"Error syncing {table}: {str(e)}")
            self.logger.exception(f"Error syncing table {table}")
        
        return result
    
    def _sync_postgres_to_mongo(self, table: str, pk_col: str, result: SyncResult) -> None:
        """Sync records from PostgreSQL to MongoDB."""
        offset = 0
        while True:
            records = self._fetch_postgres_batch(table, offset, pk_col)
            if not records:
                break
            
            for record in records:
                doc = self._convert_for_mongo(record, pk_col)
                if self._upsert_to_mongo(table, doc):
                    result.records_synced += 1
                else:
                    result.errors.append(f"Failed to sync record {record.get(pk_col)} to MongoDB")
            
            offset += len(records)
            self.logger.debug(f"Synced {offset} records from PostgreSQL to MongoDB for {table}")
    
    def _sync_mongo_to_postgres(self, table: str, pk_col: str, result: SyncResult) -> None:
        """Sync documents from MongoDB to PostgreSQL."""
        skip = 0
        while True:
            docs = self._fetch_mongo_batch(table, skip)
            if not docs:
                break
            
            for doc in docs:
                # Skip documents that originated from postgres (avoid loops)
                if doc.get('_sync_source') == 'postgres':
                    result.records_skipped += 1
                    continue
                
                record = self._convert_for_postgres(doc, pk_col)
                if self._upsert_to_postgres(table, record, pk_col):
                    result.records_synced += 1
                else:
                    result.errors.append(f"Failed to sync document {doc.get('_id')} to PostgreSQL")
            
            skip += len(docs)
            self.logger.debug(f"Synced {skip} documents from MongoDB to PostgreSQL for {table}")
    
    def sync_all(self) -> Dict[str, SyncResult]:
        """Sync all configured tables/collections."""
        tables = self._get_tables_to_sync()
        results = {}
        
        self.logger.info(f"Starting sync for {len(tables)} tables: {tables}")
        
        for table in tables:
            results[table] = self.sync_table(table)
        
        # Log summary
        total_synced = sum(r.records_synced for r in results.values())
        total_errors = sum(len(r.errors) for r in results.values())
        self.logger.info(f"Sync complete: {total_synced} records synced, {total_errors} errors")
        
        return results
    
    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
        return False
