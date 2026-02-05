"""Database connection handlers for DataSync."""

import logging
from contextlib import contextmanager
from typing import Generator, Any
from urllib.parse import urlparse

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
from pymongo import MongoClient
from pymongo.database import Database as MongoDatabase

from .config import Config

logger = logging.getLogger(__name__)


class PostgresConnection:
    """PostgreSQL connection pool manager."""
    
    def __init__(self, config: Config):
        self.config = config
        self._pool: pool.ThreadedConnectionPool | None = None
    
    def connect(self) -> None:
        """Initialize the connection pool using URI or individual params."""
        pg_config = self.config.postgresql
        pool_config = pg_config.get('pool', {})
        
        # Get connection URI
        uri = self.config.get_postgres_uri()
        
        self._pool = pool.ThreadedConnectionPool(
            minconn=pool_config.get('min_connections', 2),
            maxconn=pool_config.get('max_connections', 10),
            dsn=uri
        )
        logger.info("PostgreSQL connection pool initialized")
    
    def close(self) -> None:
        """Close all connections in the pool."""
        if self._pool:
            self._pool.closeall()
            self._pool = None
            logger.info("PostgreSQL connections closed")
    
    @contextmanager
    def cursor(self) -> Generator[RealDictCursor, None, None]:
        """Get a cursor from the pool."""
        if self._pool is None:
            raise RuntimeError("PostgreSQL not connected")
        
        conn = self._pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                yield cur
                conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._pool.putconn(conn)
    
    def fetch_batch(
        self, 
        table: str, 
        primary_key: str, 
        batch_size: int, 
        offset: int = 0
    ) -> list[dict]:
        """Fetch a batch of rows from a table."""
        with self.cursor() as cur:
            # Use parameterized query for safety (table/column names sanitized separately)
            query = f'SELECT * FROM "{table}" ORDER BY "{primary_key}" LIMIT %s OFFSET %s'
            cur.execute(query, (batch_size, offset))
            return [dict(row) for row in cur.fetchall()]
    
    def get_row_count(self, table: str) -> int:
        """Get total row count for a table."""
        with self.cursor() as cur:
            cur.execute(f'SELECT COUNT(*) as count FROM "{table}"')
            return cur.fetchone()['count']
    
    def get_tables(self) -> list[str]:
        """Get list of all user tables in the database."""
        with self.cursor() as cur:
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            return [row['table_name'] for row in cur.fetchall()]
    
    def get_primary_key(self, table: str) -> str | None:
        """Get the primary key column for a table."""
        with self.cursor() as cur:
            cur.execute("""
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = %s::regclass
                AND i.indisprimary
            """, (table,))
            row = cur.fetchone()
            return row['attname'] if row else None


class MongoConnection:
    """MongoDB connection manager."""
    
    def __init__(self, config: Config):
        self.config = config
        self._client: MongoClient | None = None
        self._db: MongoDatabase | None = None
        self._db_name: str | None = None
    
    def connect(self) -> None:
        """Initialize the MongoDB connection using URI."""
        uri = self.config.get_mongo_uri()
        
        # Parse database name from URI
        parsed = urlparse(uri)
        self._db_name = parsed.path.lstrip('/').split('?')[0] or 'datasync'
        
        # Get timeout options from config
        mg_config = self.config.mongodb
        
        self._client = MongoClient(
            uri,
            serverSelectionTimeoutMS=mg_config.get('server_selection_timeout_ms', 5000),
            connectTimeoutMS=mg_config.get('connect_timeout_ms', 10000),
        )
        self._db = self._client[self._db_name]
        
        # Verify connection
        self._client.admin.command('ping')
        logger.info(f"MongoDB connection established (database: {self._db_name})")
    
    def close(self) -> None:
        """Close the MongoDB connection."""
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
            logger.info("MongoDB connection closed")
    
    @property
    def db(self) -> MongoDatabase:
        """Get the database instance."""
        if self._db is None:
            raise RuntimeError("MongoDB not connected")
        return self._db
    
    def upsert_batch(
        self, 
        collection: str, 
        documents: list[dict], 
        primary_key: str
    ) -> dict[str, int]:
        """Upsert a batch of documents into a collection."""
        from pymongo import UpdateOne
        
        if not documents:
            return {'matched': 0, 'modified': 0, 'upserted': 0}
        
        operations = [
            UpdateOne(
                {primary_key: doc[primary_key]},
                {'$set': doc},
                upsert=True
            )
            for doc in documents
        ]
        
        result = self.db[collection].bulk_write(operations, ordered=False)
        
        return {
            'matched': result.matched_count,
            'modified': result.modified_count,
            'upserted': result.upserted_count
        }
    
    def get_document(self, collection: str, primary_key: str, key_value: Any) -> dict | None:
        """Get a single document by primary key."""
        return self.db[collection].find_one({primary_key: key_value})
    
    def get_collections(self) -> list[str]:
        """Get list of all collections in the database."""
        return self.db.list_collection_names()
    
    def count_documents(self, collection: str) -> int:
        """Get document count for a collection."""
        return self.db[collection].count_documents({})
