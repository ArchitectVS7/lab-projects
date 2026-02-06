#!/bin/sh
set -e

echo "=== TaskMan Backend Startup ==="

# Check if the users table exists; if _prisma_migrations exists but
# users does not, migration history is out of sync — clear it and re-apply.
TABLE_EXISTS=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRaw\`SELECT to_regclass('public.users')\`
  .then(r => { console.log(r[0].to_regclass ? 'yes' : 'no'); p.\$disconnect(); })
  .catch(() => { console.log('no'); p.\$disconnect(); });
" 2>/dev/null || echo "no")

if [ "$TABLE_EXISTS" = "no" ]; then
  echo "Tables missing — checking for stale migration history..."
  MIGRATION_TABLE=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$queryRaw\`SELECT to_regclass('public._prisma_migrations')\`
    .then(r => { console.log(r[0].to_regclass ? 'yes' : 'no'); p.\$disconnect(); })
    .catch(() => { console.log('no'); p.\$disconnect(); });
  " 2>/dev/null || echo "no")

  if [ "$MIGRATION_TABLE" = "yes" ]; then
    echo "Stale migration history detected — clearing _prisma_migrations..."
    node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.\$executeRawUnsafe('DELETE FROM _prisma_migrations')
      .then(() => { console.log('Cleared.'); p.\$disconnect(); })
      .catch(e => { console.error(e); p.\$disconnect(); process.exit(1); });
    "
  fi
fi

echo "Running prisma migrate deploy..."
npx prisma migrate deploy

echo "Starting server..."
exec npm start
