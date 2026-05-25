# SponsPay API Kubernetes Deployment

This directory contains Kubernetes manifests organized using Kustomize for environment-specific deployments.

## Directory Structure

```
k8s/
├── base/                           # Base configuration (shared across environments)
│   ├── deployment.yaml            # Base deployment configuration
│   ├── service.yaml               # Base service configuration
│   ├── backendconfig.yaml         # GCP BackendConfig for health checks
│   ├── pgadmin-configmap.yaml     # pgAdmin server configuration template
│   ├── pgadmin-deployment.yaml    # pgAdmin deployment
│   ├── pgadmin-service.yaml       # pgAdmin service
│   └── kustomization.yaml         # Base kustomization file
├── environments/
│   ├── dev/                       # Development environment
│   │   ├── kustomization.yaml     # Dev-specific kustomization
│   │   ├── ingress.yaml           # Dev ingress (api-dev.sponspay.com)
│   │   ├── managedcertificate.yaml # Dev SSL certificate
│   │   ├── deployment-patch.yaml  # Dev-specific deployment overrides
│   │   ├── service-patch.yaml     # Dev-specific service overrides
│   │   └── namespace.yaml         # Dev namespace
│   └── prod/                      # Production environment
│       ├── kustomization.yaml     # Prod-specific kustomization
│       ├── ingress.yaml           # Prod ingress (api.sponspay.com)
│       ├── managedcertificate.yaml # Prod SSL certificate
│       ├── deployment-patch.yaml  # Prod-specific deployment overrides
│       ├── service-patch.yaml     # Prod-specific service overrides
│       └── namespace.yaml         # Prod namespace
└── README.md                      # This file
```

## Prerequisites

1. **kubectl** - Kubernetes command-line tool
2. **kustomize** - Built into kubectl (v1.14+) or install separately
3. **GKE cluster** - Google Kubernetes Engine cluster
4. **Static IP addresses** - Reserved for each environment
5. **Container images** - Built and pushed to Google Container Registry

## Environment Configuration

### Development Environment
- **Namespace**: `sponspay-api-dev`
- **Domain**: `api-dev.sponspay.com`
- **Replicas**: 1
- **Resources**: 50m CPU, 128Mi memory (requests)
- **Image Tag**: `dev-latest`
- **Static IP**: `dev-sponspay-api-ip`

### Production Environment
- **Namespace**: `sponspay-api-prod`
- **Domain**: `api.sponspay.com`
- **Replicas**: 3 (High Availability)
- **Resources**: 200m CPU, 256Mi memory (requests)
- **Image Tag**: `prod-latest`
- **Static IP**: `prod-sponspay-api-ip`

## Deployment Commands

### Deploy to Development
```bash
# Preview what will be deployed
kubectl kustomize k8s/environments/dev

# Apply to development
kubectl apply -k k8s/environments/dev

# Check deployment status
kubectl get pods -n sponspay-api-dev
kubectl get ingress -n sponspay-api-dev
```

### Deploy to Production
```bash
# Preview what will be deployed
kubectl kustomize k8s/environments/prod

# Apply to production
kubectl apply -k k8s/environments/prod

# Check deployment status
kubectl get pods -n sponspay-api-prod
kubectl get ingress -n sponspay-api-prod
```

### Update Image Tags
```bash
# Update dev image
cd k8s/environments/dev
kustomize edit set image us-east1-docker.pkg.dev/sponspay-deployment/sponspay-dev/api:dev-v1.2.3

# Update prod image
cd k8s/environments/prod
kustomize edit set image us-east1-docker.pkg.dev/sponspay-deployment/sponspay-dev/api:prod-v1.2.3
```

## Pre-deployment Setup

### 1. Create Namespaces
```bash
kubectl create namespace sponspay-api-dev
kubectl create namespace sponspay-api-prod
```

### 2. Reserve Static IP Addresses
```bash
# Development
gcloud compute addresses create dev-sponspay-api-ip --global

# Production
gcloud compute addresses create prod-sponspay-api-ip --global
```

