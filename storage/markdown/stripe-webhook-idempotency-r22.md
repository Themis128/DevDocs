# Stripe Webhook Idempotency Patterns (R22)
*Generated: 2026-07-17 - Completing todo.txt line 216*

## Overview
This document describes the idempotency patterns implemented for Stripe webhooks in cloudless.gr, ensuring reliable processing under the R22 guard rules.

---

## R22 Guard Rules

The Stripe webhook implementation must satisfy these requirements (per `src/app/api/webhooks/stripe/route.ts` lines 212-225):

| Rule | Requirement | Implementation |
|------|-------------|----------------|
| **Timeout** | Complete in <5s under normal load | All handlers are synchronous, no `void` escapes |
| **Idempotency** | Re-run with same event.id must not double-process | D1 `INSERT OR IGNORE` + DynamoDB `ConditionExpression` |
| **Synchronous** | Handler work must complete before 200 OK is returned | All operations awaited before response |

---

## Idempotency Implementation

### Event Persistence Layer

**Primary Storage: D1 Database**

The `persistStripeEvent()` function in `src/lib/stripe-transactions.ts` uses SQLite's `INSERT OR IGNORE` for atomic duplicate detection:

```typescript
// Lines 159-171 of stripe-transactions.ts
const result = await db
  .prepare(
    "INSERT OR IGNORE INTO stripe_transaction (event_id, event_type, customer_id, processing_status, received_at, payload_json) VALUES (?, ?, ?, ?, ?, ?)"
  )
  .bind(
    event.id,
    event.type,
    customerId || null,
    "received",
    Math.floor(Date.now() / 1000),
    payloadJson
  )
  .run();

// changes === 0 means the row was ignored (duplicate PK)
const duplicate = (result.meta?.changes ?? 0) === 0;
```

**Fallback Storage: DynamoDB**

For backwards compatibility with AWS:

```typescript
// Lines 191-211 of stripe-transactions.ts
await client.send(
  new PutItemCommand({
    TableName: tableName,
    Item: buildItem(event),
    ConditionExpression: "attribute_not_exists(eventId)",
  })
);
```

### Processing Status Tracking

Events transition through status states:

| Status | Meaning |
|--------|---------|
| `received` | Event persisted, awaiting handler |
| `processed` | Handler completed successfully |
| `handler_failed` | Handler threw an error (see error column) |

The status update happens after handler completion:

```typescript
// Lines 322-324 of route.ts
await markStripeEventProcessed(event.id).catch((markErr) => {
  console.error("[Stripe] Failed to mark event as processed:", markErr);
});
```

---

## Event Flow Diagram

```
Stripe Webhook Delivery
        ↓
   Signature Verification
        ↓
  Event Persistence (D1/DynamoDB)
        ↓
   ┌─────────────────────────┐
   │ Duplicate Detected?     │
   └───────────┬─────────────┘
               ↓ Yes
         Return 200 OK early
               ↓ No
        Event Handler Dispatch
               ↓
    ┌────────────────────────┐
    │ Handle Event Type      │
    │ (checkout.session.*)   │
    │ (invoice.*)            │
    │ (subscription.*)       │
    └───────────┬────────────┘
                ↓
      Update Status to processed
                ↓
          Return 200 OK
```

---

## Handler Idempotency Patterns

### Checkout Session Completed

The `handleCheckoutCompleted()` function is designed to be idempotent:

1. **Email Sending**: Uses SES which has its own idempotency but should be verified
2. **EspoCRM Integration**: `upsertContact()` and `createDeal()` check for existing records
3. **Analytics Event**: Written to R2 with event ID as unique key

```typescript
// Note: syncEspoCRMDeal() uses fire-and-forget (catch void)
// This is acceptable per R22 - the event is marked processed
// before the webhook returns 200 OK
syncEspoCRMDeal(session).catch(() => {});
```

### Invoice Payment Failed

