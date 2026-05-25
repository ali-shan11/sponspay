#!/bin/bash
#
# Download the dev database from the GKE cluster and import it locally.
#
# Prerequisites:
#   - kubectl configured and connected to the GKE cluster
#   - Local Docker Compose services running (at least the db service)
#
# Usage:
#   ./scripts/sync-dev-db.sh
#

set -e

NAMESPACE="sponspay-api-dev"
REMOTE_HOST="10.67.208.3"
REMOTE_DB="dev"
LOCAL_DB="dev"
LOCAL_USER="filip"
DUMP_FILE="/tmp/dev-db-dump.sql"
POD_NAME="db-sync-dump"

cd "$(dirname "${BASH_SOURCE[0]}")/.."

cleanup() {
  echo ""
  echo "Cleaning up..."
  kubectl delete pod "$POD_NAME" -n "$NAMESPACE" --ignore-not-found=true --wait=false 2>/dev/null || true
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

# --- 1. Check prerequisites ---

if ! command -v kubectl &>/dev/null; then
  echo "Error: kubectl is not installed or not in PATH"
  exit 1
fi

if ! kubectl cluster-info &>/dev/null; then
  echo "Error: Cannot connect to Kubernetes cluster"
  echo "Make sure you're connected to the correct cluster"
  exit 1
fi

if ! docker compose ps db --status running 2>/dev/null | grep -q db; then
  echo "Error: Local db container is not running"
  echo "Start it with: docker compose up -d db"
  exit 1
fi

echo "=== Dev Database Sync ==="
echo ""

# --- 2. Read remote DB credentials from K8s secret ---

echo "Reading remote DB credentials..."
DB_USER=$(kubectl get secret db-credentials -n "$NAMESPACE" -o jsonpath='{.data.user}' | base64 -d)
DB_PASS=$(kubectl get secret db-credentials -n "$NAMESPACE" -o jsonpath='{.data.password}' | base64 -d)

if [ -z "$DB_USER" ] || [ -z "$DB_PASS" ]; then
  echo "Error: Could not read db-credentials secret"
  exit 1
fi
echo "  Credentials retrieved."

# --- 3. Start a temporary pod for pg_dump ---

echo "Starting temporary pod in cluster..."
kubectl delete pod "$POD_NAME" -n "$NAMESPACE" --ignore-not-found=true --wait=true 2>/dev/null

kubectl run "$POD_NAME" -n "$NAMESPACE" \
  --image=postgres:17 \
  --restart=Never \
  --env="PGHOST=$REMOTE_HOST" \
  --env="PGDATABASE=$REMOTE_DB" \
  --env="PGUSER=$DB_USER" \
  --env="PGPASSWORD=$DB_PASS" \
  --command -- sleep 600

echo "  Waiting for pod to be ready..."
kubectl wait --for=condition=Ready pod/"$POD_NAME" -n "$NAMESPACE" --timeout=60s

# --- 4. Run pg_dump and stream to local file ---

echo "Dumping remote database..."
kubectl exec "$POD_NAME" -n "$NAMESPACE" -- \
  pg_dump --clean --if-exists --no-owner --no-acl "$REMOTE_DB" > "$DUMP_FILE"

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "  Dump complete ($DUMP_SIZE)"

# --- 5. Stop local API to avoid TypeORM sync conflicts ---

echo "Stopping local API..."
docker compose stop api 2>/dev/null || true

# --- 6. Drop and recreate local database ---

echo "Recreating local database..."
docker compose exec -T db psql -U "$LOCAL_USER" -d postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = '$LOCAL_DB' AND pid <> pg_backend_pid();
" >/dev/null 2>&1 || true

docker compose exec -T db psql -U "$LOCAL_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$LOCAL_DB\";"
docker compose exec -T db psql -U "$LOCAL_USER" -d postgres -c "CREATE DATABASE \"$LOCAL_DB\";"

# --- 7. Import the dump ---

echo "Importing into local database..."
docker compose exec -T db psql -U "$LOCAL_USER" -d "$LOCAL_DB" < "$DUMP_FILE" 2>&1 | tail -1

# --- 8. Restart API ---

echo "Starting local API..."
docker compose start api

echo ""
echo "Done! Local database is now a copy of the dev environment."
