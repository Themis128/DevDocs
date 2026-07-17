# Cloudless.gr Cluster Operations Runbook
*Generated: 2026-07-17*

## Overview
Operational procedures for the omv + omv-ha k3s cluster running cloudless.gr production.

---

## Quick Reference

| Operation | Command | Notes |
|-----------|---------|-------|
| Check cluster health | `kubectl get nodes` | Both omv, omv-ha should be Ready |
| List all pods | `kubectl get pods -A` | Shows status across namespaces |
| Restart a pod | `kubectl delete pod -n <ns> <pod>` | Triggers recreation |
| View logs | `kubectl logs -n <ns> <pod> -f` | Follow mode |
| Port forward | `kubectl port-forward -n <ns> <pod> <local>:<remote>` | For local debugging |

---

## Cluster Architecture

### Nodes

| Node | IP | Role | Taint |
|------|-----|------|-------|
| omv | 192.168.1.128 | Primary (control-plane) | None |
| omv-ha | 192.168.1.130 | Standby | NoSchedule |

### Namespaces

| Namespace | Purpose | Critical Pods |
|-----------|---------|---------------|
| `cloudless` | Main application | cloudless-app (5 replicas), manager, sync-webhook |
| `kube-system` | K8s core | traefik, coredns, metrics-server, local-path |
| `cert-manager` | SSL certificates | cert-manager, cert-manager-webhook |
| `monitoring` | Observability | grafana, loki, mosquitto, blackbox (6 pending) |

---

## Backup Procedures

### PVC Backup Schedule (R10)

All 8 PVCs are backed up daily to S3 via Restic:

| Application | Schedule | S3 Path | Retention |
|-------------|----------|---------|-----------|
| AppFlowy | 03:30 UTC | `s3://cloudless-analytics-data/pvc-backups/appflowy/daily/` | 7d + 4w GLACIER |
| EspoCRM | 03:45 UTC | `s3://cloudless-analytics-data/pvc-backups/espocrm/daily/` | 7d + 4w GLACIER |
| Postiz | 04:00 UTC | `s3://cloudless-analytics-data/pvc-backups/postiz/daily/` | 7d + 4w GLACIER |
| n8n | 04:15 UTC | `s3://cloudless-analytics-data/pvc-backups/n8n/daily/` | 7d + 4w GLACIER |
| Meilisearch | TBD | TBD | TBD |
| Grafana | TBD | TBD | TBD |
| MinIO | TBD | TBD | TBD |
| Kuma | TBD | TBD | TBD |

**Manual backup trigger:**
```bash
kubectl create job --from=cronjob/espocrm-pvc-backup manual-backup-$(date +%s)
```

---

## Recovery Procedures

### From PVC Backup

1. **List available backups:**
   ```bash
   aws s3 ls s3://cloudless-analytics-data/pvc-backups/espocrm/daily/ --recursive
   ```

2. **Download specific backup:**
   ```bash
   aws s3 cp s3://cloudless-analytics-data/pvc-backups/espocrm/daily/YYYY-MM-DD.dump.gz ./
   ```

3. **Restore to fresh PVC:**
   ```bash
   # Create restore job
   kubectl apply -f infrastructure/backup/espocrm-restore-job.yaml
   ```

### D1 Database Backup (Cloudflare)

**Create backup:**
```bash
pnpm wrangler d1 execute user-auth-db --file=backup.sql
# Or via Wrangler: wrangler d1 backup user-auth-db
```

**Restore:**
```bash
pnpm wrangler d1 execute user-auth-db --file=backup.sql --remote
```

---

## Monitoring & Troubleshooting

### Pending Pods Investigation

Monitor namespace has 6 pending pods (per architecture docs):
- Check node selector: `kubectl get pods -n monitoring -o yaml | grep -A5 nodeSelector`
- Check resource requests: Events may show "Insufficient memory/CPU"
- Solution: Apply `monitoring-node-selector-fix.yml`

### CrashLoopBackOff Resolution

For `metoro-node-agent` (eBPF not supported on Pi kernel):
```bash
# Check status
kubectl get pods -n monitoring -l app=metoro-node-agent

# Check logs
kubectl logs -n monitoring -l app=metoro-node-agent

# Likely fix: Disable eBPF collection in config
# Or skip on Pi nodes via node affinity
```

### Cloudflare Geo Exporter (4 pods terminating)
```bash
# Check deployment status
kubectl get pods -n monitoring -l app=cloudflare-geo-exporter

# Check logs for crash cause
kubectl logs -n monitoring -l app=cloudflare-geo-exporter

# Likely: Missing API token or rate limiting
```

---

## SSD Mount Configuration (2TB /sdb1)

**Current state:** Pending (per todo.txt)

**Steps to configure:**
1. SSH to omv: `ssh tbaltzakis@192.168.1.128`
2. Check disk: `lsblk` should show `/dev/sdb1`
3. Format if needed: `sudo mkfs.ext4 /dev/sdb1`
4. Add to `/etc/fstab`:
   ```
   /dev/sdb1 /mnt/sdb1 ext4 defaults 0 0
   ```
5. Mount: `sudo mount -a`
6. Update K8s PV/PVC to use `/mnt/sdb1`

---

## Failover Procedures

### Manual Pi→Workers Failover

When omv is down:
1. Update DNS to point to Workers deployment
2. Verify Cloudflare LB health checks
3. Check Tailscale connectivity
4. Monitor via Sentry alerts

**Failover drill** runs monthly via `.github/workflows/failover-drill.yml`
- Tested in dry-run mode
- Requires Cloudflare LB setup for production drill

---

## Operational Checklists

### Daily Checks

