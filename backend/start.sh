#!/bin/sh
set -e

echo "=== TaskMan Backend Startup ==="

echo "Running prisma migrate deploy..."
npx prisma migrate deploy 2>&1 || true

# Verify tables actually exist. If migration history is out of sync
# (marked applied but tables missing), reset and re-apply.
echo "Verifying database tables..."
TABLE_CHECK=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  (async () => {
    const p = new PrismaClient();
    try {
      await p.\$queryRawUnsafe('SELECT 1 FROM users LIMIT 1');
      console.log('OK');
    } catch {
      console.log('MISSING');
    } finally {
      await p.\$disconnect();
    }
  })();
" 2>&1)

echo "Table check result: $TABLE_CHECK"

if echo "$TABLE_CHECK" | grep -q "MISSING"; then
  echo "Tables missing — resetting migration history and re-applying..."
  npx prisma migrate reset --force --skip-seed
  echo "Migration reset complete."
fi

echo "Starting server..."
exec npm start
