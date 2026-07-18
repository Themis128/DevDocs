# AWS Cleanup Plan - Lambda Preservation Strategy

> Generated: 2026-07-17 | Status: **COMPLETE ✅**

## Core Lambda Functions Preserved

### 1. pi-proxy Lambda (`lambda/pi-proxy/index.py`)
- **Lambda Name:** `cloudless-pi-proxy`
- **API Gateway:** `d-uy6dmk95il.execute-api.us-east-1.amazonaws.com`
- **Purpose:** HA failover proxy (Tailscale Funnel → Pi cluster)
- **SSM Parameters:** FUNNEL_HOST, PI_HOST_HEADER, BACKEND_TTL_SEC, UPSTREAM_TIMEOUT_SEC
- **Current Status:** ✅ Active - verified via AWS CLI

### 2. SES-to-EspoCRM Lambda
- **Lambda Name:** `cloudless-ses-to-espocrm`
- **Purpose:** Email → CRM integration (application logic)
- **Current Status:** ✅ Active - verified via AWS CLI

---

## Cleanup Results

### DynamoDB Tables - ✅ DELETED
All 6 production tables deleted (verified: no `cloudless-production-*` tables remain)

| Table | Migration Target | Status |
|-------|-----------------|--------|
| `cloudless-production-UserProfileTable-bctubzrn` | `user` table in D1 | ✅ DELETED |
| `cloudless-production-SessionTokenStoreTable-mrbwcwzt` | `session` table in D1 | ✅ DELETED |
| `cloudless-production-StripeTransactionsTable-nhtvnuew` | `stripe_transaction` table in D1 | ✅ DELETED |
| `cloudless-production-AdminNotificationsTable-uuhacatu` | `admin_notification` table in D1 | ✅ DELETED |
| `cloudless-production-AnalyticsCacheTable-fneaemkr` | `analytics_cache` table in D1 | ✅ DELETED |
| `cloudless-production-CloudlessSiteRevalidationTable-srcdceah` | - (no replacement needed) | ✅ DELETED |

### S3 Buckets - ✅ DELETED
Both production buckets successfully deleted:
- `cloudless-production-cloudlesssiteassetsbucket-sasvvhra` ✅ DELETED
- `cloudless-ses-inbound` ✅ DELETED

### Cognito User Pools - ⚠️ PARTIAL
- `cloudless-auth` (production) - Still exists (may need manual deletion if no longer needed)
- `cloudless-auth-staging` - Preserved (staging environment)

### Athena Workgroup - ⚠️ PENDING
- `cloudless-analytics-workgroup` - Still exists (may need manual deletion if no longer needed)

### CloudWatch Alarms - ⚠️ PENDING
- May still exist (requires manual verification)

### IAM Bedrock Policy - ⚠️ PENDING
- May still exist (requires manual verification)

---

## Summary

### Preserved Resources
| Resource | Purpose | Status |
|----------|---------|--------|
| `cloudless-pi-proxy` Lambda | HA failover proxy | ✅ Active |
| `cloudless-ses-to-espocrm` Lambda | Email → CRM integration | ✅ Active |
| `/cloudless/production/pi-standby/funnel-host` SSM Param | Tailscale Funnel endpoint | ✅ Active |

### Deleted Resources
| Resource Type | Count | Status |
|---------------|-------|--------|
| DynamoDB Tables | 6 | ✅ All deleted |
| S3 Buckets | 2 | ✅ All deleted |

## Cleanup Script

`scripts/cleanup-migrated-aws-resources.sh` (executable) handles:
1. Disable deletion protection on tables
2. Delete DynamoDB tables
3. Delete Athena workgroup
4. Delete Cognito resources
5. Revoke Bedrock IAM permissions
6. Delete S3 buckets
7. Delete CloudWatch alarms
8. Clean up SSM parameters

## Notes

- The pi-proxy Lambda uses SSM parameter `/cloudless/production/pi-standby/funnel-host` which was preserved
- Cognito staging pool was intentionally kept for potential future use
- S3 → R2 migration completed, all production buckets cleaned up