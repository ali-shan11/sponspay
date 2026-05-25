# Manual IAP Setup Guide

If the automated script encounters issues, follow these manual steps to set up Identity-Aware Proxy.

## Prerequisites

1. Ensure you're logged into gcloud: `gcloud auth login`
2. Set the correct project: `gcloud config set project sponspay-deployment`

## Step 1: Enable APIs

```bash
gcloud services enable iap.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable compute.googleapis.com
```

## Step 2: Configure OAuth Consent Screen

1. Go to [Google Cloud Console - OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent?project=sponspay-deployment)
2. Click "CREATE" or "CONFIGURE CONSENT SCREEN"
3. Choose "Internal" user type
4. Fill in the required fields:
   - **App name**: SponsPay WebApp
   - **User support email**: your-email@sponspay.com
   - **Developer contact information**: your-email@sponspay.com
5. Add authorized domain: `sponspay.com`
6. Save and continue through all steps

## Step 3: Create OAuth Client

After configuring the consent screen, get the brand name and create a client:

```bash
# Get the OAuth brand name
BRAND_NAME=$(gcloud iap oauth-brands list --format="value(name)")
echo "Brand name: $BRAND_NAME"

# Create OAuth client
gcloud iap oauth-clients create $BRAND_NAME \
    --display_name="SponsPay WebApp IAP Client"
```

## Step 4: Get Client Credentials

```bash
# List OAuth clients to get the client name
gcloud iap oauth-clients list $BRAND_NAME

# Get client details (replace CLIENT_NAME with actual name from above)
CLIENT_NAME="projects/PROJECT_NUMBER/brands/BRAND_ID/identityAwareProxyClients/CLIENT_ID"
gcloud iap oauth-clients describe $CLIENT_NAME
```

## Step 5: Create Kubernetes Secret

Replace `YOUR_CLIENT_ID` and `YOUR_CLIENT_SECRET` with the values from step 4:

```bash
kubectl create secret generic oauth-client-secret \
    --from-literal=client_id=YOUR_CLIENT_ID \
    --from-literal=client_secret=YOUR_CLIENT_SECRET \
    --namespace=sponspay-dev
```

## Step 6: Deploy Kubernetes Configuration

```bash
kubectl apply -k k8s/environments/dev
```

## Step 7: Wait for Backend Service Creation

Wait for the ingress to create the backend service (this may take 5-10 minutes):

```bash
# Check if backend service is created
gcloud compute backend-services list --filter="name~dev-sponspay"

# Monitor ingress status
kubectl get ingress dev-sponspay-webapp-ingress -n sponspay-dev -w
```

## Step 8: Configure IAP Policy

Once the backend service is created:

```bash
# Get backend service name
BACKEND_SERVICE=$(gcloud compute backend-services list --filter="name~dev-sponspay" --format="value(name)")

# Create policy file
cat > iap-policy.yaml << EOF
bindings:
- members:
  - domain:sponspay.com
  role: roles/iap.httpsResourceAccessor
etag: ABCD
version: 1
EOF

# Apply IAP policy
gcloud iap web set-iam-policy $BACKEND_SERVICE \
    --resource-type=backend-services \
    --policy=iap-policy.yaml
```

## Step 9: Verify Setup

```bash
# Check IAP status
gcloud iap web get-iam-policy $BACKEND_SERVICE --resource-type=backend-services

# Check ingress external IP
kubectl get ingress dev-sponspay-webapp-ingress -n sponspay-dev

# Check SSL certificate status
kubectl get managedcertificate dev-sponspay-webapp-cert -n sponspay-dev
```

## Troubleshooting

### If OAuth brand creation fails:
- Ensure you have the correct permissions in the Google Cloud project
- Make sure the OAuth consent screen is fully configured
- Try refreshing the Google Cloud Console and checking again

### If backend service is not found:
- Wait longer for the ingress to be fully provisioned
- Check ingress events: `kubectl describe ingress dev-sponspay-webapp-ingress -n sponspay-dev`
- Verify the ingress has an external IP assigned

### If IAP policy fails:
- Ensure the backend service exists
- Check that you have IAP admin permissions
- Verify the policy YAML syntax is correct

## Testing

Once everything is set up:

1. Wait for SSL certificate to be provisioned (10-15 minutes)
2. Ensure DNS points dev.sponspay.com to the external IP
3. Visit https://dev.sponspay.com
4. You should be redirected to Google login
5. Only users with @sponspay.com emails should be able to access the site

## Cleanup (if needed)

To remove IAP:

```bash
# Remove IAP from backend config
kubectl patch backendconfig dev-sponspay-webapp-config -n sponspay-dev \
    --type='json' -p='[{"op": "remove", "path": "/spec/iap"}]'

# Delete OAuth secret
kubectl delete secret oauth-client-secret -n sponspay-dev
