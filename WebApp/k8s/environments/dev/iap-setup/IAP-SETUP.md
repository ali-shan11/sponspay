# Google Identity-Aware Proxy (IAP) Setup for SponsPay WebApp

This document explains how to set up Google Identity-Aware Proxy to restrict access to your dev deployment to only users from your organization's Google Workspace domain.

## Overview

Identity-Aware Proxy (IAP) provides a simple way to control access to your cloud applications. It sits in front of your application and authenticates users before they can access your app.

### Architecture

```
User Request → Google Cloud Load Balancer → IAP → Authentication Check → Your App
                                                  ↓
                                            Google OAuth Login
                                                  ↓
                                            Domain Verification (@sponspay.com)
```

## What's Been Configured

### 1. Kubernetes Resources Modified

- **`k8s/environments/dev/backendconfig-patch.yaml`**: New BackendConfig with IAP enabled
- **`k8s/environments/dev/ingress.yaml`**: Updated with HTTPS-only annotation
- **`k8s/environments/dev/iap-policy.yaml`**: Access policy configuration
- **`k8s/environments/dev/kustomization.yaml`**: Updated to include new resources

### 2. IAP Configuration

- **OAuth Client**: Created for IAP authentication
- **Access Policy**: Restricts access to @sponspay.com domain users
- **HTTPS Enforcement**: HTTP requests are automatically redirected to HTTPS

## Quick Setup

Run the automated setup script:

```bash
./setup-iap.sh
```

This script will:
1. Enable required Google Cloud APIs
2. Create OAuth client credentials
3. Deploy updated Kubernetes configuration
4. Configure IAP access policies

## Manual Setup (Alternative)

If you prefer to set up manually or need to troubleshoot:

### Step 1: Enable APIs

```bash
gcloud services enable iap.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable compute.googleapis.com
```

### Step 2: Configure OAuth Consent Screen

1. Go to [Google Cloud Console - OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent?project=sponspay-deployment)
2. Configure with:
   - **User Type**: Internal
   - **App name**: SponsPay WebApp
   - **User support email**: your-email@sponspay.com
   - **Developer contact**: your-email@sponspay.com
   - **Authorized domains**: sponspay.com

### Step 3: Create OAuth Client

```bash
gcloud iap oauth-clients create sponspay-webapp-iap-client
```

### Step 4: Create Kubernetes Secret

```bash
kubectl create secret generic oauth-client-secret \
    --from-literal=client_id=YOUR_CLIENT_ID \
    --from-literal=client_secret=YOUR_CLIENT_SECRET \
    --namespace=sponspay-dev
```

### Step 5: Deploy Configuration

```bash
kubectl apply -k k8s/environments/dev
```

### Step 6: Configure Access Policy

```bash
# Get backend service name
BACKEND_SERVICE=$(gcloud compute backend-services list --filter="name~dev-sponspay" --format="value(name)")

# Set IAP policy
gcloud iap web set-iam-policy $BACKEND_SERVICE \
    --resource-type=backend-services \
    --policy=policy.yaml
```

## How It Works

### User Experience

1. **User visits dev.sponspay.com**
2. **IAP intercepts the request**
3. **User is redirected to Google login** (if not already authenticated)
4. **Google verifies the user's email domain**
5. **If user has @sponspay.com email**: Access granted
6. **If user has different domain**: Access denied
7. **Authenticated users**: Direct access to the app

### Technical Flow

1. **Load Balancer** receives HTTPS request
2. **IAP** checks for valid authentication cookie
3. **If no cookie**: Redirect to Google OAuth
4. **Google OAuth** authenticates user and returns to IAP
5. **IAP** verifies user is in allowed domain (sponspay.com)
6. **If authorized**: Forward request to backend with user headers
7. **Backend** receives request with user identity information

## Monitoring and Troubleshooting

### Check IAP Status

```bash
# Check if IAP is enabled on backend service
gcloud iap web get-iam-policy BACKEND_SERVICE_NAME --resource-type=backend-services

# Check backend service health
kubectl describe backendconfig dev-sponspay-webapp-config -n sponspay-dev
```

