# AWS Monitoring Services Cleanup Playbook

## ⚠️ Prerequisites
Run from a machine with AWS CLI v2 credentials. Cloud sessions CANNOT reach AWS (network policy blocks).

## CloudTrail Cleanup

### Audit Current Trails
```bash
aws cloudtrail list-trails --region us-east-1 --output table
```

### Stop Config Recorders First (prevents config logs during trail operations)
```bash
# List recorders
aws configservice describe-configuration-recorders --region us-east-1 --output json | jq -r '.ConfigurationRecorders[].name'

# Stop each recorder
aws configservice stop-configuration-recorder --configuration-recorder-name <name> --region us-east-1
```

### Delete Extra Trails (Keep ONE management-events trail for free tier)
```bash
# Get trail ARNs, skip the first one (keep it)
aws cloudtrail list-trails --region us-east-1 --query 'Trails[1:].TrailARN' --output text | tr '\t' '\n' | while read trail; do
  if [ -n "$trail" ]; then
    echo "Deleting extra trail: $trail"
    aws cloudtrail delete-trail --name "$trail" --region us-east-1
  fi
done
```

### Remove Multi-Region Trail Replication (cost optimization)
```bash
# If keeping a trail, ensure it's single-region
# Check home region trail
aws cloudtrail list-trails --region us-east-1 --query 'Trails[?IsMultiRegionTrail==`true`].TrailARN' --output text
```

## AWS Config Cleanup

### Stop Recorders
```bash
# Stop all configuration recorders
for recorder in $(aws configservice describe-configuration-recorders --region us-east-1 --query 'ConfigurationRecorders[].name' --output text); do
  aws configservice stop-configuration-recorder --configuration-recorder-name "$recorder" --region us-east-1
done
```

### Delete Configuration Recorders (optional, irreversible)
```bash
# Only after stopping and confirming no need for config history
aws configservice delete-configuration-recorder --configuration-recorder-name <name> --region us-east-1
```

### Delete Delivery Channels (optional)
```bash
aws configservice delete-delivery-channel --delivery-channel-name <name> --region us-east-1
```

## KMS Cleanup

### Audit Customer-Managed Keys
```bash
aws kms list-keys --region us-east-1 --query 'Keys[].KeyId' --output text | tr '\t' '\n' | while read key; do
  meta=$(aws kms describe-key --key-id "$key" --region us-east-1 --output json)
  mgr=$(echo "$meta" | jq -r '.KeyMetadata.KeyManager')
  if [ "$mgr" = "CUSTOMER" ]; then
    state=$(echo "$meta" | jq -r '.KeyMetadata.KeyState')
    echo "CMK $key state=$state - check before scheduling deletion"
  fi
done
```

### Schedule Key Deletion (30-day window, irreversible)
```bash
aws kms schedule-key-deletion --key-id <key-id> --pending-window-in-days 30 --region us-east-1
```

## One-Shot Cleanup Script

```bash
#!/bin/bash
# Save as: scripts/aws-monitoring-cleanup.sh

set -euo pipefail
REGION="${AWS_REGION:-us-east-1}"
REGION_EU="${AWS_REGION_EU:-eu-west-1}"

# 1. Stop Config recorders
for rec in $(aws configservice describe-configuration-recorders --region "$REGION" --query 'ConfigurationRecorders[].name' --output text); do
  echo "Stopping Config recorder: $rec"
  aws configservice stop-configuration-recorder --configuration-recorder-name "$rec" --region "$REGION" || true
done

# 2. Delete extra CloudTrail trails (keep first one)
trails=$(aws cloudtrail list-trails --region "$REGION" --query 'Trails[].TrailARN' --output text)
first=true
for trail in $trails; do
  if [ "$first" = "true" ]; then
    echo "Keeping trail: $trail"
    first=false
    continue
  fi
  echo "Deleting trail: $trail"
  aws cloudtrail delete-trail --name "$trail" --region "$REGION" || true
done

# 3. Check KMS keys
echo "=== KMS Customer-Managed Keys ==="
aws kms list-keys --region "$REGION" --query "Keys[?KeyManager=='CUSTOMER'].KeyId" --output table

# 4. Check WorkMail (keep - required for email)
echo "=== WorkMail Organizations (KEEP) ==="
aws workmail list-organizations --region us-east-1 --output table || true
aws workmail list-organizations --region eu-west-1 --output table || true
```

## Estimated Savings (per CLAUDE.md)
- CloudTrail: ~$2.31/mo (after keeping 1 free trail)
- AWS Config: ~$0.84/mo
- KMS: ~$2.13/mo (varies by CMK count)
- **Total potential savings: ~$5.28/mo** (WorkMail $4/mo kept for email)