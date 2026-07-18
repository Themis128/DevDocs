# D1 Database Backup and Restore Procedures
*Generated: 2026-07-17 - Completing todo.txt line 167*

## Overview
Comprehensive guide for backing up and restoring the `user-auth-db` D1 database used by cloudless.gr authentication system.

---

## Backup Strategy

### Automated Backup
```bash
# Daily backup (to be added to cron workflow)
pnpm wrangler d1 export user-auth-db --remote --output=d1-backup-$(date +%F).sql

# Upload to R2 for safekeeping
pnpm wrangler r2 cp d1-backup-$(date +%F).sql \
  cloudless-analytics:d1-backups/manual-$(date +%F).sql
```

### Manual Backup Commands
```bash
# List available databases
pnpm wrangler d1 list

# Create backup file
pnpm wrangler d1 export user-auth-db --remote --output=backup.sql

# Backup to specific location
aws s3 cp backup.sql s3://cloudless-analytics-data/d1-backups/manual-$(date +%s).sql
```

---

## Restore Procedures

### From SQL Backup
```bash
# Method 1: Wrangler direct restore
pnpm wrangler d1 execute user-auth-db --remote --file=backup.sql

# Method 2: Read from R2 then restore
pnpm wrangler r2 cp cloudless-analytics:d1-backups/backup.sql ./backup.sql
pnpm wrangler d1 execute user-auth-db --remote --file=./backup.sql
```

### Point-in-Time Recovery
```bash
# Cloudflare D1 does not support PITR natively
# Strategy: Keep 30 days of daily backups
# List available backups in R2
aws s3 ls s3://cloudless-analytics-data/d1-backups/ --recursive
```

---

## Migration Backup Commands

### During PostgreSQL → D1 Migration
```bash
# (Already completed - 55 users, 54 roles synced per docs)

# Original backup command used:
kubectl exec -n database postgres-0 -- pg_dump -U postgres -t users -t sessions > pg-backup.sql

# Migration verification:
pnpm wrangler d1 execute user-auth-db --command "SELECT COUNT(*) FROM users" --remote
# Expected: 55 users

pnpm wrangler d1 execute user-auth-db --command "SELECT COUNT(*) FROM user_role" --remote
# Expected: 54 roles
```

---

## Backup Verification

### Check Backup Validity
```bash
# Verify SQL file structure
head -20 backup.sql | grep -E "(CREATE|INSERT)"

# Test restore to temp database
pnpm wrangler d1 create user-auth-db-temp
pnpm wrangler d1 execute user-auth-db-temp --file=backup.sql
```

### Schema Verification
```bash
# Check current schema
pnpm wrangler d1 execute user-auth-db --command ".schema" --remote

# Verify tables exist
pnpm wrangler d1 execute user-auth-db --command "SELECT name FROM sqlite_master WHERE type='table'" --remote
# Expected: users, sessions, user_role
```

---

## Cleanup Procedures

### Expired Sessions Cleanup
```sql
-- Add to daily cronjob
DELETE FROM sessions WHERE expires_at < datetime('now');
```

```bash
# Via Wrangler
pnpm wrangler d1 execute user-auth-db --command="DELETE FROM sessions WHERE expires_at < datetime('now')" --remote
```

### Old Backup Retention
```bash
# Keep 30 days of backups
aws s3 ls s3://cloudless-analytics-data/d1-backups/ --recursive | \
  grep $(date -d "30 days ago" +%Y-%m-%d) | \
  awk '{print $4}' | \
  xargs -I {} aws s3 rm s3://cloudless-analytics-data/{}
```

---

## Monitoring

### Backup Health Check
```bash
# Script to verify backups exist
#!/bin/bash
LAST_BACKUP=$(aws s3 ls s3://cloudless-analytics-data/d1-backups/ --recursive | tail -1)
if [ -z "$LAST_BACKUP" ]; then
    curl -X POST https://cloudless.gr/api/webhooks/admin-alert \
      -d '{"severity":"high","message":"No D1 backup found"}'
fi
```

### Size Monitoring
```bash
# D1 free tier limit: 5GB
# Check current size (approximate)
pnpm wrangler d1 execute user-auth-db --command="SELECT page_count * page_size as size_bytes FROM pragma_page_count();" --remote
```

---

## Disaster Recovery

### Complete Auth System Restore
```bash
# 1. Verify SESSION_SECRET is available
# Get from Wrangler secrets or SSM

# 2. Restore database
pnpm wrangler d1 execute user-auth-db --file=backup.sql --remote

# 3. Verify restore
curl https://cloudless.gr/api/auth/session

# 4. Check user count
pnpm wrangler d1 execute user-auth-db --command="SELECT COUNT(*) as user_count FROM users" --remote
```

### Backup on New Deployment
```bash
# Add to deploy-cloudflare-free-tier.yml
- name: Backup D1 before deploy
  run: |
    pnpm wrangler d1 export user-auth-db --remote --output=/tmp/pre-deploy-backup.sql
    pnpm wrangler r2 cp /tmp/pre-deploy-backup.sql cloudless-analytics:d1-backups/pre-deploy-$(date +%s).sql
```

---

## Related Documentation
- [Auth System](./auth.md) - D1 authentication schema and endpoints
- [Cloudflare Map](./cloudflare-map.md) - Workers + D1 configuration
- [Cluster Operations](./cluster-operations-runbook.md) - PVC backup procedures

---

## Next Actions
- [ ] Add automated daily backup via GitHub Actions workflow
- [ ] Integrate backup verification into daily checks
- [ ] Set up alerting for missing backups