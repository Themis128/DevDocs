# Cloudless.gr Troubleshooting Guide
*Generated: 2026-07-17 - Updated*

## Overview
Common issues and resolution paths for cloudless.gr infrastructure and application.

---

## 🔴 Critical Issues

### Application Not Loading (503/502)

**Symptoms:** `curl cloudless.gr` returns 503 or 502

**Diagnosis:**
```bash
# 1. Check cluster nodes
kubectl get nodes
# Expected: Both omv (Ready) and omv-ha (Ready)

# 2. Check application pods
kubectl get pods -n cloudless
# Expected: All cloudless-app pods Running

# 3. Check Traefik
kubectl get pods -n kube-system -l app=traefik
# Expected: Traefik pod Running

# 4. Check k3s service
ssh tbaltzakis@192.168.1.128 "systemctl status k3s"
```

**Resolution:**
- If nodes down: SSH and restart k3s: `sudo systemctl restart k3s`
- If pods CrashLoop: Check logs `kubectl logs -n cloudless <pod-name>`
- If Traefik down: `kubectl rollout restart deployment/traefik -n kube-system`

---

### SSL Certificate Expired

**Symptoms:** Browser shows "Not Secure" or certificate warning

**Diagnosis:**
```bash
# Check cert-manager status
kubectl get pods -n cert-manager
kubectl get certificates -n cert-manager

# Check specific certificate
kubectl describe certificate <cert-name> -n cert-manager
```

**Resolution:**
- Force renewal: `kubectl delete certificate <name> -n cert-manager`
- Check ACM in AWS console (for Workers): `aws acm list-certificates`
- Verify Let's Encrypt isn't rate-limited

---

## 🟠 Monitoring Issues

### Monitoring Namespace: 6 Pending Pods

**Per architecture docs: R4 - monitoring namespace has 4 running, 6 pending**

**Common causes:**
1. Insufficient memory on Pi (8GB limit)
2. Node selector mismatch (pods targeted to wrong node)
3. Missing PVCs

**Resolution:**
```bash
# Check events for pending pods
kubectl get events -n monitoring --field-selector type=Warning

# Check node selectors
kubectl get deployment -n monitoring -o jsonpath='{range .items[*]}{.metadata.name}{" -> "}{.spec.template.spec.nodeSelector}{"\n"}{end}'

# Apply node selector fix
kubectl apply -f infrastructure/monitoring/monitoring-node-selector-fix.yml
```

---

### Metoro Node Agent CrashLoopBackOff

**Cause:** eBPF not supported on Pi kernel (per todo.txt line 21)

**Resolution:**
```bash
# Disable eBPF in config or add node affinity
kubectl patch daemonset -n monitoring metoro-node-agent -p '{"spec":{"template":{"spec":{"nodeSelector":{"kubernetes.io/os":"linux","metoro.io/ebpf-supported":"true"}}}}}'

# Or scale to 0 on Pi nodes
kubectl scale daemonset -n monitoring metoro-node-agent --replicas=0
kubectl label nodes omv-ha metoro.io/skip=true --overwrite
```

---

### Cloudflare Geo Exporter Scaling Issues

**Cause:** 4 pods in terminating/pending state

**Resolution:**
```bash
# Check deployment
kubectl get deployment -n monitoring -l app=cloudflare-geo-exporter

# Check secret
kubectl get secret -n monitoring cloudflare-api-token

# Update secret if missing
kubectl create secret generic cloudflare-api-token --from-literal=token="${CLOUDFLARE_API_TOKEN}" -n monitoring --dry-run=client -o yaml | kubectl apply -f -

# Check rate limits in logs
kubectl logs -n monitoring -l app=cloudflare-geo-exporter | grep -i rate
```

---

## 🟡 Integration Issues

### LinkedIn CAPI Not Working

**Symptoms:** CAPI endpoint returns 503 or conversions not tracked

**Checklist:**
```bash
# 1. Verify secrets
pnpm wrangler secret list | grep LINKEDIN

# 2. Test endpoint directly
curl -X POST https://cloudless.gr/api/admin/linkedin-cap \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","eventId":"test-123"}'

# 3. Check LinkedIn Insight Tag
# Open browser dev tools → Application → Cookies → li_fat_id should exist
```

**Resolution per Phase 6 docs:**
- Provision CAPI-typed conversion ID in LinkedIn Campaign Manager
- Set `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_CONVERSION_ID` in Wrangler secrets
- Implement eventId sharing between client and server

---

### Stripe Webhook Failures

**Symptoms:** Orders not created, subscriptions not updated

**Diagnosis:**
```bash
# Check webhook endpoint
curl https://cloudless.gr/api/webhooks/stripe -X POST -d '{}'

# Check Stripe dashboard for failed events
# Dashboard → Developers → Webhooks → Recent deliveries

# Check DDB idempotency
# Events with same ID are rejected via ConditionalWrite
```

**Resolution:**
- Check webhook signature verification in route
- Verify `STRIPE_WEBHOOK_SECRET` in `.env`
- Check idempotency implementation (already verified per R22 audit)

