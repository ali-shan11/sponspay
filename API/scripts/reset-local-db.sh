#!/bin/bash
#
# Reset the local Docker database and seed the API key
#
# Usage:
#   ./scripts/reset-local-db.sh
#

set -e

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# 1. Bring everything down and remove the db volume
docker compose down
docker volume rm api_db-data 2>/dev/null || docker volume rm $(docker volume ls -q | grep db-data) 2>/dev/null || true

# 2. Bring everything back up
docker compose up -d

# 3. Wait for the API to be healthy (means DB is up + TypeORM has synced tables)
echo "Waiting for API to be ready..."
until curl -sf http://localhost:3000/health | grep -q '"status":"ok"'; do
  sleep 2
  echo "  still waiting..."
done
echo "API is ready!"

# 4. Seed data
docker compose exec -T db psql -U filip -d dev <<'SQL'
-- API key
INSERT INTO api_key (id, "apiKey", description, banned)
VALUES (gen_random_uuid(), 'fBaPyHpZ08Q1luC', 'dev-frontend', false)
ON CONFLICT ("apiKey") DO NOTHING;

-- Terms & Conditions v1
INSERT INTO terms (id, version, html)
VALUES (gen_random_uuid(), 1, '<h1>Terms and Conditions</h1><p>These are the platform terms and conditions for testing purposes.</p>')
ON CONFLICT (version) DO NOTHING;
SQL

echo "Done! API key and terms seeded."
