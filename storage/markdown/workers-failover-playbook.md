# Workers Failover Playbook - Cloudless.gr
*Generated: 2026-07-17 - Completing todo.txt line 168*

## Overview
Procedure for failing over from Pi cluster (omv) to Cloudflare Workers when infrastructure becomes unavailable.

---

## Failover Triggers

### When to Failover
- omv node unreachable (SSH down, k3s down)
- Traefik/proxy returning 502/503 consistently
- Critical services (EspoCRM, AppFlowy) in CrashLoopBackOff
- Ongoing incident affecting production availability

### Detection
```bash
# Automated check (run every 5 minutes)
#!/bin/bash
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://cloudless.gr/api/health)
if [ "$HEALTH" != "200" ]; then
    curl -X POST https://cloudless.gr/api/webhooks/admin-alert \
      -d '{"severity":"high","message":"Primary cluster unhealthy - failover may be needed"}'
fi
```

---

## Pre-Failover Checklist

### Verify Workers Readiness
- [ ] Workers deployment active and healthy
- [ ] `/api/health` returns 200
- [ ] `/api/auth/session` returns 200
- [ ] R2 buckets accessible
- [ ] D1 database connected

### Verify Cloudflare LB (Phase 0)
```bash
# Check if Cloudflare Load Balancer is configured
pnpm wrangler kv:key list --binding lb-config

# Verify health checks configured
curl -H "Authorization: Bearer $CF_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/load_balancers/pools
```

---

## Failover Procedure

### Option A: Cloudflare Load Balancer Failover (Automated)
```bash
# If Cloudflare LB is set up (apply-cloudflare-lb.yml)
# Health check failure automatically routes to backup pool

# Verify LB status:
curl -H "Authorization: Bearer $CF_API_TOKEN" \
  https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records
```

### Option B: Manual DNS Switch
```bash
# 1. Check current DNS
dig cloudless.gr +short

# 2. Update CNAME to point to Workers
# Via Cloudflare API:
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"type":"CNAME","name":"cloudless.gr","content":"workers.dev","proxied":true}'
```

### Option C: Emergency Static Mode
```bash
# If Workers has minimal endpoints:
# Deploy emergency Worker with essential routes
pnpm wrangler deploy --config wrangler.emergency.json

# Routes to configure in emergency:
# - /api/contact (store events to R2, process later)
# - /api/health (static response)
# - /api/auth/* (basic session check)
```

---

## Post-Failover Verification

### Essential Endpoint Checks
```bash
# 1. Health check
curl https://cloudless.gr/api/health

# 2. Auth check
curl https://cloudless.gr/api/auth/session

# 3. Contact form (if user-facing)
curl -X POST https://cloudless.gr/api/contact -d '{"email":"test@test.com"}'

# 4. Analytics ingestion
curl https://cloudless.gr/api/analytics/r2 -I
```

### Verify Data Flow
```bash
# Check if events are being stored
pnpm wrangler r2 list cloudless-analytics --prefix events/

# Check D1 connection
pnpm wrangler d1 execute user-auth-db --command="SELECT 1" --remote
```

---

## Failback Procedure

### When to Failback
- omv node recovered and healthy
- All services running normally
- k3s cluster stable for 24 hours

### Steps
```bash
# 1. Verify cluster health
kubectl get nodes
kubectl get pods -A

# 2. Wait for DNS cache to clear (TTL 300s)
sleep 300

# 3. Switch DNS back to Pi cluster
# Same Cloudflare API call, but point to omv IP

# 4. Verify traffic moved
dig cloudless.gr +short
# Should show 192.168.1.128 (omv)
```

---

## Monitoring During Failover

### Key Metrics to Watch
```bash
# Workers invocations (free tier limit: 100K/day)
pnpm wrangler tail --format events

# R2 operations
# Monitor via Cloudflare dashboard

# D1 queries
pnpm wrangler d1 list

# Tailscale connectivity
# Check from both omv and omv-ha nodes
```

### Slack Notifications
```bash
# Alert channel #alerts receives failover events
curl -X POST https://cloudless.gr/api/webhooks/admin-alert \
  -d '{"severity":"info","message":"Failover activated - traffic to Workers"}'

curl -X POST https://cloudless.gr/api/webhooks/admin-alert \
  -d '{"severity":"info","message":"Failback completed - traffic to Pi cluster"}'
```

---

## Runbook Integration

### Daily Check Items
```bash
# Add to daily checks (todo.txt line 173)
echo "=== Failover Readiness Check ==="

# Workers health
curl -sf https://cloudless.gr/api/health || echo "Workers unreachable"

# LB status (if configured)
curl -sf https://api.cloudflare.com/client/v4/user/load_balancers/pools || echo "LB check failed"

# Tailnet connectivity
tailscale status --json | jq '.Peer[] | select(.Name=="omv") | .Status'
```

---

## Testing Failover

### Monthly Drill (per cluster-operations-runbook.md)
```bash
# .github/workflows/failover-drill.yml
# Set to dry-run mode initially:
# - Check script commands
# - Verify Workers deployment
# - Test without actual DNS change

# Production drill requires:
# - Cloudflare LB configured
# - Backup pool with Workers origin
```

### Manual Test
```bash
# 1. Create test endpoint on Workers
# 2. Temporarily modify local /etc/hosts
echo "127.0.0.1 cloudless.gr" >> /etc/hosts

# 3. Test failover flow
# 4. Remove hosts entry
```

---

## Related Documentation
- [Cluster Operations Runbook](./cluster-operations-runbook.md) - omv details
- [Cloudflare Map](./cloudflare-map.md) - Workers deployment
- [Troubleshooting Guide](./troubleshooting-guide.md) - Common failover issues

---

## Next Actions
- [x] Document failover procedure
- [ ] Configure Cloudflare Load Balancer (requires CLOUDFLARE_API_TOKEN)
- [ ] Add failover health check to daily script
- [ ] Test monthly failover drill in dry-run mode