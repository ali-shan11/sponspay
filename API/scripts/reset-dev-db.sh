#!/bin/bash
#
# Reset the dev database in the cloud environment
#
# Usage:
#   ./scripts/reset-dev-db.sh
#

set -e

NAMESPACE="sponspay-api-dev"
JOB_NAME="db-reset"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JOB_FILE="$SCRIPT_DIR/../k8s/environments/dev/db-reset-job.yaml"

echo "=== Dev Database Reset Tool ==="
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check if we can access the cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "Error: Cannot connect to Kubernetes cluster"
    echo "Make sure you're connected to the correct cluster"
    exit 1
fi

# Delete existing job if it exists
echo "Cleaning up any existing reset job..."
kubectl delete job "$JOB_NAME" -n "$NAMESPACE" --ignore-not-found=true

# Create the job
echo "Creating database reset job..."
kubectl apply -f "$JOB_FILE" -n "$NAMESPACE"

# Wait for job to complete
echo ""
echo "Waiting for job to complete..."
kubectl wait --for=condition=complete --timeout=60s job/"$JOB_NAME" -n "$NAMESPACE"

# Show job logs
echo ""
echo "=== Job Output ==="
kubectl logs job/"$JOB_NAME" -n "$NAMESPACE"

# Restart API to trigger re-seeding
echo ""
echo "Restarting API deployment to trigger re-seeding..."
kubectl rollout restart deployment/sponspay-api -n "$NAMESPACE"
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/sponspay-api -n "$NAMESPACE" --timeout=120s
echo ""
echo "Done! Database reset and API re-seeded."
