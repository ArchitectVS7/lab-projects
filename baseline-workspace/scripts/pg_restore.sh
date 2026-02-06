#!/bin/bash
#
# PostgreSQL Restore Script
#
# Usage: ./pg_restore.sh <backup_file> [database_name]
#
# Example:
#   ./pg_restore.sh /var/backups/postgresql/myapp_20240115_030000.sql.gz myapp
#

set -euo pipefail

# Load .env if present
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$SCRIPT_DIR/.env" ]] && source "$SCRIPT_DIR/.env"

# Arguments
BACKUP_FILE="${1:-}"
PGDATABASE="${2:-${PGDATABASE:-myapp}}"

# Database connection
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"

# =============================================================================
# Functions
# =============================================================================

die() {
    echo "ERROR: $1" >&2
    exit 1
}

usage() {
    echo "Usage: $0 <backup_file> [database_name]"
    echo ""
    echo "Arguments:"
    echo "  backup_file    Path to .sql.gz backup file"
    echo "  database_name  Target database (default: \$PGDATABASE or 'myapp')"
    echo ""
    echo "Examples:"
    echo "  $0 /var/backups/postgresql/myapp_20240115_030000.sql.gz"
    echo "  $0 backup.sql.gz myapp_staging"
    exit 1
}

confirm() {
    echo ""
    echo "WARNING: This will overwrite all data in database '$PGDATABASE'"
    echo "Backup file: $BACKUP_FILE"
    echo ""
    read -p "Are you sure? Type 'yes' to continue: " response
    
    if [[ "$response" != "yes" ]]; then
        echo "Aborted."
        exit 0
    fi
}

# =============================================================================
# Main
# =============================================================================

# Validate arguments
[[ -z "$BACKUP_FILE" ]] && usage
[[ ! -f "$BACKUP_FILE" ]] && die "Backup file not found: $BACKUP_FILE"

# Confirm destructive action
confirm

echo "Starting restore..."
echo "  Source: $BACKUP_FILE"
echo "  Target: $PGDATABASE @ $PGHOST:$PGPORT"

# Drop and recreate database
echo "Recreating database..."
PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS ${PGDATABASE};" \
    -c "CREATE DATABASE ${PGDATABASE};"

# Restore from backup
echo "Restoring data..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="${PGPASSWORD:-}" psql \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d "$PGDATABASE" \
    --quiet

echo ""
echo "Restore completed successfully!"
echo "Database '$PGDATABASE' has been restored from $BACKUP_FILE"