---

### n8n Workflows Not Running

**Check:**
```bash
# n8n is host-level (not in k8s)
ssh tbaltzakis@192.168.1.128

# Check n8n service
docker ps -a | grep n8n
docker logs cloudless-n8n

# UI: http://omv:5678
# Check workflow execution logs
```

---

## 🔵 Authentication Issues

### D1 Session Endpoint Returns 500

**Symptoms:** `/api/auth/session` fails

**Diagnosis:**
```bash
# Test endpoint
curl https://cloudless.gr/api/auth/session

# Check D1 binding
cat wrangler.jsonc | jq '.d1_databases'

# Verify database exists
pnpm wrangler d1 list
```

**Resolution:**
- Ensure `user-auth-db` D1 database exists
- Check `AUTH_PROVIDER=d1` in environment
- Verify D1 binding in `wrangler.jsonc`

---

### OAuth Redirect Issues

**Symptoms:** Login redirects to /login but fails

**Check providers:**
- Google OAuth: Check `/api/auth/google` route and credentials
- Cognito (deprecated): Being migrated to D1 auth

**Resolution:**
- Verify OAuth client IDs in respective provider consoles
- Check callback URLs match exactly
- Verify secrets are set in Wrangler

---

## 🟣 Backup Issues

### PVC Backup Failing

**Symptoms:** No new files in S3, backup jobs in Error

**Diagnosis:**
```bash
# Check backup jobs
kubectl get jobs -n cloudless

# Check specific job logs
kubectl logs -n cloudless job/<backup-job-name>

# Check S3 connectivity
kubectl get secret -n cloudless s3-backup-secret
```

**Resolution:**
- Verify AWS credentials in `s3-backup-secret`
- Check S3 bucket permissions
- Verify Restic container image is accessible

---

### D1 Backup Needed

**Current:** No automated D1 backup workflow

**Manual backup:**
```bash
# Backup to SQL file
pnpm wrangler d1 export user-auth-db --remote --output=backup-$(date +%F).sql

# Or use Wrangler D1 backup feature
pnpm wrangler d1 backup user-auth-db --remote
```

---

## Infrastructure-Specific

### Postiz Deployment Issues

**Symptoms:** Postiz pod stuck in ContainerCreating/Pending

**Common cause:** Large image, resource constraints

**Resolution:**
```bash
# Check pod status
kubectl describe pod -n cloudless -l app=postiz

# Check image pull
kubectl get pods -n cloudless -l app=postiz

# Increase resources if needed
kubectl patch deployment postiz -n cloudless -p '{"spec":{"template":{"spec":{"containers":[{"name":"postiz","resources":{"requests":{"memory":"1Gi"},"limits":{"memory":"2Gi"}}}]}}}}'
```

---

### AppFlowy Worker Not Starting

**To deploy to omv-ha node:**
```bash
# Add node selector to AppFlowy worker deployment
kubectl patch deployment appflowy-worker -n cloudless --patch '{"spec":{"template":{"spec":{"nodeSelector":{"cloudless.gr/role":"omv-ha"}}}}'

# Or taint/untaint nodes
kubectl taint nodes omv-ha cloudless.gr/worker=true:NoSchedule-
```

---

## MCP Server Issues

### fast-markdown-mcp Problems

**Symptoms:** MCP tools not responding, sync failures

**Resolution:**
- Verify fast-markdown-mcp is configured in MCP settings
- Check DevDocs storage path exists: `/home/tbaltzakis/DevDocs/storage/markdown/`
- See `restart-mcp-instructions.md` for detailed restart steps
- Verify MCP config in `.cline/data/settings/cline_mcp_settings.json`

---

## Health Check Endpoints

### Application Health
- `/api/health` - Basic health check
- `/api/auth/session` - Auth system check
- `/api/admin/cluster` - Cluster status (admin)

### External Services
- Stripe: Check via dashboard or `/api/webhooks/stripe` test
- Cloudflare: `https://www.cloudflarestatus.com`
- AWS: `https://health.aws.amazon.com/health/status`

---

## Quick Diagnostic Script

```bash
#!/bin/bash
# save as: scripts/diagnose-cloudless.sh

echo "=== Cluster Status ==="
kubectl get nodes
kubectl get pods -n cloudless

echo "=== Monitoring Pods ==="
kubectl get pods -n monitoring

echo "=== Recent Events ==="
kubectl get events --all-namespaces --field-selector type=Warning --sort-by='.lastTimestamp' | head -20

echo "=== Backup Jobs ==="
kubectl get jobs -n cloudless | grep backup

echo "=== SSL Certificates ==="
kubectl get certificates -n cert-manager

echo "=== Done. Check any Error/Warning states above. ==="
```

---

## When to Escalate

| Issue | Contact | Slack Channel |
|-------|---------|---------------|
| Cluster down | Operator | #alerts |
| Certificate expiry | Operator | #alerts |
| Revenue-impacting (Stripe, Checkout) | Operator | #orders |
| New lead not captured | Team | #contacts |
| CORS/Auth issues | Developer | #dev |