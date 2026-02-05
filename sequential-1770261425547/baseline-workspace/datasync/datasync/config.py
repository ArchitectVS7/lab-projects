"""Configuration loader with environment variable substitution."""

import os
import re
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

import yaml
from dotenv import load_dotenv


@dataclass
class PostgresConfig:
    host: str
    port: int
    database: str
    username: str
    password: str
    uri: Optional[str] = None
    min_connections: int = 2
    max_connections: int = 10
    timeout: int = 30

    @property
    def connection_string(self) -> str:
        if self.uri:
            return self.uri
        return f"postgresql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"


@dataclass
class MongoConfig:
    host: str
    port: int
    database: str
    username: str
    password: str
    uri: Optional[str] = None
    auth_source: str = "admin"
    replica_set: Optional[str] = None

    @property
    def connection_string(self) -> str:
        if self.uri:
            return self.uri
        base = f"mongodb://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
        params = [f"authSource={self.auth_source}"]
        if self.replica_set:
            params.append(f"replicaSet={self.replica_set}")
        return f"{base}?{'&'.join(params)}"


@dataclass
class SyncConfig:
    batch_size: int = 1000
    interval_seconds: int = 60
    direction: str = "bidirectional"
    conflict_resolution: str = "latest_wins"
    tables: list = None

    def __post_init__(self):
        if self.tables is None:
            self.tables = []


@dataclass
class LoggingConfig:
    level: str = "INFO"
    file: str = "logs/datasync.log"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


@dataclass
class Config:
    postgresql: PostgresConfig
    mongodb: MongoConfig
    sync: SyncConfig
    logging: LoggingConfig


def _substitute_env_vars(value: str) -> str:
    """Replace ${VAR} patterns with environment variable values."""
    pattern = r'\$\{([^}]+)\}'
    
    def replacer(match):
        var_name = match.group(1)
        return os.environ.get(var_name, match.group(0))
    
    return re.sub(pattern, replacer, value)


def _process_dict(d: dict) -> dict:
    """Recursively substitute environment variables in dict values."""
    result = {}
    for key, value in d.items():
        if isinstance(value, str):
            result[key] = _substitute_env_vars(value)
        elif isinstance(value, dict):
            result[key] = _process_dict(value)
        elif isinstance(value, list):
            result[key] = [_substitute_env_vars(v) if isinstance(v, str) else v for v in value]
        else:
            result[key] = value
    return result


def load_config(config_path: str = "config.yaml", env_path: str = ".env") -> Config:
    """Load configuration from YAML file with environment variable substitution."""
    # Load .env file if it exists
    env_file = Path(env_path)
    if env_file.exists():
        load_dotenv(env_file)
    
    # Load and parse YAML
    with open(config_path, 'r') as f:
        raw_config = yaml.safe_load(f)
    
    # Substitute environment variables
    config_data = _process_dict(raw_config)
    
    # Build config objects
    pg_data = config_data.get('postgresql', {})
    pool_data = pg_data.pop('pool', {})
    postgres_config = PostgresConfig(
        host=pg_data.get('host', 'localhost'),
        port=pg_data.get('port', 5432),
        database=pg_data.get('database', 'datasync_db'),
        username=pg_data.get('username', 'postgres'),
        password=pg_data.get('password', ''),
        uri=pg_data.get('uri'),
        min_connections=pool_data.get('min_connections', 2),
        max_connections=pool_data.get('max_connections', 10),
        timeout=pool_data.get('timeout', 30),
    )
    
    mongo_data = config_data.get('mongodb', {})
    mongo_config = MongoConfig(
        host=mongo_data.get('host', 'localhost'),
        port=mongo_data.get('port', 27017),
        database=mongo_data.get('database', 'datasync_db'),
        username=mongo_data.get('username', 'mongo'),
        password=mongo_data.get('password', ''),
        uri=mongo_data.get('uri'),
        auth_source=mongo_data.get('auth_source', 'admin'),
        replica_set=mongo_data.get('replica_set'),
    )
    
    sync_data = config_data.get('sync', {})
    sync_config = SyncConfig(
        batch_size=sync_data.get('batch_size', 1000),
        interval_seconds=sync_data.get('interval_seconds', 60),
        direction=sync_data.get('direction', 'bidirectional'),
        conflict_resolution=sync_data.get('conflict_resolution', 'latest_wins'),
        tables=sync_data.get('tables', []),
    )
    
    log_data = config_data.get('logging', {})
    logging_config = LoggingConfig(
        level=log_data.get('level', 'INFO'),
        file=log_data.get('file', 'logs/datasync.log'),
        format=log_data.get('format', '%(asctime)s - %(name)s - %(levelname)s - %(message)s'),
    )
    
    return Config(
        postgresql=postgres_config,
        mongodb=mongo_config,
        sync=sync_config,
        logging=logging_config,
    )
