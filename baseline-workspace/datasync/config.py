"""Configuration loader for DataSync."""

import os
import re
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv


def _expand_env_vars(value: Any) -> Any:
    """Recursively expand ${VAR} patterns in config values."""
    if isinstance(value, str):
        pattern = re.compile(r'\$\{([^}]+)\}')
        matches = pattern.findall(value)
        for var in matches:
            env_value = os.getenv(var, '')
            value = value.replace(f'${{{var}}}', env_value)
        return value
    elif isinstance(value, dict):
        return {k: _expand_env_vars(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [_expand_env_vars(item) for item in value]
    return value


def load_config(config_path: str | Path | None = None) -> dict:
    """Load and parse the configuration file.
    
    Args:
        config_path: Path to config file. Defaults to DATASYNC_CONFIG env var
                     or 'config.yaml' in the package directory.
    
    Returns:
        Parsed configuration dictionary with environment variables expanded.
    """
    # Load .env file if present
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
    
    # Determine config path
    if config_path is None:
        config_path = os.getenv('DATASYNC_CONFIG')
    if config_path is None:
        config_path = Path(__file__).parent / 'config.yaml'
    
    config_path = Path(config_path)
    
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Expand environment variables
    config = _expand_env_vars(config)
    
    return config


class Config:
    """Configuration container with attribute access."""
    
    def __init__(self, config_path: str | Path | None = None):
        self._data = load_config(config_path)
    
    @property
    def postgresql(self) -> dict:
        return self._data.get('postgresql', {})
    
    @property
    def mongodb(self) -> dict:
        return self._data.get('mongodb', {})
    
    @property
    def sync(self) -> dict:
        return self._data.get('sync', {})
    
    @property
    def logging(self) -> dict:
        return self._data.get('logging', {})
    
    def get_postgres_uri(self) -> str:
        """Build PostgreSQL connection URI."""
        # Prefer uri (our config.yaml style) > url (legacy) > build from parts
        if uri := self.postgresql.get('uri'):
            return uri
        if url := self.postgresql.get('url'):
            return url
        pg = self.postgresql
        user = pg.get('username') or pg.get('user')
        return (
            f"postgresql://{user}:{pg['password']}"
            f"@{pg['host']}:{pg['port']}/{pg['database']}"
        )
    
    def get_mongo_uri(self) -> str:
        """Build MongoDB connection URI."""
        # Prefer uri (our config.yaml style) > url (legacy) > build from parts
        if uri := self.mongodb.get('uri'):
            return uri
        if url := self.mongodb.get('url'):
            return url
        mg = self.mongodb
        user = mg.get('username') or mg.get('user')
        password = mg.get('password')
        if user and password:
            return (
                f"mongodb://{user}:{password}"
                f"@{mg['host']}:{mg['port']}/{mg['database']}"
                f"?authSource={mg.get('auth_source', 'admin')}"
            )
        return f"mongodb://{mg['host']}:{mg['port']}/{mg['database']}"
