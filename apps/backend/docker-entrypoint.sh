#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[frx-backend] applying database schema..."
  npx prisma db push --skip-generate
else
  echo "[frx-backend] DATABASE_URL not set — skipping prisma db push"
fi

exec node dist/index.js
