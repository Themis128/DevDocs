# AWS CloudTrail Payment Preferences Event Migration

## Notification Details

- **Event Type:** AWS_BILLING_PLANNED_LIFECYCLE_EVENT
- **Category:** scheduledChange
- **AWS Account:** 278585680617
- **Region:** us-east-1
- **Start Time:** September 28, 2026, 08:00:00 GMT
- **Rollout Completion:** October 7, 2026

## What's Changing

The Payment Preferences page in the Billing and Cost Management console will update CloudTrail event sources and names.

### Old → New Event Mappings

#### Payment Preference Events

| Old Event | New Events |
|-----------|-----------|
| `billingconsole.amazonaws.com` / `GetPaymentPreference` | `payments.amazonaws.com` / `Preferences_GetDefaultPaymentProfile` |
| | `payments.amazonaws.com` / `Preferences_GetBackupPaymentMethodPreference` |
| | `payments.amazonaws.com` / `Preferences_GetPaymentTerms` |
| | `payments.amazonaws.com` / `Preferences_GetBalanceApplicationPreference` |

#### Currency Events

| Old Event | New Event |
|-----------|-----------|
| `billingconsole.amazonaws.com` / `GetDefaultCurrency` | `payments.amazonaws.com` / `Preferences_GetPreferredCurrency` |

#### Payment Instrument Events

| Old Event | New Event |
|-----------|-----------|
| `billingconsole.amazonaws.com` / `GetDefaultInstrument` | `payments.amazonaws.com` / `Preferences_GetDefaultPaymentProfile` |

#### Payment Method Events

| Old Event | New Events |
|-----------|-----------|
| `billingconsole.amazonaws.com` / `SetDefaultPaymentMethod` | `payments.amazonaws.com` / `Preferences_SetPreferredCurrency` |
| | `payments.amazonaws.com` / `Preferences_UpdatePaymentProfile` |
| | `payments.amazonaws.com` / `Preferences_SetBackupPaymentMethodPreference` |
| | `payments.amazonaws.com` / `Preferences_SetBalanceApplicationPreference` |

#### Account Preferences Events

| Old Event | New Events |
|-----------|-----------|
| `billingconsole.amazonaws.com` / `AWSPaymentPortalService.GetAccountPreferences` | `payments.amazonaws.com` / `Preferences_GetPreferredCurrency` |
| | `payments.amazonaws.com` / `PaymentPortal_GetAccountIssuerDetails` |

#### Currency Conversion Events

| Old Event | New Event |
|-----------|-----------|
| `billingconsole.amazonaws.com` / `AWSPaymentPortalService.ConvertCurrencies` | `payments.amazonaws.com` / `Policy_GetExchangeRate` |

#### Payment Validation Events

| Old Event | New Event |
|-----------|-----------|
| `billingconsole.amazonaws.com` / `AWSPaymentPortalService.ValidatePaymentInstrumentOperation` | `payments.amazonaws.com` / `PaymentPortal_ValidatePaymentInstrumentOperation` |

#### Billing Address Events

| Old Event | New Event |
|-----------|-----------|
| `billingconsole.amazonaws.com` / `AWSPaymentPortalService.AssessSorChangeImpact` | `payments.amazonaws.com` / `Policy_GetBillingAddressChangeImpact` |

#### Payment Preferences List/Update Events

| Old Event | New Events |
|-----------|-----------|
| `billingconsole.amazonaws.com` / `ListPaymentPreferences` | `payments.amazonaws.com` / `TermsAndConditions_GetRecommendedTermsAndConditionsForProgram` |
| | `payments.amazonaws.com` / `TermsAndConditions_GetAcceptedTermsAndConditionsForProgramByAccountId` |
| `billingconsole.amazonaws.com` / `UpdatePaymentPreferences` | `payments.amazonaws.com` / `TermsAndConditions_AcceptTermsAndConditionsForProgramByAccountId` |

## Impact Assessment

### cloudless.gr Migration Status

**✅ No Impact - Migration Complete**

The cloudless.gr project has completed its AWS to Cloudflare migration. Payment processing was migrated to Stripe. No CloudTrail event parsing for billingconsole.amazonaws.com exists in the codebase.

### Migration References

- **Primary Backend:** `cloudless.gr` (Cloudflare Workers - already deployed)
- **Payment Provider:** Stripe (replaced AWS payment services)
- **Related Docs:**
  - [AWS Migration Plan](../AWS-MIGRATION-PLAN.md)
  - [Migration Status](../MIGRATION-STATUS.md)
  - [Analytics ETL Pipeline](analytics-etl-pipeline.md)

## Recommended Actions

1. **No code changes required** - cloudless.gr does not parse these CloudTrail events
2. **Monitor** - If any AWS billing resources remain active, update CloudTrail parsing to use new event names
3. **Verify AWS cleanup** - Confirm AWS S3/DynamoDB/Athena/Cognito resources are deleted (see MIGRATION-STATUS.md line 106-112)

## References

- [AWS CloudTrail Billing Documentation](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/logging-using-cloudtrail.html)
- [AWS Support](https://aws.amazon.com/support)