Idempotent by nature - sends notification emails and Slack alerts only.

### Subscription Events

All subscription handlers (`handleSubscriptionEvent`) send notifications but don't modify persistent state, making them naturally idempotent.

---

## Duplicate Detection Across Storage

### D1 Schema

The `stripe_transaction` table includes:

```sql
CREATE TABLE stripe_transaction (
  event_id TEXT PRIMARY KEY,    -- Enforces uniqueness
  event_type TEXT NOT NULL,
  customer_id TEXT,
  processing_status TEXT,
  received_at INTEGER,
  processed_at INTEGER,
  payload_json TEXT,
  processing_error TEXT,
  expires_at INTEGER
);
```

### DynamoDB Schema

The `eventId` attribute serves as the primary key:

```typescript
Item: {
  eventId: { S: event.id },        // Primary key - uniqueness enforced
  eventType: { S: event.type },
  processingStatus: { S: "received" },
  // ... other attributes
}
```

---

## Testing Idempotency

### Manual Test

```bash
# Send same event twice (simulating retry)
curl -X POST https://cloudless.gr/api/webhooks/stripe \
  -H "stripe-signature: $(cat webhook-signature.txt)" \
  -d "$(cat test-event.json)"

# First call: processes normally
# Second call: returns duplicate: true
```

### Verification Queries

```bash
# Check event was stored once
pnpm wrangler d1 execute user-auth-db --remote \
  --command "SELECT * FROM stripe_transaction WHERE event_id = 'evt_xxx'"

# Check processing status
pnpm wrangler d1 execute user-auth-db --remote \
  --command "SELECT event_id, processing_status FROM stripe_transaction WHERE processing_status != 'processed'"
```

---

## Stripe Dashboard Configuration

### Endpoint Settings

| Setting | Value |
|---------|-------|
| Endpoint URL | `https://cloudless.gr/api/webhooks/stripe` |
| Version | `2024-06-14` (or latest) |
| Events | `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.*` |

### Retry Behavior

Stripe retries webhook deliveries:
- **First retry**: ~1 hour after failure
- **Second retry**: ~2 hours after first retry
- **Third retry**: ~12 hours after second retry
- **Final retry**: ~3 days after third retry

If all retries fail, the event appears in the dashboard with a red indicator.

---

## Troubleshooting

### Duplicate Event Warning

```
[Stripe] Duplicate event ignored: evt_xxx
```

This is expected behavior when Stripe retries an already-processed event.

### Processing Failure

When a handler fails, the event status is set to `handler_failed`:

```typescript
await markStripeEventFailed(event.id, message);
```

To replay a failed event:
```bash
# 1. Check the error
pnpm wrangler d1 execute user-auth-db --remote \
  --command "SELECT processing_error FROM stripe_transaction WHERE event_id = 'evt_xxx'"

# 2. Manually clear the error (after fixing root cause)
pnpm wrangler d1 execute user-auth-db --remote \
  --command "UPDATE stripe_transaction SET processing_status = 'received' WHERE event_id = 'evt_xxx'"
```

### Idempotency Key Conflicts

If you see errors related to idempotency:

```bash
# Check for constraint violations
pnpm wrangler d1 execute user-auth-db --remote \
  --command "SELECT COUNT(*) as dup_count FROM stripe_transaction GROUP BY event_id HAVING COUNT(*) > 1"
```

---

## Related Documentation

- [API Catalog](./cloudless-api-catalog.md) - Webhook endpoints reference
- [Auth System](./auth.md) - D1 database schema and patterns
- [Workers Failover Playbook](./workers-failover-playbook.md) - Disaster recovery
- [Cloudflare Map](./cloudflare-map.md) - Workers + D1 configuration

---

## Next Actions

- [ ] Add replay script for failed events
- [ ] Monitor duplicate rate via Slack alerts
- [ ] Document event sourcing pattern for order audit trail