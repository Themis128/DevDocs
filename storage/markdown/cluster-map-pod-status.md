# Cluster Pod Status Map - Detailed View
*Generated: 2026-07-17 - Completing todo.txt line 165*

## Overview
Live pod status mapping for cloudless.gr cluster, with details on resource usage, node affinity, and troubleshooting status.

---

## Current Pod Status (Per CLUSTER-MAP.md)

### Summary
| Namespace | Running | Pending | Issues |
|-----------|---------|---------|--------|
| `cloudless` | 7 | 0 | All healthy |
| `kube-system` | 5 | 0 | All healthy |
| `cert-manager` | 3 | 0 | All healthy |
| `monitoring` | 4 | 6 | Investigation needed |

---

## cloudless Namespace - Detailed

| Pod | Node | Status | CPU | Memory | Replicas |
|-----|------|--------|-----|--------|----------|
| cloudless-app-xxxxx | omv | Running | 100m | 256Mi | 5 |
| cloudless-app-xxxxx | omv | Running | 100m | 256Mi | 5 |
| cloudless-app-xxxxx | omv | Running | 100m | 256Mi | 5 |
| cloudless-app-xxxxx | omv | Running | 100m | 256Mi | 5 |
| cloudless-app-xxxxx | omv | Running | 100m | 256Mi | 5 |
| manager-xxxxx | omv | Running | 50m | 128Mi | 1 |
| sync-webhook-xxxxx | omv | Running | 25m | 64Mi | 1 |

### Recommended Optimization (todo.txt line 91)
Consider reducing cloudless-app from 5→3 replicas if traffic is low:
```bash
kubectl scale deployment cloudless-app -n cloudless --replicas=3
```

---

## monitoring Namespace - Investigation Needed

### Running Pods (4/10)
| Pod | Status | Resource Usage | Notes |
|-----|--------|---------------|-------|
| grafana-xxxxx | Running | CPU: 100m, Mem: 256Mi | ✅ Healthy |
| loki-xxxxx | Running | CPU: 150m, Mem: 384Mi | ✅ Healthy |
| mosquitto-xxxxx | Running | CPU: 50m, Mem: 128Mi | ✅ Healthy |
| blackbox-xxxxx | Running | CPU: 25m, Mem: 64Mi | ✅ Healthy |

### Pending/Terminating Pods (6/10)
| Pod | Status | Reason | Fix |
|-----|--------|--------|-----|
| prometheus-xxxxx | Pending | Insufficient memory | Apply `monitoring-node-selector-fix.yml` |
| alertmanager-xxxxx | Pending | Insufficient memory | Apply `monitoring-node-selector-fix.yml` |
| metoro-node-agent-xxxxx | CrashLoopBackOff | eBPF not supported on Pi kernel | Disable eBPF collection |
| cloudflare-geo-exporter-xxxxx | Terminating | Missing CLOUDFLARE_API_TOKEN | Create secret |
| kube-state-metrics-xxxxx | Pending | Node selector mismatch | Update deployment |
| node-exporter-xxxxx | Pending | Node selector mismatch | Update deployment |

---

## Resource Usage Analysis

### Node Capacity (omv - Pi 5, 8GB RAM)
```bash
# Check available resources
kubectl top nodes

# Typical output:
# NAME   CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
# omv    500m         12%    1500Mi          18%
```

### Pending Pod Diagnosis
```bash
# Check why pods are pending
kubectl describe pods -n monitoring | grep -A10 Events

# Common events:
# 0/1 nodes are available: 1 Insufficient memory
# 0/1 nodes are available: 1 node(s) didn't match node selector
```

---

## Node Affinity Configuration

### Current Selectors (monitoring namespace)
```bash
# Check node selectors
kubectl get deployment -n monitoring -o jsonpath='{range .items[*]}{.metadata.name}{" -> "}{.spec.template.spec.nodeSelector}{"\n"}{end}'
```

### Recommended Fix
Apply `infrastructure/monitoring/monitoring-node-selector-fix.yml`:
```yaml
# This YAML should set appropriate node selectors
# or resource limits to match Pi 5 capacity
```

---

## Pod Resource Requirements

### High Memory Pods (Problematic on Pi)
| Pod | Current Request | Recommended | Justification |
|-----|-----------------|-------------|---------------|
| prometheus | 512Mi | 256Mi | Can run with less on small cluster |
| alertmanager | 256Mi | 128Mi | Reduce for Pi capacity |
| metoro-node-agent | 128Mi | Remove | eBPF unsupported on Pi |

### Storage Requirements
| PVC | Size | Used | Backup Schedule |
|-----|------|------|-----------------|
| appflowy-pvc | 10Gi | ~40% | WAL-G continuous |
| espocrm-pvc | 20Gi | ~30% | Daily 03:45 UTC |
| postiz-pvc | 2Gi→20Gi | Growing | Update needed |
| meilisearch-pvc | 4Gi | ~10% | TBD |

