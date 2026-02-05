"""Main entry point for DataSync."""

import sys
import time
import signal
import logging
import argparse
from pathlib import Path

from .config import load_config
from .sync_engine import SyncEngine


def setup_logging(config) -> logging.Logger:
    """Configure logging based on config."""
    log_config = config.logging
    
    # Create logs directory if needed
    log_path = Path(log_config.file)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_config.level.upper()),
        format=log_config.format,
        handlers=[
            logging.FileHandler(log_config.file),
            logging.StreamHandler(sys.stdout),
        ]
    )
    
    return logging.getLogger('datasync')


def run_once(config, logger) -> bool:
    """Run a single sync cycle."""
    logger.info("Starting sync cycle")
    start_time = time.time()
    
    try:
        with SyncEngine(config) as engine:
            results = engine.sync_all()
        
        elapsed = time.time() - start_time
        total_synced = sum(r.records_synced for r in results.values())
        total_errors = sum(len(r.errors) for r in results.values())
        
        logger.info(f"Sync cycle complete in {elapsed:.2f}s: {total_synced} records, {total_errors} errors")
        
        # Log any errors
        for table, result in results.items():
            for error in result.errors:
                logger.error(f"[{table}] {error}")
        
        return total_errors == 0
        
    except Exception as e:
        logger.exception(f"Sync cycle failed: {e}")
        return False


def run_daemon(config, logger) -> None:
    """Run sync as a daemon with configured interval."""
    interval = config.sync.interval_seconds
    running = True
    
    def handle_signal(signum, frame):
        nonlocal running
        logger.info(f"Received signal {signum}, shutting down...")
        running = False
    
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    
    logger.info(f"Starting DataSync daemon (interval: {interval}s)")
    
    while running:
        run_once(config, logger)
        
        # Sleep in small increments to handle signals promptly
        for _ in range(interval):
            if not running:
                break
            time.sleep(1)
    
    logger.info("DataSync daemon stopped")


def main():
    parser = argparse.ArgumentParser(
        description='DataSync - PostgreSQL ↔ MongoDB synchronization'
    )
    parser.add_argument(
        '-c', '--config',
        default='config.yaml',
        help='Path to configuration file (default: config.yaml)'
    )
    parser.add_argument(
        '-e', '--env',
        default='.env',
        help='Path to .env file (default: .env)'
    )
    parser.add_argument(
        '--once',
        action='store_true',
        help='Run a single sync cycle and exit'
    )
    parser.add_argument(
        '--tables',
        nargs='+',
        help='Override tables to sync (space-separated)'
    )
    parser.add_argument(
        '--direction',
        choices=['postgres_to_mongo', 'mongo_to_postgres', 'bidirectional'],
        help='Override sync direction'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable debug logging'
    )
    
    args = parser.parse_args()
    
    # Load configuration
    try:
        config = load_config(args.config, args.env)
    except FileNotFoundError as e:
        print(f"Error: Configuration file not found: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error loading configuration: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Apply CLI overrides
    if args.tables:
        config.sync.tables = args.tables
    if args.direction:
        config.sync.direction = args.direction
    if args.verbose:
        config.logging.level = 'DEBUG'
    
    # Setup logging
    logger = setup_logging(config)
    logger.info(f"Configuration loaded from {args.config}")
    
    # Run
    if args.once:
        success = run_once(config, logger)
        sys.exit(0 if success else 1)
    else:
        run_daemon(config, logger)


if __name__ == '__main__':
    main()
