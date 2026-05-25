#!/bin/bash

# SponsPay WebApp - IAP Verification Script
# This script helps verify that Identity-Aware Proxy is working correctly

set -e

PROJECT_ID="sponspay-deployment"
DEV_DOMAIN="dev.sponspay.com"
BACKEND_SERVICE="k8s1-8e080677-sponspay-dev-dev-sponspay-webapp-servi-8-e53fd4a0"

echo "🔍 Verifying Identity-Aware Proxy Configuration"
echo "Project: $PROJECT_ID"
echo "Domain: $DEV_DOMAIN"
echo "Backend Service: $BACKEND_SERVICE"
echo ""

# Check IAP status on backend service
echo "📋 Checking IAP status on backend service..."
IAP_ENABLED=$(gcloud compute backend-services describe $BACKEND_SERVICE --global --format="value(iap.enabled)")
if [ "$IAP_ENABLED" = "True" ]; then
    echo "✅ IAP is enabled on backend service"
else
    echo "❌ IAP is NOT enabled on backend service"
    exit 1
fi

# Check OAuth client configuration
echo "🔐 Checking OAuth client configuration..."
OAUTH_CLIENT=$(gcloud compute backend-services describe $BACKEND_SERVICE --global --format="value(iap.oauth2ClientId)")
if [ -n "$OAUTH_CLIENT" ]; then
    echo "✅ OAuth client configured: $OAUTH_CLIENT"
else
    echo "❌ OAuth client not configured"
    exit 1
fi

# Check IAP access policy
echo "🔒 Checking IAP access policy..."
POLICY_MEMBERS=$(gcloud iap web get-iam-policy --resource-type=backend-services --service=$BACKEND_SERVICE --format="value(bindings[0].members[0])" 2>/dev/null || echo "")
if [ "$POLICY_MEMBERS" = "domain:sponspay.com" ]; then
    echo "✅ IAP policy correctly restricts access to sponspay.com domain"
elif [ -n "$POLICY_MEMBERS" ]; then
    echo "⚠️  IAP policy: $POLICY_MEMBERS"
else
    echo "ℹ️  Could not retrieve IAP policy (this is normal if just configured)"
fi

# Check Kubernetes configuration
echo "🚀 Checking Kubernetes configuration..."

# Check BackendConfig
BACKEND_CONFIG=$(kubectl get backendconfig dev-dev-sponspay-webapp-config -n sponspay-dev -o jsonpath='{.spec.iap.enabled}' 2>/dev/null)
if [ "$BACKEND_CONFIG" = "true" ]; then
    echo "✅ BackendConfig has IAP enabled"
else
    echo "❌ BackendConfig does not have IAP enabled"
fi

# Check Service annotation
SERVICE_ANNOTATION=$(kubectl get service dev-sponspay-webapp-service -n sponspay-dev -o jsonpath='{.metadata.annotations.beta\.cloud\.google\.com/backend-config}')
if [[ "$SERVICE_ANNOTATION" == *"dev-dev-sponspay-webapp-config"* ]]; then
    echo "✅ Service is using IAP-enabled BackendConfig"
else
    echo "❌ Service is not using IAP-enabled BackendConfig: $SERVICE_ANNOTATION"
fi

# Check OAuth secret
if kubectl get secret oauth-client-secret -n sponspay-dev >/dev/null 2>&1; then
    echo "✅ OAuth client secret exists in Kubernetes"
else
    echo "❌ OAuth client secret missing in Kubernetes"
fi

# Check SSL certificate status
echo "🔐 Checking SSL certificate status..."
CERT_STATUS=$(kubectl get managedcertificate dev-sponspay-webapp-cert -n sponspay-dev -o jsonpath='{.status.certificateStatus}' 2>/dev/null)
if [ "$CERT_STATUS" = "Active" ]; then
    echo "✅ SSL certificate is active"
elif [ "$CERT_STATUS" = "Provisioning" ]; then
    echo "⏳ SSL certificate is still provisioning (this can take 10-15 minutes)"
else
    echo "⚠️  SSL certificate status: $CERT_STATUS"
fi

# Check external IP
echo "🌐 Checking external IP..."
EXTERNAL_IP=$(kubectl get ingress dev-sponspay-webapp-ingress -n sponspay-dev -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -n "$EXTERNAL_IP" ]; then
    echo "✅ External IP assigned: $EXTERNAL_IP"
else
    echo "⏳ External IP not yet assigned"
fi

echo ""
echo "🧪 Testing IAP Functionality"
echo ""

# Test if IAP is working
echo "📡 Testing IAP redirect..."
if command -v curl >/dev/null 2>&1; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://$DEV_DOMAIN/ || echo "000")
    if [ "$RESPONSE" = "302" ]; then
        echo "✅ IAP is working - received redirect (302) as expected"
        echo "   Users will be redirected to Google login"
    elif [ "$RESPONSE" = "200" ]; then
        echo "⚠️  Received 200 response - IAP may not be fully active yet"
        echo "   This could mean:"
        echo "   1. Changes are still propagating (wait 5-10 minutes)"
        echo "   2. You're already authenticated with Google"
        echo "   3. IAP configuration needs more time to take effect"
    else
        echo "⚠️  Received HTTP $RESPONSE - checking configuration..."
    fi
else
    echo "ℹ️  curl not available - manual testing required"
fi

echo ""
echo "📋 Manual Testing Instructions:"
echo "1. Open an incognito/private browser window"
echo "2. Visit: https://$DEV_DOMAIN"
echo "3. You should be redirected to Google login"
echo "4. Only users with @sponspay.com emails should be able to access"
echo ""

echo "🔍 Troubleshooting:"
echo "If IAP is not working immediately:"
echo "1. Wait 5-10 minutes for changes to propagate"
echo "2. Clear browser cache and cookies"
echo "3. Try incognito/private browsing mode"
echo "4. Check that SSL certificate is active"
echo ""

echo "📊 Monitoring Commands:"
echo "kubectl get ingress dev-sponspay-webapp-ingress -n sponspay-dev"
echo "kubectl get managedcertificate dev-sponspay-webapp-cert -n sponspay-dev"
echo "gcloud compute backend-services describe $BACKEND_SERVICE --global"
echo ""

echo "🎉 IAP verification complete!"
