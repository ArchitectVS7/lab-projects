#!/bin/bash
#
# PostgreSQL Daily Backup Script
# 
# Usage: ./pg_backup.sh
# Cron:  0 2 * * * /path/to/pg_backup.sh >> /var/log/pg_backup.log 2>&1
#

set -euo pipefail

# ============ Configuration ============

DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-myapp}"
DB_USER="${PGUSER:-postgres}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# ============ Functions ============

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
  log "ERROR: $1" >&2
  exit 1
}

check_dependencies() {
  command -v pg_dump >/dev/null 2>&1 || error "pg_dump not found"
  command -v gzip >/dev/null 2>&1 || error "gzip not found"
}

create_backup_dir() {
  if [[ ! -d "$BACKUP_DIR" ]]; then
    mkdir -p "$BACKUP_DIR"
    log "Created backup directory: $BACKUP_DIR"
  fi
}

perform_backup() {
  log "Starting backup of database: $DB_NAME"
  log "Host: $DB_HOST:$DB_PORT"
  
  pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password \
    --format=plain \
    --no-owner \
    --no-privileges \
    | gzip > "$BACKUP_FILE"
  
  local size=$(du -h "$BACKUP_FILE" | cut -f1)
  log "Backup complete: $BACKUP_FILE ($size)"
}

cleanup_old_backups() {
  log "Removing backups older than $RETENTION_DAYS days"
  
  local count=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +$RETENTION_DAYS | wc -l)
  
  find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
  
  log "Removed $count old backup(s)"
}

verify_backup() {
  if [[ ! -f "$BACKUP_FILE" ]]; then
    error "Backup file not created"
  fi
  
  if [[ ! -s "$BACKUP_FILE" ]]; then
    rm -f "$BACKUP_FILE"
    error "Backup file is empty"
  fi
  
  # Test gzip integrity
  if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    error "Backup file is corrupted"
  fi
  
  log "Backup verified successfully"
}

# ============ Main ============

main() {
  log "========== PostgreSQL Backup Started =========="
  
  check_dependencies
  create_backup_dir
  perform_backup
  verify_backup
  cleanup_old_backups
  
  log "========== Backup Completed Successfully =========="
}

main "$@"
