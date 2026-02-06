# DataSync

Bidirectional synchronization between PostgreSQL and MongoDB.

## Installation

```bash
pip install -e .
```

## Configuration

1. Copy `.env.example` to `.env` and set your database passwords:
   ```bash
   cp .env.example .env
   ```

2. Edit `config.yaml` with your database settings.

## Usage

### Run as daemon (continuous sync)
```bash
datasync
# or
python -m datasync.main
```

### Run once
```bash
datasync --once
```

### Override settings via CLI
```bash
# Sync specific tables only
datasync --tables users orders products

# Force direction
datasync --direction postgres_to_mongo

# Debug logging
datasync --verbose
```

## Sync Modes

- **postgres_to_mongo**: One-way sync from PostgreSQL → MongoDB
- **mongo_to_postgres**: One-way sync from MongoDB → PostgreSQL  
- **bidirectional**: Two-way sync (default)

## Conflict Resolution

When the same record exists in both databases:

- **latest_wins**: Compare timestamps, newest wins (default)
- **postgres_priority**: PostgreSQL always wins
- **mongo_priority**: MongoDB always wins

## How It Works

1. Connects to both databases using connection pools
2. Discovers tables/collections to sync (configurable)
3. Fetches records in batches (configurable batch size)
4. Converts between PostgreSQL rows and MongoDB documents
5. Upserts to target database with conflict resolution
6. Tracks sync metadata (`_sync_source`, `_sync_at`) to prevent loops

## Project Structure

```
DataSync/
├── config.yaml          # Main configuration
├── .env                  # Secrets (not in git)
├── .env.example          # Template for secrets
├── requirements.txt      # Dependencies
├── pyproject.toml        # Package config
└── datasync/
    ├── __init__.py
    ├── config.py         # Config loader
    ├── sync_engine.py    # Core sync logic
    └── main.py           # CLI entry point
```
