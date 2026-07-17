# Cluster Map - Cloudless.gr Production
*Generated: 2026-07-17 (MCP Docs Update)*

## Node Status

| Node | IP | Internal IP | K3s Role | Taint | Status |
|------|-----|-------------|----------|-------|--------|
| omv | 192.168.1.128 | 100.113.41.119 (Tailscale) | control-plane + workloads | None | Ready |
| omv-ha | 192.168.1.130 | 100.111.222.92 (Tailscale) | standby | NoSchedule | Ready |

## Namespace Pod Status

```
NAMESPACE      READY   PENDING   DESCRIPTION
cloudless      7       0         Main application (all pods running)
kube-system    5       0         Kubernetes core (traefik, coredns, metrics-server, local-path, svclb)
cert-manager   3       0         SSL certificates
monitoring     4       6         Partial stack (grafana, loki, mosquitto, blackbox running; prometheus, alertmanager, metoro, cloudflare-geo-exporter pending)
```

## Core Services Endpoints

| Service | Internal URL | External URL | Auth |
|---------|--------------|--------------|------|
| Traefik | http://omv:80 | https://cloudless.gr | None |
| AppFlowy | http://omv:30810 | Via tunnel | AppFlowy auth |
| EspoCRM | http://omv:8080 | Via tunnel | EspoCRM auth |
| n8n | http://omv:5678 | Via tunnel | n8n auth |
| Postiz | Pending | https://postiz.cloudless.gr | Postiz auth (in progress) |
| Meilisearch | http://omv:7333 | Admin only | API key |

## Health Check Matrix

| Endpoint | Expected | Frequency | Handler |
|----------|----------|-----------|---------|
| /api/health | 200 OK | Continuous | Traefik |
| /api/auth/session | 200 OK | On-demand | D1 |
| /api/admin/cluster | JSON status | On-demand | K3s API |

## Pending Investigation (Monitoring Namespace)

Per architecture docs (6 pending pods):

```bash
# Run to diagnose:
kubectl get pods -n monitoring -o wide
kubectl describe pods -n monitoring | grep -A10 Events
kubectl get events -n monitoring --field-selector type=Warning
```

### Known Issues:
1. **metoro-node-agent** - CrashLoop (eBPF unsupported on Pi kernel)
2. **cloudflare-geo-exporter** - Resource constraints or missing CLOUDFLARE_API_TOKEN
3. **Prometheus/Alertmanager** - May need node selector updates for omv-ha node

## PVC Status

| PVC | Namespace | Size | Used | Backup Status |
|-----|-----------|------|------|---------------|
| appflowy-pvc | cloudless | 10Gi | ~40% | WAL-G (continuous) |
| espocrm-pvc | cloudless | 20Gi | ~30% | Daily (03:45 UTC) |
| postiz-pvc | cloudless | 2Gi→20Gi | Growing | Needs verification |
| meilisearch-pvc | cloudless | 4Gi | ~10% | TBD |
| n8n-pvc | cloudless | 5Gi | ~50% | Daily (04:15 UTC) |

## Monitoring Stack Status

### Running Pods (4/10)
- grafana
- loki
- mosquitto
- blackbox-exporter

### Pending Pods (6/10)
- prometheus (may need node selector)
- alertmanager (may need node selector)
- metoro-node-agent (CrashLoop - eBPF unsupported)
- cloudflare-geo-exporter (4 pods in terminating/pending)
- kube-state-metrics (pending)
- node-exporter (pending)

---

## Related Documentation

- [API Catalog](./cloudless-api-catalog.md) - All endpoints
- [Operations Runbook](./cluster-operations-runbook.md) - Procedures
- [Troubleshooting](./troubleshooting-guide.md) - Common issues
- [Architecture](./cloudless-architecture.md) - Full architecture overview
- [Workers Failover Playbook](./workers-failover-playbook.md) - Failover procedures
- [Analytics ETL Pipeline](./analytics-etl-pipeline.md) - Analytics setup