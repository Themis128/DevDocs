# Analytics ETL Pipeline Documentation
*Generated: 2026-07-17 - Completing todo.txt line 58*

## Overview
ETL pipeline for processing analytics events from R2, generating Parquet files, and feeding Metabase for dashboards.

---

## Pipeline Architecture

```
R2 (cloudless-analytics) → DuckDB/Wasm → Parquet Files → Metabase Dashboards
     ↑                      ↓              ↓
  Workers API           analytics-client.ts   R2 Parquet storage
```

---

## Data Flow

### 1. Event Ingestion (Workers)
Events are tracked via `/api/analytics/r2` endpoint:

| Event Type | Source | Payload |
|------------|--------|---------|
| `contact_form_submit` | `/api/contact` | email, name, company, service |
| `newsletter_signup` | `/api/subscribe` | email |
| `booking_created` | `/api/calendar/book` | email, slot |
| `auth_login` | `/api/auth/login` | email |
| `auth_register` | `/api/auth/register` | email |

### 2. R2 Storage Structure
```
cloudless-analytics/
├── events/
│   ├── contact_form_submit/
│   ├── newsletter_signup/
│   ├── booking_created/
│   └── auth_*/
├── parquet/
│   ├── daily_events.parquet
│   ├── funnel_metrics.parquet
│   └── clv_cohorts.parquet
└── d1-backups/
```

### 3. DuckDB Processing
Per `analytics-client.ts` - Connect to R2 for analytics:

```typescript
// src/lib/analytics-client.ts
import { DuckDB } from '@duckdb/wasm';

async function processAnalytics() {
  // 1. Query R2 events
  // 2. Generate Parquet files
  // 3. Create views for Metabase
}
```

---

## Parquet Generation

### Daily Rollup Script
```bash
#!/bin/bash
# Save as: scripts/generate-parquet.sh

# Generate daily parquet from R2 events
pnpm tsx scripts/rollup-analytics.ts --date=$(date +%F)

# Upload to R2
pnpm wrangler r2 cp daily_events.parquet \
  cloudless-analytics:parquet/daily_events_$(date +%F).parquet
```

### Rollup Logic
```typescript
// scripts/rollup-analytics.ts
// 1. Fetch events from R2 (last 24h)
// 2. Aggregate by type
// 3. Calculate funnel metrics
// 4. Generate parquet with DuckDB-Wasm
// 5. Write to R2 parquet/ directory
```

---

## Metabase Integration

### Connection Setup
```sql
-- Metabase reads from Parquet files in R2
-- Configure S3-compatible connection to R2:
-- Endpoint: https://<accountid>.r2.cloudflarestorage.com
-- Access Key: R2 access key from Wrangler secret
-- Secret Key: R2 secret key
```

### Dashboards to Create (todo.txt)
| Dashboard | Metrics | Status |
|-----------|---------|--------|
| Lead Sources | contact_form_submit, newsletter_signup by source | Pending |
| Deal Velocity | Time from contact → deal closed | Pending |
| CLV Cohorts | Customer lifetime value by signup month | Pending |

### Query Examples
```sql
-- Lead Sources (Metabase SQL)
SELECT 
  DATE_TRUNC('day', timestamp) as day,
  COUNT(*) as leads
FROM read_parquet('s3://cloudless-analytics/parquet/daily_events.parquet')
WHERE event = 'contact_form_submit'
GROUP BY 1
ORDER BY 1 DESC
```

---

## DuckDB Views

### Funnel Metrics View (todo.txt line 63)
```sql
CREATE VIEW v_funnel_metrics AS
SELECT 
  DATE(event_timestamp) as date,
  COUNT(DISTINCT CASE WHEN event_type = 'contact_form_submit' THEN user_id END) as leads,
  COUNT(DISTINCT CASE WHEN event_type = 'newsletter_signup' THEN user_id END) as subscribers,
  COUNT(DISTINCT CASE WHEN event_type = 'booking_created' THEN user_id END) as bookings
FROM analytics_events
GROUP BY 1
ORDER BY 1 DESC;
```

### CLV Cohorts View
```sql
CREATE VIEW v_clv_cohorts AS
SELECT 
  strftime('%Y-%m', first_seen) as cohort_month,
  COUNT(*) as users,
  SUM(total_spent) as total_revenue,
  AVG(total_spent) as avg_clv
FROM user_lifetime_value
GROUP BY 1
ORDER BY 1 DESC;
```

---

## Automation

### Daily Cron Schedule
```yaml
# infrastructure/cron/analytics-rollup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: analytics-rollup
spec:
  schedule: "0 3 * * *"  # Daily 03:00 UTC
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: duckdb-rollup
            image: duckdb:latest
            command: ["/scripts/rollup-analytics.sh"]
```

### Required Secrets
| Secret | Purpose | Storage |
|--------|---------|---------|
| `R2_ACCESS_KEY_ID` | Parquet read/write | Wrangler |
| `R2_SECRET_ACCESS_KEY` | Parquet read/write | Wrangler |
| `R2_ACCOUNT_ID` | R2 endpoint | Wrangler |

---

## Monitoring

### Pipeline Health Checks
```bash
# Check Parquet files exist
pnpm wrangler r2 list cloudless-analytics --prefix parquet/

# Verify Metabase connection
curl -sf "https://metabase.cloudless.gr/api/health" || echo "Metabase unreachable"

# Check analytics endpoint
curl -sf https://cloudless.gr/api/admin/analytics || echo "Analytics API down"
```

### Data Quality Alerts
- Missing parquet files for >24h → alert #alerts
- Metabase dashboard errors → alert #alerts  
- DuckDB query failures → alert #alerts

---

## Testing

### Local Development
```bash
# Start DuckDB-Wasm locally
npx duckdb-wasm serve

# Test parquet generation
pnpm tsx scripts/test-parquet.ts

# Query test data
pnpm tsx scripts/query-parquet.ts
```

### Production Verification
```bash
# Check daily file exists
aws s3 ls s3://cloudless-analytics/parquet/ | tail -5

# Verify Metabase can read
# In Metabase UI: Admin → Databases → Test connection
```

---

## Related Documentation
- [Cloudflare Map](./cloudflare-map.md) - R2 bucket configuration
- [Cluster Operations Runbook](./cluster-operations-runbook.md) - Backup procedures
- [API Catalog](./cloudless-api-catalog.md) - Analytics endpoints

---

## Next Actions
- [ ] Implement DuckDB parquet generation script
- [ ] Create v_funnel_metrics view
- [ ] Connect Metabase to R2 Parquet storage
- [ ] Set up daily rollup cronjob
- [ ] Create Lead Sources dashboard