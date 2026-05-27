#!/bin/sh
set -e

PRISMA_CLI="/app/node_modules/prisma/build/index.js"

if [ -n "$DATABASE_URL" ]; then
  echo "[frx-backend] applying database schema..."
  node "$PRISMA_CLI" db push --skip-generate
else
  echo "[frx-backend] DATABASE_URL not set — skipping prisma db push"
fi

exec node dist/index.js
