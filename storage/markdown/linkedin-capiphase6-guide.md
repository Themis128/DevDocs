# LinkedIn CAPI Completion Guide (Phase 6)
*Generated: 2026-07-17*

## Overview
Complete documentation for implementing robust LinkedIn Conversion API attribution in cloudless.gr.
This closes the half-done CAPI work referenced in `project_linkedin_capi_source_bound` memory.

---

## Current State Analysis

### ✅ Already Implemented
- `/api/admin/linkedin-cap` endpoint exists (route.ts)
- `LinkedInInsightTag.tsx` component for browser-side tracking
- Environment variables: `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_CONVERSION_ID`

### ⬜ To Complete (Per Master TODO Phase 6)
- Verify `li_fat_id` capture in client (Insight Tag injects it)
- Provision LinkedIn CAPI-typed conversion ID (different from browser-only conv type)
- Wire `eventId` dedup between Insight Tag fire + CAPI fire

---

## Technical Implementation

### 1. Verification: `li_fat_id` Capture

**File:** `src/components/LinkedInInsightTag.tsx`

Check that the Insight Tag captures the `li_fat_id` cookie:
```tsx
// The Insight Tag should automatically set li_fat_id
// Verify in browser: document.cookie includes "li_fat_id=..."
// This is the first-party cookie used for event matching
```

### 2. CAPI Conversion ID Requirements

**Browser-only conversion ID (existing):** `26846068`
- Cannot be used for server-side CAPI events
- Only tracks browser-side pixel fires

**Required: CAPI-typed conversion ID**
- Must be created at LinkedIn Campaign Manager
- Path: Account assets → Conversions → "Conversion API" type
- Not a browser pixel, server-sent only

### 3. Event Deduplication Pattern

Both fires happen within ~5 seconds of each other:
- **Browser:** Insight Tag fires on page load/redirect
- **Server:** CAPI fires on backend event processing

Both must use the **same `eventId`** (UUID v4) for LinkedIn to deduplicate.

```typescript
// Event flow example:
// 1. User completes purchase → UUID generated
// 2. Frontend fires Insight Tag with UUID
// 3. Backend processes payment → Fires CAPI with same UUID
// 4. LinkedIn matches/correctly attributes single conversion
```

---

## API Endpoint Documentation

### `/api/admin/linkedin-cap`

**Method:** POST
**Auth:** Bearer token required
**Content-Type:** application/json

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "eventId": "uuid-v4-string",
  "conversionId": "optional-override-id"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "eventId": "uuid-v4-string"
}
```

**Error Responses:**
```json
{
  "error": "eventId required" // 400
}
```
```json
{
  "error": "LinkedIn CAPI not configured" // 503
}
```
```json
{
  "error": "CAPI request failed" // 500
}
```

---

## Integration Points

### Where to Hook CAPI Calls

Based on your data flow, add CAPI calls to:

1. **Contact Form Submission** (`src/app/api/contact`)
   - Event: `lead_form_submit`
   - Capture: email, firstName (if provided)

2. **Newsletter Signup** (`src/app/api/subscribe`)
   - Event: `newsletter_signup`
   - Capture: email

3. **Booking Confirmation** (`src/app/api/calendar/book`)
   - Event: `booking_created`
   - Capture: email, firstName, lastName

### Implementation Pattern

```typescript
// In any route that should track conversions:
import { trackLinkedInConversion } from '@/lib/linkedin-track';

await trackLinkedInConversion({
  email,
  firstName: contact.firstName,
  lastName: contact.lastName,
  eventId: crypto.randomUUID(), // Generate once, use in both fires
  eventName: 'lead_form_submit'
});
```

---

## Configuration Checklist

### Environment Variables (Wrangler Secrets)
- [ ] `LINKEDIN_ACCESS_TOKEN` - OAuth2 access token
- [ ] `LINKEDIN_CONVERSION_ID` - CAPI-typed conversion ID
- [ ] `LINKEDIN_PIXEL_ID` - Existing pixel for browser tracking

### LinkedIn Campaign Manager Setup
- [ ] Create Conversion API conversion event
- [ ] Note the conversion ID (different from pixel ID)
- [ ] Verify access token has `r_ads` scope

### Testing Verification
- [ ] Test CAPI endpoint returns 200 with valid token
- [ ] Verify `li_fat_id` cookie in browser dev tools
- [ ] Use LinkedIn Event Debugger to confirm attribution

---

## Troubleshooting

### Common Issues

**503 "LinkedIn CAPI not configured"**
- Check `LINKEDIN_ACCESS_TOKEN` is set in Wrangler secrets
- Run `pnpm wrangler secret list` to verify

**"CAPI request failed" (500)**
- Verify conversion ID is CAPI-typed (not pixel)
- Check LinkedIn API status at status.linkedin.com
- Review server logs for LinkedIn's error response

**Duplicate Conversions**
- Ensure same UUID used for both Insight Tag + CAPI
- Check timestamp proximity (< 5s recommended)
- Review LinkedIn Event Debugger for duplicate flags

---

## Next Steps

1. **Operator action:** Provision CAPI-typed conversion ID in LinkedIn UI
2. **Claude action:** Add `li_fat_id` capture verification to `LinkedInInsightTag.tsx`
3. **Claude action:** Implement eventId UUID sharing pattern between client/server
4. **Operator testing:** Verify conversions appear in LinkedIn Campaign Manager