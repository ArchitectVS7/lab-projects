"""CLI entry point for DataSync."""

import argparse
import sys


def main():
    parser = argparse.ArgumentParser(
        description='DataSync - PostgreSQL to MongoDB synchronization'
    )
    parser.add_argument(
        '-c', '--config',
        default='config.yaml',
        help='Path to configuration file (default: config.yaml)'
    )
    parser.add_argument(
        '--continuous',
        action='store_true',
        help='Run in continuous sync mode'
    )
    parser.add_argument(
        '--once',
        action='store_true',
        help='Run a single sync cycle (default)'
    )
    
    args = parser.parse_args()
    
    from .sync import DataSync
    
    try:
        with DataSync(args.config) as syncer:
            if args.continuous:
                syncer.run_continuous()
            else:
                stats = syncer.sync()
                print(f"\nSync completed successfully!")
                print(f"Total records synced: {stats['total_synced']}")
                for table, table_stats in stats['tables'].items():
                    print(f"  {table}: {table_stats['synced']} records")
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Sync failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
