#!/bin/bash

# Script to update telegram-credentials secret session_string key
# This updates only the session_string key without affecting other keys in the secret

set -e

# Configuration
SECRET_NAME="telegram-credentials"
NAMESPACE="sponspay-api-dev"
KEY_NAME="session_string"
NEW_VALUE=""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Updating Kubernetes secret: ${SECRET_NAME}${NC}"
echo -e "${YELLOW}Namespace: ${NAMESPACE}${NC}"
echo -e "${YELLOW}Key: ${KEY_NAME}${NC}"
echo ""

# Check if secret exists
if ! kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" &> /dev/null; then
    echo -e "${RED}Error: Secret '${SECRET_NAME}' not found in namespace '${NAMESPACE}'${NC}"
    exit 1
fi

# Base64 encode the new value
ENCODED_VALUE=$(echo -n "$NEW_VALUE" | base64 -w 0)

# Update the secret using kubectl patch
echo -e "${YELLOW}Patching secret...${NC}"
kubectl patch secret "$SECRET_NAME" -n "$NAMESPACE" \
    --type='json' \
    -p="[{\"op\": \"replace\", \"path\": \"/data/${KEY_NAME}\", \"value\":\"${ENCODED_VALUE}\"}]"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully updated ${KEY_NAME} in secret ${SECRET_NAME}${NC}"
    echo ""
    echo -e "${YELLOW}Note: Pods using this secret may need to be restarted to pick up the new value.${NC}"
    echo -e "${YELLOW}To restart pods, you can use:${NC}"
    echo -e "  kubectl rollout restart deployment/<deployment-name> -n ${NAMESPACE}"
else
    echo -e "${RED}✗ Failed to update secret${NC}"
    exit 1
fi
