#!/bin/sh
set -e

echo "Applying database migrations..."
until npx prisma migrate deploy; do
  echo "migrate deploy not ready yet, retrying in 2s..."
  sleep 2
done

echo "Seeding database..."
npx tsx prisma/seed.ts

echo "Starting Next.js standalone server on ${HOSTNAME}:${PORT}..."
exec node server.js