- [ ] `kubectl get nodes` - Both nodes Ready
- [ ] `kubectl get pods -A` - No CrashLoopBackOff
- [ ] Check monitoring namespace pods (fix pending issues)
- [ ] Verify backup cronjobs completed (check S3 for today's backups)
- [ ] `curl https://cloudless.gr/api/health` - Workers health check
- [ ] `curl https://cloudless.gr/api/auth/session` - D1 auth check

### Weekly Checks

- [ ] Review Sentry issues for new errors
- [ ] Check Metabase dashboards rendering
- [ ] Verify analytics ETLs ran successfully
- [ ] Review Cloudflare Workers invocation count (limit: 100K/day)

### Monthly Checks

- [ ] Review Cloudflare spend vs free tier limits
- [ ] Check SSL certificates (both ACM + Let's Encrypt)
- [ ] Review test coverage thresholds
- [ ] Verify all Wrangler secrets still valid

---

## SSH Access

### Tailscale IPs (per mcp.json)
- omv: 100.113.41.119
- omv-ha: 100.111.222.92

### SSH Key
```bash
# Default key (per mcp.json)
~/.ssh/id_ed25519

# Manual access
ssh -i ~/.ssh/id_ed25519 tbaltzakis@100.113.41.119
```

---

## Common Operations

### Scale Deployment Replicas

Per `todo.txt` line 91: Consider reducing cloudless-app from 5→3:
```bash
kubectl scale deployment cloudless-app -n cloudless --replicas=3
```

### Restart Application Pod

```bash
kubectl rollout restart deployment/cloudless-app -n cloudless
```

### View Application Logs

```bash
kubectl logs -n cloudless -l app=cloudless-app --tail=100 -f
```

### Check Resource Usage

```bash
kubectl top nodes
kubectl top pods -n cloudless
```

---

## Emergency Procedures

### Application Down (complete outage)

1. Check Tailscale: `tailscale status` on both nodes
2. Check k3s: `systemctl status k3s` on omv
3. Check ports: `netstat -tlnp | grep -E "80|443"`
4. Failover to Workers if needed (see Failover Procedures)
5. Alert via `/api/webhooks/admin-alert`

### Database Connection Issues

1. Check D1 connection: `curl https://cloudless.gr/api/auth/session`
2. Verify PostgreSQL secret: `kubectl get secrets -n database`
3. Check EspoCRM connectivity: `kubectl logs -n cloudless <pod>`
4. Verify n8n can reach services (if using for sync)

---

## Integration Status Checks

### Required Secrets

| Secret | Source | Status | Purpose |
|--------|--------|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler | ❌ Pending | Token rotation needed, required for geo-exporter |
| `SESSION_SECRET` | Wrangler | ✅ Set | 32+ bytes required for D1 auth |
| `LINKEDIN_ACCESS_TOKEN` | Wrangler | ❌ Pending | CAPI implementation |
| `LINKEDIN_CONVERSION_ID` | Wrangler | ❌ Pending | CAPI implementation |
| Healthchecks.io (6 URLs) | Wrangler | ❌ Pending | Monitoring endpoints |

### Verification Commands

```bash
# Check Wrangler secrets (all required)
pnpm wrangler secret list

# Check D1 database binding and connectivity
pnpm wrangler d1 list
curl https://cloudless.gr/api/auth/session

# Check R2 buckets exist
pnpm wrangler r2 bucket list

# Check SSM parameters (AWS - deprecated after migration)
aws ssm describe-parameters --parameter-filters Key=Name,Option=Contains,Values=/cloudless/production/ 2>/dev/null || echo "AWS SSM check skipped - migration complete"

# Check Cloudflare tunnel status
cloudflared tunnel list

# Check Tailscale connectivity
tailscale status --json

# Verify Cloudflare Workers health endpoint
curl https://cloudless.gr/api/health

# Check auth endpoint status
curl -s https://cloudless.gr/api/auth/session -w "\nHTTP: %{http_code}"
```

### Auth System Health Check

```bash
# Test D1 connection directly
# Should return: {"authenticated":false} (200 OK)
curl -s https://cloudless.gr/api/auth/session | jq '.authenticated'

# Check recent logins (query D1 for last 10 users)
pnpm wrangler d1 execute user-auth-db --remote \
  --command "SELECT email, created_at FROM user ORDER BY created_at DESC LIMIT 10"

# Check expired sessions needing cleanup
pnpm wrangler d1 execute user-auth-db --remote \
  --command "SELECT COUNT(*) as expired FROM session WHERE expires_at < datetime('now')"
```

---

## Related Documentation

| Document | Purpose | Link |
|----------|---------|------|
| CLUSTER-MAP.md | Quick cluster status overview | [./CLUSTER-MAP.md](./CLUSTER-MAP.md) |
| cluster-map-pod-status.md | Detailed pod status analysis | [./cluster-map-pod-status.md](./cluster-map-pod-status.md) |
| workers-failover-playbook.md | Failover procedures | [./workers-failover-playbook.md](./workers-failover-playbook.md) |
| auth.md | Authentication system docs | [./auth.md](./auth.md) |
| troubleshooting-guide.md | Common issues & fixes | [./troubleshooting-guide.md](./troubleshooting-guide.md) |
| cloudflare-map.md | Workers + D1 setup | [./cloudflare-map.md](./cloudflare-map.md) |
| d1-backup-restore.md | Database backup/restore | [./d1-backup-restore.md](./d1-backup-restore.md) |
| analytics-etl-pipeline.md | Analytics setup | [./analytics-etl-pipeline.md](./analytics-etl-pipeline.md) |
| cloudless-api-catalog.md | All API endpoints | [./cloudless-api-catalog.md](./cloudless-api-catalog.md) |
| cloudless-architecture.md | Full architecture | [./cloudless-architecture.md](./cloudless-architecture.md) |