### 3. Build and Push Container Images
```bash
# Build development image
docker build -t us-east1-docker.pkg.dev/sponspay-deployment/sponspay-dev/api:dev-latest .
docker push us-east1-docker.pkg.dev/sponspay-deployment/sponspay-dev/api:dev-latest

# Build production image
docker build -t us-east1-docker.pkg.dev/sponspay-deployment/sponspay-dev/api:prod-latest .
docker push us-east1-docker.pkg.dev/sponspay-deployment/sponspay-dev/api:prod-latest
```

## Monitoring and Troubleshooting

### Check Pod Status
```bash
# Development
kubectl get pods -n sponspay-api-dev
kubectl logs -f deployment/dev-sponspay-api -n sponspay-api-dev

# Production
kubectl get pods -n sponspay-api-prod
kubectl logs -f deployment/prod-sponspay-api -n sponspay-api-prod
```

### Check Ingress and Certificates
```bash
# Development
kubectl describe ingress dev-sponspay-api-ingress -n sponspay-api-dev
kubectl describe managedcertificate dev-sponspay-api-cert -n sponspay-api-dev

# Production
kubectl describe ingress prod-sponspay-api-ingress -n sponspay-api-prod
kubectl describe managedcertificate prod-sponspay-api-cert -n sponspay-api-prod
```

### Check Service and Backend Configuration
```bash
# Development
kubectl describe service dev-sponspay-api-service -n sponspay-api-dev
kubectl describe backendconfig dev-sponspay-api-config -n sponspay-api-dev

# Production
kubectl describe service prod-sponspay-api-service -n sponspay-api-prod
kubectl describe backendconfig prod-sponspay-api-config -n sponspay-api-prod
```

## API-Specific Configuration

### Health Check Endpoint
The API must expose a `/health` endpoint that returns HTTP 200 for successful health checks.

### Environment Variables
- **NODE_ENV**: Set to "development" or "production"
- **PORT**: API server port (default: 3000)
- **LOG_LEVEL**: Logging level ("debug" for dev, "info" for prod)

### Security
- Containers run as non-root user (UID 1000)
- All capabilities dropped for enhanced security
- Resource limits enforced to prevent resource exhaustion

## CI/CD Integration

### GitHub Actions Workflow

The repository includes a GitHub Actions workflow (`.github/workflows/ci.yaml`) that automatically deploys based on branch:

- **`dev` branch** → Development environment (`api-dev.sponspay.com`)
- **`main` branch** → Production environment (`api.sponspay.com`)

#### Workflow Features:
- **Automatic Environment Detection**: Determines target environment based on branch
- **Dynamic Image Tagging**: Uses commit SHA for unique image tags
- **Namespace Management**: Automatically creates namespaces if they don't exist
- **Deployment Monitoring**: Waits for rollout completion and shows status
- **Comprehensive Logging**: Detailed deployment information and status

#### Workflow Steps:
1. **Build & Push**: Docker image built and pushed to Google Artifact Registry
2. **Update Kustomization**: Image tag updated in environment-specific kustomization
3. **Deploy**: Kubernetes resources applied using `kubectl apply -k`
4. **Monitor**: Deployment status monitored and reported

## Migration from Old Structure

The old single `k8s-deployment.yaml` file has been replaced with this structured approach. To migrate:

1. Deploy using new structure: `kubectl apply -k k8s/environments/dev`
2. Verify everything works correctly
3. Remove old deployment: `kubectl delete -f k8s-deployment.yaml`
4. Archive old file: `mv k8s-deployment.yaml k8s-deployment.yaml.backup`

## Customization

### Adding New Environments
1. Create new directory under `k8s/environments/`
2. Copy and modify files from existing environment
3. Update domains, image tags, and resource requirements
4. Create necessary GCP resources (static IP, etc.)

### Modifying Base Configuration
- Edit files in `k8s/base/` to change shared configuration
- Changes will apply to all environments
- Test in development before applying to production

### Environment-Specific Overrides
- Use patch files in environment directories
- Strategic merge patches for complex changes
- JSON patches for simple field replacements

## Security Considerations

- **Separate namespaces** isolate environments
- **Different image tags** prevent accidental deployments
- **Resource limits** prevent resource exhaustion
- **Health checks** ensure application availability
- **SSL certificates** managed by Google Cloud
- **Non-root containers** for enhanced security
