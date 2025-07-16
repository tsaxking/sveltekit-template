#!/bin/bash
set -e

pnpm run db:migrate & PID=$!
# Wait for migration to finish
wait $PID

pnpm drizzle-kit push --force & PID=$!
# Wait for push to finish
wait $PID

echo "Starting production server..."
node -r dotenv/config ./src/server.js & PID=$!

wait $PID