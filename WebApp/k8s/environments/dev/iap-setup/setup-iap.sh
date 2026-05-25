#!/bin/bash

# SponsPay WebApp - Identity-Aware Proxy Setup Script
# This script sets up Google Identity-Aware Proxy for the dev environment

set -e

PROJECT_ID="sponspay-deployment"
DOMAIN="sponspay.com"
DEV_DOMAIN="dev.sponspay.com"

echo "🚀 Setting up Identity-Aware Proxy for SponsPay WebApp Dev Environment"
echo "Project: $PROJECT_ID"
echo "Domain: $DOMAIN"
echo "Dev URL: https://$DEV_DOMAIN"
echo ""

# Check if user is logged in to gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Please login to gcloud first:"
    echo "   gcloud auth login"
    exit 1
fi

# Set the project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable iap.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable compute.googleapis.com

# Check if OAuth consent screen is configured
echo "🔍 Checking OAuth consent screen configuration..."
BRAND_NAME=""
if gcloud iap oauth-brands list --format="value(name)" 2>/dev/null | grep -q .; then
    BRAND_NAME=$(gcloud iap oauth-brands list --format="value(name)" | head -1)
    echo "✅ OAuth brand found: $BRAND_NAME"
else
    echo "⚠️  OAuth consent screen not configured. Please configure it manually:"
    echo "   1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
    echo "   2. Configure OAuth consent screen with:"
    echo "      - User Type: Internal"
    echo "      - App name: SponsPay WebApp"
    echo "      - User support email: your-email@$DOMAIN"
    echo "      - Developer contact: your-email@$DOMAIN"
    echo "   3. Add authorized domain: $DOMAIN"
    echo ""
    read -p "Press Enter after configuring OAuth consent screen..."
    
    # Get the brand name after configuration
    BRAND_NAME=$(gcloud iap oauth-brands list --format="value(name)" | head -1)
    if [ -z "$BRAND_NAME" ]; then
        echo "❌ OAuth brand still not found. Please ensure OAuth consent screen is properly configured."
        exit 1
    fi
fi

# Create OAuth client for IAP
echo "🔐 Creating OAuth client for IAP..."
CLIENT_DISPLAY_NAME="SponsPay WebApp IAP Client"

# Check if client already exists
EXISTING_CLIENT=$(gcloud iap oauth-clients list $BRAND_NAME --format="value(name)" 2>/dev/null | grep -i "sponspay" | head -1)

if [ -n "$EXISTING_CLIENT" ]; then
    echo "✅ OAuth client already exists: $EXISTING_CLIENT"
    CLIENT_ID=$(gcloud iap oauth-clients describe $EXISTING_CLIENT --format="value(clientId)")
    CLIENT_SECRET=$(gcloud iap oauth-clients describe $EXISTING_CLIENT --format="value(secret)")
else
    echo "📝 Creating new OAuth client..."
    OAUTH_RESULT=$(gcloud iap oauth-clients create $BRAND_NAME --display_name="$CLIENT_DISPLAY_NAME" --format="value(name,clientId,secret)")
    CLIENT_NAME=$(echo $OAUTH_RESULT | cut -d' ' -f1)
    CLIENT_ID=$(echo $OAUTH_RESULT | cut -d' ' -f2)
    CLIENT_SECRET=$(echo $OAUTH_RESULT | cut -d' ' -f3)
fi

echo "✅ OAuth Client ID: $CLIENT_ID"

# Create Kubernetes secret for OAuth credentials
echo "🔑 Creating Kubernetes secret for OAuth credentials..."
kubectl create secret generic oauth-client-secret \
    --from-literal=client_id=$CLIENT_ID \
    --from-literal=client_secret=$CLIENT_SECRET \
    --namespace=sponspay-dev \
    --dry-run=client -o yaml | kubectl apply -f -

echo "✅ OAuth secret created in sponspay-dev namespace"

# Deploy the updated Kubernetes configuration
echo "🚀 Deploying updated Kubernetes configuration..."
kubectl apply -k k8s/environments/dev

echo "⏳ Waiting for deployment to be ready..."
kubectl rollout status deployment/dev-sponspay-webapp -n sponspay-dev --timeout=300s

# Get the external IP
echo "🌐 Getting external IP address..."
EXTERNAL_IP=$(kubectl get ingress dev-sponspay-webapp-ingress -n sponspay-dev -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ -z "$EXTERNAL_IP" ]; then
    echo "⏳ External IP not yet assigned. This may take a few minutes..."
    echo "   Check status with: kubectl get ingress dev-sponspay-webapp-ingress -n sponspay-dev"
else
    echo "✅ External IP: $EXTERNAL_IP"
fi

# Configure IAP access policy
echo "🔒 Configuring IAP access policy..."

# Get the backend service name
BACKEND_SERVICE=$(gcloud compute backend-services list --filter="name~dev-sponspay" --format="value(name)" | head -1)

if [ -n "$BACKEND_SERVICE" ]; then
    echo "📋 Found backend service: $BACKEND_SERVICE"
    
    # Create temporary policy file
    POLICY_FILE=$(mktemp)
    cat > $POLICY_FILE <<EOF
bindings:
- members:
  - domain:$DOMAIN
  role: roles/iap.httpsResourceAccessor
version: 1
EOF
    
    # Set IAP access policy to allow only sponspay.com domain
    gcloud iap web set-iam-policy $POLICY_FILE \
        --resource-type=backend-services \
        --service=$BACKEND_SERVICE
    
    # Clean up temporary file
    rm $POLICY_FILE
    
    echo "✅ IAP access policy configured for domain: $DOMAIN"
else
    echo "⚠️  Backend service not found yet. IAP policy will need to be configured manually:"
    echo "   1. Wait for the ingress to create the backend service"
    echo "   2. Run: gcloud compute backend-services list"
    echo "   3. Configure IAP policy for the backend service"
fi

echo ""
echo "🎉 IAP setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Wait for SSL certificate to be provisioned (may take 10-15 minutes)"
echo "   2. Ensure DNS points $DEV_DOMAIN to $EXTERNAL_IP"
echo "   3. Test access at https://$DEV_DOMAIN"
echo ""
echo "🔍 Monitoring commands:"
echo "   kubectl get managedcertificate dev-sponspay-webapp-cert -n sponspay-dev"
echo "   kubectl get ingress dev-sponspay-webapp-ingress -n sponspay-dev"
echo "   kubectl logs -f deployment/dev-sponspay-webapp -n sponspay-dev"
echo ""
echo "🔒 IAP Status:"
echo "   Only users with @$DOMAIN email addresses can access the application"
echo "   Users will be automatically redirected to Google login"
