# Cloudflare Infrastructure Map - Cloudless.gr
*Generated: 2026-07-17*

## Overview
Complete map of Cloudflare services used by cloudless.gr (Workers, R2, D1, Zones, etc.)

---

## Workers Deployment

### Production Worker
| Property | Value |
|----------|-------|
| Entry Point | `index-cloudflare-free.js` |
| Wrangler Config | `wrangler.jsonc` |
| Auth Provider | `d1` (user-auth-db) |
| Routes | `cloudless.gr/*` |
| Health Check | `/api/health` returns 200 |
| Session Endpoint | `/api/auth/session` (verified operational) |

### Authentication Routes (Workers)
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- POST `/api/auth/logout` - Session clearing
- POST `/api/auth/reset-password` - Password reset request
- POST `/api/auth/reset-confirm` - Password reset confirmation

### Analytics Routes
- `/api/analytics/r2` - R2 analytics ingestion
- `/api/analytics/*` - Analytics data pipeline

### Chat Routes
- `/api/chat` - Bedrock/Anthropic chat endpoint
- SSE streaming supported with tool use

---

## R2 Storage Buckets

| Bucket | Purpose | Size Limit |
|--------|---------|------------|
| `cloudless-assets` | Static assets, images | Unlimited |
| `cloudless-analytics` | Analytics events, logs | Unlimited |
| `app-media-bucket` | User-generated content | Unlimited |
| `datalake-bucket` | Data lake for ETL pipelines | Unlimited |

### Free Tier Limits (to monitor)
- 10GB storage
- 10M operations/month
- Set up budget alerts (per todo.txt line 145)

---

## D1 Database

| Database | Purpose | Tables |
|----------|---------|--------|
| `user-auth-db` | Authentication | users, sessions, roles |

### Schema (per migration docs)
```sql
-- users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Backup Strategy
- Daily: `pnpm wrangler d1 export user-auth-db --remote`
- Migration files: `migrations/` directory

---

## Zone Configuration

| Property | Value |
|----------|-------|
| Zone ID | (stored in SSM) |
| DNS Records | cloudless.gr A/AAAA, CNAMEs |
| SSL | Origin CA + Let's Encrypt via cert-manager |
| Cache Rules | Need configuration (per todo.txt line 80) |

### Cache Rules Needed (per todo.txt)
- `/api/analytics/*` - Edge caching for analytics
- Static assets - 7-day cache headers (line 79)

---

## Workers AI Integration

### Models Available
- `llama-3.3-70b-versatile` (per bedrock-chat.ts)
- `anthropic` models (Bedrock)
- `amazon.nova-micro-v1:0` (per R21d for product descriptions)

### Use Cases
1. Chat widget on website
2. Product description generation
3. Semantic search embeddings (R21b)
4. Content recommendations (R21c)

---

## Pages Deployment

| Config | File |
|--------|------|
| Preview | `wrangler.pages.json` |
| Staging | `wrangler.staging.jsonc` |
| Free tier | `wrangler-cloudflare-free.json` |

---

## Secrets & Environment

### Required Secrets (Wrangler)
| Secret | Used By |
|--------|---------|
| `SESSION_SECRET` | Auth sessions (32+ bytes, per todo.txt line 50) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn CAPI (pending) |
| `LINKEDIN_CONVERSION_ID` | LinkedIn CAPI (pending) |
| `POSTIZ_API_KEY` | Postiz integration |
| `RESEND_API_KEY` | Email delivery (R23) |

### Environment Variables (per auth-d1.ts)
| Variable | Value |
|----------|-------|
| `AUTH_PROVIDER` | `d1` |
| `DATABASE_TYPE` | `d1` |

---

## Analytics Engine

### Datasets
Configured in `wrangler.jsonc` as `analytics_engine_datasets`

### Events Tracked
- `contact_form_submit` - Contact form submissions
- `newsletter_signup` - Newsletter subscriptions
- `booking_created` - Calendar bookings
- `auth_login` - Login attempts
- `auth_register` - Registrations

---

## Turnstile (CAPTCHA)

| Config | Value |
|--------|-------|
| Site Key | (stored in Wrangler) |
| Secret Key | (stored in Wrangler) |
| Used On | Contact form, newsletter signup

---

## Access / WAF

### Cloudflare Access Apps (R15)
Per `infrastructure/cloudflare-access/access-apps.tf`:
- Admin portal behind Access
- API endpoints protected

### WAF Rules
- Bot fight mode
- Rate limiting on auth endpoints (per todo.txt line 47)

---

## Monitoring

### Workers Analytics
- Invocations (limit: 100K/day free tier)
- CPU time
- Errors

### Alerting
- Workers AI errors → Sentry
- High invocation count → Slack #alerts

---

## Deployment Commands

```bash
# Deploy free tier worker
pnpm wrangler deploy --config wrangler-cloudflare-free.json

# Preview deployment
pnpm wrangler deploy --config wrangler.pages.json

# Staging deployment
pnpm wrangler deploy --config wrangler.staging.jsonc

# Check worker status
pnpm wrangler kv:key list --binding analytics_cache

# List secrets
pnpm wrangler secret list
```

---

## Related Documentation

- [Cluster Map](./CLUSTER-MAP.md) - k3s cluster status
- [API Catalog](./cloudless-api-catalog.md) - All endpoints
- [Operations Runbook](./cluster-operations-runbook.md) - Procedures
- [Troubleshooting](./troubleshooting-guide.md) - Common issues

---

## Next Actions

### Per todo.txt
- [ ] Optimize R2 cache-control headers (line 79)
- [ ] Configure Cloudflare Cache Rules for /api/analytics/* (line 80)
- [ ] Verify analytics-engine-datasets binding (line 73)
- [ ] Monitor Workers invocations (line 145)