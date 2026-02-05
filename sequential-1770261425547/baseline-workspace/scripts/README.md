# PostgreSQL Backup Scripts

Daily backup and restore scripts for PostgreSQL databases.

## Setup

```bash
# 1. Make scripts executable
chmod +x pg_backup.sh pg_restore.sh

# 2. Create config
cp .env.example .env
nano .env  # Fill in your values

# 3. Create backup directory
sudo mkdir -p /var/backups/postgresql
sudo chown $USER:$USER /var/backups/postgresql

# 4. Test backup
./pg_backup.sh
```

## Daily Cron Job

```bash
# Edit crontab
crontab -e

# Add this line (runs at 3 AM daily):
0 3 * * * /path/to/scripts/pg_backup.sh >> /var/log/pg_backup.log 2>&1

# Or with specific database:
0 3 * * * /path/to/scripts/pg_backup.sh production_db >> /var/log/pg_backup.log 2>&1
```

## Usage

### Backup

```bash
# Backup default database (from .env)
./pg_backup.sh

# Backup specific database
./pg_backup.sh myapp_production

# With custom settings
BACKUP_DIR=/tmp/backups BACKUP_RETENTION_DAYS=14 ./pg_backup.sh
```

### Restore

```bash
# Restore to default database
./pg_restore.sh /var/backups/postgresql/myapp_20240115_030000.sql.gz

# Restore to different database
./pg_restore.sh /var/backups/postgresql/myapp_20240115_030000.sql.gz myapp_staging
```

### List Backups

```bash
ls -lh /var/backups/postgresql/
```

## S3 Upload (Optional)

1. Install AWS CLI: `pip install awscli`
2. Configure credentials: `aws configure`
3. Set `S3_BUCKET` in `.env`:
   ```
   S3_BUCKET=s3://your-bucket/postgres-backups
   ```

Backups upload to S3 with STANDARD_IA storage class. Set up S3 Lifecycle policies for long-term retention/deletion.

## Backup Contents

The backup includes:
- ✅ All tables and data
- ✅ Indexes
- ✅ Constraints
- ✅ Sequences
- ❌ Roles/users (use `--no-owner`)
- ❌ Permissions (use `--no-acl`)

## Monitoring

Check the log file for backup history:

```bash
tail -f /var/backups/postgresql/backup.log
```

### Alert on Failure

Add to crontab to get email alerts on failure:

```bash
MAILTO=your@email.com
0 3 * * * /path/to/scripts/pg_backup.sh || echo "Backup failed!"
```

Or use a healthcheck service:

```bash
0 3 * * * /path/to/scripts/pg_backup.sh && curl -fsS -m 10 --retry 5 https://hc-ping.com/your-uuid
```
