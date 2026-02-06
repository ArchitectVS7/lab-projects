"""Configuration loader with environment variable substitution."""

import os
import re
import yaml
from pathlib import Path
from dataclasses import dataclass
from typing import Optional


@dataclass
class PostgresConfig:
    host: str
    port: int
    database: str
    user: str
    password: str
    uri: Optional[str] = None
    min_pool_size: int = 2
    max_pool_size: int = 10
    pool_timeout: int = 30

    @property
    def connection_string(self) -> str:
        if self.uri:
            return self.uri
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


@dataclass
class MongoConfig:
    host: str
    port: int
    database: str
    user: Optional[str] = None
    password: Optional[str] = None
    auth_source: str = "admin"
    uri: Optional[str] = None
    server_selection_timeout_ms: int = 5000
    connect_timeout_ms: int = 10000

    @property
    def connection_string(self) -> str:
        if self.uri:
            return self.uri
        if self.user and self.password:
            return f"mongodb://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}?authSource={self.auth_source}"
        return f"mongodb://{self.host}:{self.port}/{self.database}"


@dataclass
class TableMapping:
    postgres_table: str
    mongo_collection: str
    primary_key: str


@dataclass
class SyncConfig:
    interval: int
    batch_size: int
    direction: str
    mappings: list[TableMapping]


@dataclass
class LogConfig:
    level: str
    file: str
    format: str


@dataclass
class Config:
    postgres: PostgresConfig
    mongo: MongoConfig
    sync: SyncConfig
    logging: LogConfig


def _substitute_env_vars(value: str) -> str:
    """Replace ${VAR} patterns with environment variable values."""
    pattern = r'\$\{([^}]+)\}'
    
    def replacer(match):
        var_name = match.group(1)
        env_value = os.environ.get(var_name)
        if env_value is None:
            raise ValueError(f"Environment variable '{var_name}' not set")
        return env_value
    
    return re.sub(pattern, replacer, value)


def _process_values(obj):
    """Recursively process all string values for env var substitution."""
    if isinstance(obj, dict):
        return {k: _process_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_process_values(item) for item in obj]
    elif isinstance(obj, str):
        return _substitute_env_vars(obj)
    return obj


def load_config(config_path: str | Path = "datasync/config.yaml") -> Config:
    """Load and parse configuration file."""
    config_path = Path(config_path)
    
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")
    
    with open(config_path) as f:
        raw_config = yaml.safe_load(f)
    
    # Substitute environment variables
    raw_config = _process_values(raw_config)
    
    pg = raw_config["postgresql"]
    mongo = raw_config["mongodb"]
    sync = raw_config["sync"]
    log = raw_config["logging"]
    
    return Config(
        postgres=PostgresConfig(
            host=pg["host"],
            port=pg["port"],
            database=pg["database"],
            user=pg["user"],
            password=pg["password"],
            uri=pg.get("uri"),
            min_pool_size=pg.get("pool", {}).get("min_size", 2),
            max_pool_size=pg.get("pool", {}).get("max_size", 10),
            pool_timeout=pg.get("pool", {}).get("timeout", 30),
        ),
        mongo=MongoConfig(
            host=mongo["host"],
            port=mongo["port"],
            database=mongo["database"],
            user=mongo.get("user"),
            password=mongo.get("password"),
            auth_source=mongo.get("auth_source", "admin"),
            uri=mongo.get("uri"),
            server_selection_timeout_ms=mongo.get("options", {}).get("server_selection_timeout_ms", 5000),
            connect_timeout_ms=mongo.get("options", {}).get("connect_timeout_ms", 10000),
        ),
        sync=SyncConfig(
            interval=sync["interval"],
            batch_size=sync["batch_size"],
            direction=sync["direction"],
            mappings=[
                TableMapping(
                    postgres_table=m["postgres_table"],
                    mongo_collection=m["mongo_collection"],
                    primary_key=m["primary_key"],
                )
                for m in sync["mappings"]
            ],
        ),
        logging=LogConfig(
            level=log["level"],
            file=log["file"],
            format=log["format"],
        ),
    )
