# Cloud Logging Guide for SponsPay API

## Quick Reference: GKE Log Filtering

### Filter by Namespace and Deployment

To view logs from your API deployment in a specific namespace (recommended - includes all pods across all replicas and replacements):

```
resource.type="k8s_container"
resource.labels.project_id="sponspay-deployment"
resource.labels.location="us-east1"
resource.labels.cluster_name="dev"
resource.labels.namespace_name="sponspay-api-dev"
labels."k8s-pod/app"="sponspay-api"
severity>=DEFAULT
```

**Alternative using pod name pattern:**
```
resource.type="k8s_container"
resource.labels.project_id="sponspay-deployment"
resource.labels.location="us-east1"
resource.labels.cluster_name="dev"
resource.labels.namespace_name="sponspay-api-dev"
resource.labels.pod_name=~"^sponspay-api-"
severity>=DEFAULT
```

**Note:** Using `labels."k8s-pod/app"="sponspay-api"` is preferred because:
- It uses the actual Kubernetes deployment label
- Works across pod replacements/restarts
- More explicit and maintainable
- Survives pod name changes

### Key Resource Types in GKE

- **`k8s_cluster`** - Cluster-level logs (what you're currently seeing)
- **`k8s_container`** - Container logs from your application (what you want)
- **`k8s_pod`** - Pod-level logs
- **`k8s_node`** - Node-level logs

## Common Query Patterns

### Development Environment Logs (All Pods)

**Using deployment label (Recommended):**
```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
labels."k8s-pod/app"="sponspay-api"
severity>=DEFAULT
```

**Using pod name pattern:**
```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
resource.labels.pod_name=~"^sponspay-api-"
severity>=DEFAULT
```

### Production Environment Logs (All Pods)

**Using deployment label (Recommended):**
```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-prod"
labels."k8s-pod/app"="sponspay-api"
severity>=DEFAULT
```

**Using pod name pattern:**
```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-prod"
resource.labels.pod_name=~"^sponspay-api-"
severity>=DEFAULT
```

### Specific Container in Pod

```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
resource.labels.container_name="api"
severity>=DEFAULT
```

### Errors Only (All Pods in Deployment)

```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
labels."k8s-pod/app"="sponspay-api"
severity>=ERROR
```

### Warnings and Above (All Pods in Deployment)

```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
labels."k8s-pod/app"="sponspay-api"
severity>=WARNING
```

### Last 1 Hour (All Pods)

```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
labels."k8s-pod/app"="sponspay-api"
severity>=DEFAULT
timestamp>="2025-01-01T00:00:00Z"
```

*Note: The GCP Console UI provides a time picker, so you typically don't need to specify timestamps manually.*

### Search for Specific Text in Logs (All Pods)

```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
labels."k8s-pod/app"="sponspay-api"
textPayload=~"Database connection"
```

Or for JSON logs:

```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
labels."k8s-pod/app"="sponspay-api"
jsonPayload.message=~"error"
```

### Filter by HTTP Status Code (if using structured logging)

```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
jsonPayload.statusCode>=500
```

## Available Label Filters

Here are the key labels you can filter on:

| Label | Description | Example Values |
|-------|-------------|----------------|
| `namespace_name` | Kubernetes namespace | `sponspay-api-dev`, `sponspay-api-prod` |
| `cluster_name` | GKE cluster name | `dev` |
| `location` | GCP region | `us-east1` |
| `project_id` | GCP project | `sponspay-deployment` |
| `pod_name` | Full pod name (specific instance) | `sponspay-api-7d9f8b5c6d-xyz12` |
| `container_name` | Container name | `api` |
| `labels."k8s-pod/app"` | **Deployment label (recommended)** | `sponspay-api` |

**Important:** Use `labels."k8s-pod/app"` to filter by deployment - this captures all pods including replaced/restarted ones!

## Operators

- `=` - Exact match
- `!=` - Not equal
- `=~` - Regular expression match
- `>`, `>=`, `<`, `<=` - Comparison (for numbers, timestamps)
- `AND`, `OR`, `NOT` - Boolean operators

## Severity Levels

From lowest to highest:
- `DEFAULT`
- `DEBUG`
- `INFO`
- `NOTICE`
- `WARNING`
- `ERROR`
- `CRITICAL`
- `ALERT`
- `EMERGENCY`

Your NestJS app currently logs with these levels: `error`, `warn`, `debug`, `fatal`, `log`, `verbose`

## Creating Saved Queries

In Cloud Logging Console:

1. Enter your query in the query builder
2. Click the **Actions** menu (three dots)
3. Select **Save query**
4. Give it a descriptive name (e.g., "Dev API Errors")
5. Access saved queries from the left sidebar

## Recommended Saved Queries

Create these for quick access:

### 1. Dev - All Deployment Logs
```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
labels."k8s-pod/app"="sponspay-api"
severity>=DEFAULT
```

### 2. Dev - Deployment Errors Only
```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
labels."k8s-pod/app"="sponspay-api"
severity>=ERROR
```

### 3. Prod - All Deployment Logs
```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-prod"
labels."k8s-pod/app"="sponspay-api"
severity>=DEFAULT
```

### 4. Prod - Deployment Errors and Warnings
```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-prod"
labels."k8s-pod/app"="sponspay-api"
severity>=WARNING
```

## Accessing Cloud Logging

### Via GCP Console

1. Go to https://console.cloud.google.com/
2. Select project: `sponspay-deployment`
3. Navigate to **Logging** > **Logs Explorer**
4. Enter your query in the query builder
5. Use the time selector to choose the time range

### Via gcloud CLI

```bash
# View recent logs from deployment (all pods)
gcloud logging read "resource.type=k8s_container AND resource.labels.namespace_name=sponspay-api-dev AND labels.k8s-pod/app=sponspay-api" \
  --limit 50 \
  --format json \
  --project sponspay-deployment

# Stream logs in real-time from deployment
gcloud logging tail "resource.type=k8s_container AND resource.labels.namespace_name=sponspay-api-dev AND labels.k8s-pod/app=sponspay-api" \
  --project sponspay-deployment

# Filter for errors from deployment
gcloud logging read "resource.type=k8s_container AND resource.labels.namespace_name=sponspay-api-dev AND labels.k8s-pod/app=sponspay-api AND severity>=ERROR" \
  --limit 50 \
  --project sponspay-deployment
```

### Via kubectl (Alternative)

While Cloud Logging is recommended, you can also use kubectl for live debugging:

```bash
# Get current pods
kubectl get pods -n sponspay-api-dev

# View logs from a specific pod
kubectl logs -n sponspay-api-dev sponspay-api-7d9f8b5c6d-xyz12

# Stream logs
kubectl logs -n sponspay-api-dev sponspay-api-7d9f8b5c6d-xyz12 -f

# Previous pod logs (if pod crashed)
kubectl logs -n sponspay-api-dev sponspay-api-7d9f8b5c6d-xyz12 --previous
```

## Advanced: Setting Up Log-Based Metrics

Create metrics from your logs for monitoring:

1. Go to **Logging** > **Logs-based Metrics**
2. Click **Create Metric**
3. Choose **Counter** or **Distribution**
4. Use a query like:
   ```
   resource.type="k8s_container"
   resource.labels.namespace_name="sponspay-api-prod"
   severity>=ERROR
   ```
5. Create alerts based on these metrics in Cloud Monitoring

## Cost Optimization Tips

1. **Use log exclusion filters** to avoid indexing verbose debug logs in production
2. **Set shorter retention** for DEBUG/INFO logs (keep errors longer)
3. **Export to Cloud Storage** for cheap long-term archival
4. **Sample high-volume logs** if you're approaching the 50 GB free tier

## Understanding Pod Labels vs Pod Names

### Why Use Deployment Labels?

When you use `labels."k8s-pod/app"="sponspay-api"`:
- ✅ Sees logs from ALL pods in the deployment
- ✅ Includes pods that were replaced during rollouts
- ✅ Includes pods that crashed and restarted
- ✅ Works with horizontal scaling (multiple replicas)
- ✅ More maintainable (based on deployment label)

When you use `resource.labels.pod_name=~"^sponspay-api-"`:
- ✅ Also captures all pods matching the pattern
- ⚠️ Relies on naming convention consistency
- ⚠️ May miss pods with unexpected naming

### How to Find Pod Labels

```bash
# Get pods and their labels
kubectl get pods -n sponspay-api-dev --show-labels

# Describe a specific pod to see all labels
kubectl describe pod -n sponspay-api-dev <pod-name>
```

Your deployment labels (from `k8s/base/deployment.yaml`):
- `app: sponspay-api` (main deployment label)
- `version: v1` (version label)

So you can also filter by version if needed:
```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
labels."k8s-pod/app"="sponspay-api"
labels."k8s-pod/version"="v1"
severity>=DEFAULT
```

## Next Steps: Structured Logging

To make your logs more queryable, consider adding structured logging to your NestJS app:

```typescript
// Example structured log
logger.log({
  message: 'User authenticated',
  userId: user.id,
  email: user.email,
  method: req.method,
  path: req.path,
  statusCode: 200,
  duration: 150
});
```

This allows queries like:
```
resource.type="k8s_container"
resource.labels.namespace_name="sponspay-api-dev"
jsonPayload.userId="12345"
```

## Troubleshooting

### No logs appearing?

1. **Check resource type**: Make sure you're using `k8s_container` not `k8s_cluster`
2. **Verify namespace**: Double-check the namespace name matches your deployment
3. **Check time range**: Logs might be outside your selected time window
4. **Verify cluster name**: Ensure you're looking at the right cluster (`dev` vs prod)

### Logs delayed?

- Cloud Logging typically has 10-30 second delay
- For real-time debugging, use `kubectl logs -f` instead

### Can't see old logs?

- Default retention is 30 days
- Check if logs were exported to Cloud Storage
- Verify the time range selector

## Resources

- [Cloud Logging Query Language](https://cloud.google.com/logging/docs/view/logging-query-language)
- [GKE Logging Best Practices](https://cloud.google.com/architecture/best-practices-for-operating-containers#logging)
- [Cloud Logging Pricing](https://cloud.google.com/stackdriver/pricing)
