# GitHub Workflows Update Guide
*Generated: 2026-07-17 - For New Cloudflare + D1 Architecture*

## Overview
Guide for updating GitHub workflows to align with the new cloudless.gr architecture (Workers + D1 + R2 + Pi cluster).

**✅ Last Updated: 2026-07-17 - Key workflows updated**

---

## Workflows Requiring Updates

### Authentication-Related Workflows

| Workflow | Current State | Required Update | Priority | Status |
|----------|---------------|-----------------|----------|--------|
| `admin-login-probe.yml` | Checks self-hosted apps + D1 auth | ✅ D1 `/api/auth/session` check added | High | ✅ DONE |
| `app-auth-doctor.yml` | NextAuth + JWKS check | ✅ Updated to check D1 auth (SESSION_SECRET, AUTH_DB) | High | ✅ DONE |
| `apply-cognito-ui.yml` | Cognito UI setup | Archived - no longer needed | Low | ⏭️ SKIP |
| `cognito-setup.yml` | Cognito bootstrap | Archived - no longer needed | Low | ⏭️ SKIP |

### Cloudflare Workflows

| Workflow | Current State | Required Update | Priority | Status |
|----------|---------------|-----------------|----------|--------|
| `cloudflare-token-rotate.yml` | Token rotation procedure | ✅ Added Wrangler secrets sync step | High | ✅ DONE |
| `store-cloudflare-token.yml` | Stores CF token in SSM | ✅ Added Wrangler secrets sync step | Medium | ✅ DONE |
| `apply-cloudflare-lb.yml` | HA LB setup | File does not exist - use `cloudflare-lb.yml` | High | ⏭️ SKIP |

### Deploy Workflows

| Workflow | Current State | Required Update | Priority | Status |
|----------|---------------|-----------------|----------|--------|
| `deploy-cloudflare-free-tier.yml` | Workers deploy | ✅ Added D1 auth post-deploy verification | Medium | ✅ DONE |
| `deploy-pi.yml` | Pi k3s rollout | Verify sync with Workers SHA | Medium | 🔄 TODO |
| `deploy.yml` | Lambda + CloudFront via SST | Consider updating for hybrid | Low | 🔄 TODO |

---

## New Workflows Needed

### Authentication Update Workflows

```yaml
# workflow: monitor-d1-auth.yml
# Purpose: Daily check of D1 auth endpoint
# Cadence: daily 08:00 UTC
# Steps:
# 1. curl https://cloudless.gr/api/auth/session
# 2. Verify SESSION_SECRET is set
# 3. Alert on failure via /api/webhooks/admin-alert

# workflow: d1-backup.yml
# Purpose: Daily D1 backup to R2
# Cadence: daily 02:00 UTC
# Steps:
# 1. pnpm wrangler d1 export user-auth-db
# 2. Upload to r2://cloudless-analytics/d1-backups/
# 3. Retain 30 days
```

### Cloudflare Free Tier Workflows

```yaml
# workflow: verify-free-tier-limits.yml
# Purpose: Check Workers invocations, R2 ops, D1 size
# Cadence: weekly
# Steps:
# 1. Query CF API for usage
# 2. Compare to free tier limits
# 3. Alert if >80% threshold

# workflow: sync-secrets-wrangler.yml
# Purpose: Sync SSM -> Wrangler secrets for D1/MCP
# Trigger: manual, on-demand
# Steps:
# 1. Read SSM parameters
# 2. pnpm wrangler secret put for each
# 3. Verify via wrangler secret list
```

---

## Workflows to Archive (One-Shot Complete)

Per README.md archived workflows + new candidates:

| Workflow | Reason |
|----------|--------|
| `apply-cognito-ui.yml` | Cognito being replaced by D1 auth |
| `cognito-setup.yml` | Initial setup complete, no longer needed |
| `wire-pi-cognito.yml` | No longer using Cognito for Pi auth |
| `deploy-infrastructure-workaround.yml` | Obsolete (per README line 152) |

---

## Architecture Alignment Checklist

### For Each Workflow Using AWS Services

1. **Check if still needed** - Much auth moved to D1 ✅
2. **Verify OIDC usage** - Never use long-lived AKID ✅
3. **Add Wrangler steps** - For D1/Workers operations ✅
4. **Update alert paths** - Use `/api/webhooks/admin-alert` ✅

### For Auth-Using Workflows

- [x] Replace Cognito checks with D1 endpoints
- [x] Use `SESSION_SECRET` for auth operations
- [x] Check `/api/auth/session` instead of Cognito JWKS
- [x] Verify Wrangler secrets after deploy

---

## MCP Integration for Workflow Updates

Your DevDocs MCP can analyze workflows:

```bash
# Search for workflows referencing Cognito
mcp DevDocs search_files "cognito|Cognito"

# Find all Cloudflare-related workflows
mcp DevDocs search_files "cloudflare|wrangler|d1"

# Get specific workflow patterns
mcp DevDocs search_files "OIDC|aws-actions"
```

### Using Ollama MCP for Workflow Generation

```bash
mcp ollama ollama_generate \
  --prompt "Generate a GitHub Actions workflow that checks D1 auth endpoint daily and alerts on failure" \
  --model qwen2.5-coder
```

---

## Quick Updates Completed ✅

### 1. admin-login-probe.yml Update ✅
Added D1 auth endpoint check alongside self-hosted apps probe:
```yaml
- name: Check D1 auth endpoint
  run: |
    curl https://cloudless.gr/api/auth/session
```

### 2. store-cloudflare-token.yml Enhancement ✅
Added step to sync to Wrangler:
```yaml
- name: Sync to Wrangler secrets (D1/MCP)
  run: |
    echo "CF_API_TOKEN=$CF_TOKEN" >> "$GITHUB_ENV"
    npx wrangler secret list --config wrangler-cloudflare-free.json
```

### 3. deploy-cloudflare-free-tier.yml Enhancement ✅
Added D1 verification step:
```yaml
- name: Verify D1 auth post-deploy
  run: |
    curl -sf https://cloudless.gr/api/auth/session
    # Accepts 200 (user), 401 (no session), 503 (not configured)
```

---

## Monitoring Workflow Health

### Workflows Failing Due to Missing Config
Per README.md:

| Workflow | Missing | Fix |
|----------|---------|-----|
| `ad-readiness.yml` | LINKEDIN_* SSM keys | Operator: set LinkedIn secrets |

### Adding New Failure Paths
Use the standard:
```yaml
# Failure alert
- name: Alert on failure
  if: failure()
  run: |
    curl -X POST https://cloudless.gr/api/webhooks/admin-alert \
      -d '{"severity":"high","message":"Workflow failed"}'
```

---

## Related Documentation

- [Cloudflare Map](./cloudflare-map.md) - Workers + D1 config
- [Auth System](./auth.md) - D1 authentication reference
- [Cluster Operations](./cluster-operations-runbook.md) - Pi side
- [CLUSTER-MAP.md](./CLUSTER-MAP.md) - Status overview