---

## Health Check Commands

### Quick Status
```bash
# One-line cluster health
kubectl get pods -A | grep -E "(Error|CrashLoop|Pending)"

# Detailed monitoring status
kubectl get pods -n monitoring -o wide

# Check specific failing pods
kubectl logs -n monitoring -l app=metoro-node-agent --tail=50
kubectl logs -n monitoring -l app=cloudflare-geo-exporter --tail=50
```

### Resource Check
```bash
# Memory pressure on nodes
kubectl describe nodes | grep -A5 "MemoryPressure\|DiskPressure"

# Resource requests vs capacity
kubectl top pods -n monitoring
```

---

## Alerting Configuration

### Monitoring Pod Failures
```yaml
# Alert rule in PrometheusRule
- alert: MonitoringPodsDown
  expr: kube_pod_status_ready{namespace="monitoring", condition!="true"} == 1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Monitoring pods not ready in cloudless.gr"
```

### Slack Integration
- Channel: `#alerts`
- Webhook: `/api/webhooks/admin-alert`
- Trigger: Any pod in CrashLoopBackOff for >5 min

---

## Related Documentation
- [CLUSTER-MAP.md](./CLUSTER-MAP.md) - Quick status overview
- [Cluster Operations Runbook](./cluster-operations-runbook.md) - Procedures
- [Troubleshooting Guide](./troubleshooting-guide.md) - Common issues
- [Cloudflare Map](./cloudflare-map.md) - Workers as backup target

---

## Next Actions - Step-by-Step Procedures

### 1. Apply monitoring-node-selector-fix.yml
**Purpose:** Fix pending Prometheus/Alertmanager pods due to memory constraints

```bash
# First, diagnose the issue
kubectl describe pods -n monitoring | grep -A10 Events | grep -i "Insufficient memory"

# Get current node selectors
kubectl get deployment -n monitoring -o jsonpath='{range .items[*]}{.metadata.name}{" -> "}{.spec.template.spec.nodeSelector}{"\n"}{end}'

# Apply the fix (if file exists)
kubectl apply -f infrastructure/monitoring/monitoring-node-selector-fix.yml

# Or manually patch deployments
kubectl patch deployment prometheus -n monitoring -p '{"spec":{"template":{"spec":{"nodeSelector":{"kubernetes.io/os":"linux"}},"resources":{"requests":{"memory":"256Mi"}}}}}'
kubectl patch deployment alertmanager -n monitoring -p '{"spec":{"template":{"spec":{"nodeSelector":{"kubernetes.io/os":"linux"}},"resources":{"requests":{"memory":"128Mi"}}}}}'

# Verify pods start
kubectl get pods -n monitoring -w
```

### 2. Disable metoro-node-agent eBPF on Pi
**Purpose:** Stop CrashLoopBackOff due to unsupported kernel features

```bash
# Option A: Scale down (simplest)
kubectl scale daemonset -n monitoring metoro-node-agent --replicas=0

# Option B: Add node affinity to skip Pi nodes
kubectl patch daemonset -n monitoring metoro-node-agent -p '{"spec":{"template":{"spec":{"nodeSelector":{"metoro.io/ebpf-supported":"true"}}}}}'

# Option C: Label omv-ha to skip
kubectl label nodes omv-ha metoro.io/skip=true --overwrite

# Verify pods are not crashing
kubectl get pods -n monitoring -w
```

### 3. Create CLOUDFLARE_API_TOKEN secret
**Purpose:** Fix cloudflare-geo-exporter termination

```bash
# Create secret from environment
kubectl create secret generic cloudflare-api-token \
  --from-literal=token="${CLOUDFLARE_API_TOKEN}" \
  -n monitoring --dry-run=client -o yaml | kubectl apply -f -

# Verify secret exists
kubectl get secret -n monitoring cloudflare-api-token

# Check deployment uses correct secret name
kubectl get deployment -n monitoring -l app=cloudflare-geo-exporter -o jsonpath='{.items[0].spec.template.spec.containers[0].env}'

# Verify pods start
kubectl get pods -n monitoring -l app=cloudflare-geo-exporter -w
```

### 4. Update Postiz PVC to 20Gi
**Purpose:** Increase storage for media uploads

```bash
# Check current PVC status
kubectl get pvc -n cloudless postiz-pvc

# Patch PVC size (requires storage class support for expansion)
kubectl patch pvc postiz-pvc -n cloudless -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'

# Or recreate with larger size if needed
kubectl delete pvc postiz-pvc -n cloudless
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postiz-pvc
  namespace: cloudless
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
EOF

# Verify size change
kubectl get pvc -n cloudless postiz-pvc
```

---

## Next Actions Checklist
- [ ] Apply monitoring-node-selector-fix.yml
- [ ] Disable metoro-node-agent eBPF on Pi
- [ ] Create CLOUDFLARE_API_TOKEN secret
- [ ] Update Postiz PVC to 20Gi