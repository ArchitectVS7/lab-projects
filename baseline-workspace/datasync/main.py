"""CLI entry point for DataSync."""

import argparse
import logging
import sys
import time
from pathlib import Path

from .config import Config
from .sync import DataSync


def setup_logging(config: Config) -> None:
    """Configure logging from config settings."""
    log_config = config.logging
    
    # Create logs directory if needed
    log_file = log_config.get('file')
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
    
    handlers = [logging.StreamHandler(sys.stdout)]
    if log_file:
        handlers.append(logging.FileHandler(log_file))
    
    logging.basicConfig(
        level=getattr(logging, log_config.get('level', 'INFO')),
        format=log_config.get('format', '%(asctime)s - %(name)s - %(levelname)s - %(message)s'),
        handlers=handlers
    )


def run_once(config: Config) -> int:
    """Run a single sync operation.
    
    Returns:
        Exit code (0 for success, 1 for errors)
    """
    with DataSync(config) as sync:
        stats = sync.sync_all()
        
        # Print summary
        print("\n" + "=" * 50)
        print("SYNC SUMMARY")
        print("=" * 50)
        
        has_errors = False
        for s in stats:
            status = "✓" if not s.errors else "✗"
            print(f"\n{status} {s.table} ({s.direction})")
            print(f"  Processed: {s.rows_processed}")
            print(f"  Inserted:  {s.rows_inserted}")
            print(f"  Updated:   {s.rows_updated}")
            print(f"  Skipped:   {s.rows_skipped}")
            duration = s.duration_seconds or 0
            print(f"  Duration:  {duration:.2f}s")
            
            if s.errors:
                has_errors = True
                for err in s.errors:
                    print(f"  ERROR: {err}")
        
        return 1 if has_errors else 0


def run_continuous(config: Config) -> None:
    """Run sync continuously at configured interval."""
    interval = config.sync.get('interval_seconds', 60)
    logger = logging.getLogger(__name__)
    
    logger.info(f"Starting continuous sync (interval: {interval}s)")
    
    while True:
        try:
            run_once(config)
        except KeyboardInterrupt:
            logger.info("Interrupted by user")
            break
        except Exception as e:
            logger.error(f"Sync failed: {e}")
        
        logger.info(f"Next sync in {interval} seconds...")
        time.sleep(interval)


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='DataSync - PostgreSQL to MongoDB synchronization'
    )
    parser.add_argument(
        '-c', '--config',
        help='Path to config file (default: config.yaml)',
        default=None
    )
    parser.add_argument(
        '--continuous',
        action='store_true',
        help='Run continuously at configured interval'
    )
    parser.add_argument(
        '--table',
        help='Sync only the specified table',
        default=None
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable debug logging'
    )
    
    args = parser.parse_args()
    
    # Load configuration
    try:
        config = Config(args.config)
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    
    # Setup logging
    setup_logging(config)
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Filter tables if specified
    if args.table:
        tables = config.sync.get('tables', [])
        config._data['sync']['tables'] = [
            t for t in tables if t['name'] == args.table
        ]
        if not config.sync['tables']:
            print(f"Error: Table '{args.table}' not found in config", file=sys.stderr)
            return 1
    
    # Run
    if args.continuous:
        run_continuous(config)
        return 0
    else:
        return run_once(config)


if __name__ == '__main__':
    sys.exit(main())
