# SponsPay WebApp Kubernetes Deployment

This directory contains Kubernetes manifests organized using Kustomize for environment-specific deployments.

## Directory Structure

```
k8s/
├── base/                           # Base configuration (shared across environments)
│   ├── deployment.yaml            # Base deployment configuration
│   ├── service.yaml               # Base service configuration
│   ├── backendconfig.yaml         # GCP BackendConfig for health checks
│   └── kustomization.yaml         # Base kustomization file
├── environments/
│   ├── dev/                       # Development environment
│   │   ├── kustomization.yaml     # Dev-specific kustomization
│   │   ├── ingress.yaml           # Dev ingress (dev.sponspay.com)
│   │   ├── managedcertificate.yaml # Dev SSL certificate
│   │   ├── deployment-patch.yaml  # Dev-specific deployment overrides
│   │   └── service-patch.yaml     # Dev-specific service overrides
│   └── prod/                      # Production environment
│       ├── kustomization.yaml     # Prod-specific kustomization
│       ├── ingress.yaml           # Prod ingress (sponspay.com)
│       ├── managedcertificate.yaml # Prod SSL certificate
│       ├── deployment-patch.yaml  # Prod-specific deployment overrides
│       └── service-patch.yaml     # Prod-specific service overrides
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
- **Namespace**: `sponspay-dev`
- **Domain**: `dev.sponspay.com`
- **Replicas**: 1
- **Resources**: 100m CPU, 256Mi memory (requests)
- **Image Tag**: `dev-latest`
- **Static IP**: `dev-sponspay-ip`

### Production Environment
- **Namespace**: `sponspay-prod`
- **Domain**: `sponspay.com`, `www.sponspay.com`
- **Replicas**: 3 (High Availability)
- **Resources**: 200m CPU, 512Mi memory (requests)
- **Image Tag**: `prod-latest`
- **Static IP**: `prod-sponspay-ip`

## Deployment Commands

### Deploy to Development
```bash
# Preview what will be deployed
kubectl kustomize k8s/environments/dev

# Apply to development
kubectl apply -k k8s/environments/dev

# Check deployment status
kubectl get pods -n sponspay-dev
kubectl get ingress -n sponspay-dev
```

### Deploy to Production
```bash
# Preview what will be deployed
kubectl kustomize k8s/environments/prod

# Apply to production
kubectl apply -k k8s/environments/prod

# Check deployment status
kubectl get pods -n sponspay-prod
kubectl get ingress -n sponspay-prod
```

### Update Image Tags
```bash
# Update dev image
cd k8s/environments/dev
kustomize edit set image us-east1-docker.pkg.dev/sponspay-deployment/sponspay/webapp:dev-v1.2.3

# Update prod image
cd k8s/environments/prod
kustomize edit set image us-east1-docker.pkg.dev/sponspay-deployment/sponspay/webapp:prod-v1.2.3
```

## Pre-deployment Setup

### 1. Create Namespaces
```bash
kubectl create namespace sponspay-dev
kubectl create namespace sponspay-prod
```

### 2. Reserve Static IP Addresses
```bash
# Development
gcloud compute addresses create dev-sponspay-ip --global

# Production
gcloud compute addresses create prod-sponspay-ip --global
```

### 3. Build and Push Container Images
```bash
# Build development image
docker build -t us-east1-docker.pkg.dev/sponspay-deployment/sponspay/webapp:dev-latest .
docker push us-east1-docker.pkg.dev/sponspay-deployment/sponspay/webapp:dev-latest

# Build production image
docker build -t us-east1-docker.pkg.dev/sponspay-deployment/sponspay/webapp:prod-latest .
docker push us-east1-docker.pkg.dev/sponspay-deployment/sponspay/webapp:prod-latest
```

## Monitoring and Troubleshooting

### Check Pod Status
```bash
# Development
kubectl get pods -n sponspay-dev
kubectl logs -f deployment/dev-sponspay-webapp -n sponspay-dev

# Production
kubectl get pods -n sponspay-prod
kubectl logs -f deployment/prod-sponspay-webapp -n sponspay-prod
```

### Check Ingress and Certificates
```bash
# Development
kubectl describe ingress dev-sponspay-webapp-ingress -n sponspay-dev
kubectl describe managedcertificate dev-sponspay-webapp-cert -n sponspay-dev

# Production
kubectl describe ingress prod-sponspay-webapp-ingress -n sponspay-prod
kubectl describe managedcertificate prod-sponspay-webapp-cert -n sponspay-prod
```

### Check Service and Backend Configuration
```bash
# Development
kubectl describe service dev-sponspay-webapp-service -n sponspay-dev
kubectl describe backendconfig dev-sponspay-webapp-config -n sponspay-dev

# Production
kubectl describe service prod-sponspay-webapp-service -n sponspay-prod
kubectl describe backendconfig prod-sponspay-webapp-config -n sponspay-prod
```

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

## CI/CD Integration

### GitHub Actions Workflow

The repository includes a GitHub Actions workflow (`.github/workflows/ci.yaml`) that automatically deploys based on branch:

- **`dev` branch** → Development environment (`dev.sponspay.com`)
- **`main` branch** → Production environment (`sponspay.com`)

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

#### Manual Deployment (Alternative)

For manual deployments, you can still use kubectl directly:

```bash
# Development
kubectl apply -k k8s/environments/dev

# Production  
kubectl apply -k k8s/environments/prod
```

Or use the provided deployment script:

```bash
# Development
./deploy.sh dev

# Production
./deploy.sh prod --dry-run  # Preview first
./deploy.sh prod            # Deploy
```

## Migration from Old Structure

The old single `k8s-deployment.yaml` file has been replaced with this structured approach. To migrate:

1. Deploy using new structure: `kubectl apply -k k8s/environments/dev`
2. Verify everything works correctly
3. Remove old deployment: `kubectl delete -f k8s-deployment.yaml`
4. Archive old file: `mv k8s-deployment.yaml k8s-deployment.yaml.backup`
