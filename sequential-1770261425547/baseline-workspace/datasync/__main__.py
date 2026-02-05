"""CLI entry point for DataSync."""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

from .config_loader import load_config
from .sync import run_once, run_scheduled


def setup_logging(config_path: str):
    """Configure logging based on config file."""
    try:
        config = load_config(config_path)
        log_config = config.logging
    except Exception:
        # Fallback logging if config can't be loaded
        log_config = None
    
    if log_config:
        # Ensure log directory exists
        log_path = Path(log_config.file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        logging.basicConfig(
            level=getattr(logging, log_config.level),
            format=log_config.format,
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler(log_config.file),
            ],
        )
    else:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )


def main():
    parser = argparse.ArgumentParser(
        prog="datasync",
        description="Sync data between PostgreSQL and MongoDB",
    )
    parser.add_argument(
        "-c", "--config",
        default="datasync/config.yaml",
        help="Path to configuration file (default: datasync/config.yaml)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run sync once and exit (ignore interval setting)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate config and connections without syncing",
    )
    
    args = parser.parse_args()
    
    setup_logging(args.config)
    logger = logging.getLogger(__name__)
    
    try:
        config = load_config(args.config)
        logger.info(f"Loaded config from {args.config}")
        logger.info(f"Sync direction: {config.sync.direction}")
        logger.info(f"Mappings: {len(config.sync.mappings)} table(s)")
    except FileNotFoundError as e:
        logger.error(f"Config file not found: {e}")
        sys.exit(1)
    except ValueError as e:
        logger.error(f"Config error: {e}")
        sys.exit(1)
    
    if args.dry_run:
        logger.info("Dry run - config validated successfully")
        
        # Test connections
        async def test_connections():
            from .sync import DatabaseConnections
            connections = DatabaseConnections(config)
            try:
                await connections.connect()
                logger.info("All database connections successful")
            finally:
                await connections.disconnect()
        
        asyncio.run(test_connections())
        return
    
    try:
        if args.once or config.sync.interval <= 0:
            result = asyncio.run(run_once(args.config))
            logger.info(f"Sync completed: {result}")
        else:
            asyncio.run(run_scheduled(args.config))
    except KeyboardInterrupt:
        logger.info("Sync interrupted by user")
    except Exception as e:
        logger.exception(f"Sync failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