### Check Deployment Status

```bash
# Check pods
kubectl get pods -n sponspay-dev

# Check ingress
kubectl get ingress dev-sponspay-webapp-ingress -n sponspay-dev

# Check SSL certificate
kubectl get managedcertificate dev-sponspay-webapp-cert -n sponspay-dev
```

### Common Issues

#### 1. "OAuth Error: invalid_client"
- **Cause**: OAuth client not properly configured
- **Solution**: Recreate OAuth client and update Kubernetes secret

#### 2. "Access Denied" for valid users
- **Cause**: IAP policy not properly set
- **Solution**: Verify and reapply IAP policy

#### 3. SSL Certificate Issues
- **Cause**: Certificate provisioning takes time
- **Solution**: Wait 10-15 minutes for certificate to be issued

#### 4. Backend Service Not Found
- **Cause**: Ingress hasn't created backend service yet
- **Solution**: Wait for ingress to be fully provisioned

### Logs and Debugging

```bash
# Application logs
kubectl logs -f deployment/dev-sponspay-webapp -n sponspay-dev

# Ingress controller logs
kubectl logs -f -n kube-system -l k8s-app=glbc

# Check ingress events
kubectl describe ingress dev-sponspay-webapp-ingress -n sponspay-dev
```

## Security Features

### What IAP Provides

- **Domain-based access control**: Only @sponspay.com users
- **No code changes required**: Transparent to your Angular app
- **Enterprise-grade authentication**: Managed by Google
- **Audit logging**: All access attempts are logged
- **Session management**: Automatic session timeout and renewal

### What IAP Doesn't Provide

- **Authorization within the app**: Your app still needs to handle user roles
- **API protection**: Only protects web traffic, not direct API calls
- **Offline access**: Users must be online to authenticate

## Customization

### Adding More Domains

To allow users from additional domains, update the IAP policy:

```yaml
bindings:
- members:
  - domain:sponspay.com
  - domain:partner-company.com
  role: roles/iap.httpsResourceAccessor
```

### Adding Specific Users

To allow specific users regardless of domain:

```yaml
bindings:
- members:
  - domain:sponspay.com
  - user:external-user@gmail.com
  role: roles/iap.httpsResourceAccessor
```

### Disabling IAP

To temporarily disable IAP:

1. Remove IAP configuration from BackendConfig:
```bash
kubectl patch backendconfig dev-sponspay-webapp-config -n sponspay-dev --type='json' -p='[{"op": "remove", "path": "/spec/iap"}]'
```

2. Or comment out the IAP section in `backendconfig-patch.yaml` and redeploy.

## Production Considerations

### For Production Deployment

- **Separate OAuth client**: Create different OAuth client for production
- **Different access policies**: May want different user groups for prod
- **Monitoring**: Set up alerts for authentication failures
- **Backup access**: Configure emergency access procedures

### Cost Considerations

- **IAP is free** for the first 1,000 users per month
- **Additional users**: $0.011 per user per month
- **No additional infrastructure costs**: Uses existing load balancer

## Next Steps

1. **Test the setup**: Visit https://dev.sponspay.com and verify authentication
2. **Add team members**: Ensure all team members have @sponspay.com accounts
3. **Monitor access**: Check IAP logs in Google Cloud Console
4. **Plan for production**: Consider if you want IAP on production environment

## Support

For issues with this setup:

1. **Check the troubleshooting section** above
2. **Review Google Cloud IAP documentation**: https://cloud.google.com/iap/docs
3. **Check Kubernetes events**: `kubectl get events -n sponspay-dev`
4. **Review setup script logs**: The setup script provides detailed output

## Files Modified

- `k8s/environments/dev/backendconfig-patch.yaml` - IAP configuration
- `k8s/environments/dev/ingress.yaml` - HTTPS enforcement
- `k8s/environments/dev/iap-policy.yaml` - Access policy
- `k8s/environments/dev/kustomization.yaml` - Resource inclusion
- `setup-iap.sh` - Automated setup script
- `IAP-SETUP.md` - This documentation
