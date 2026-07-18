# Cloudless.gr API Endpoint Catalog
*Generated: 2026-07-17*
*Last Updated: 2026-07-17*
*Status: Core endpoints implemented*

## Overview
Complete reference of all public and admin API endpoints in the cloudless.gr application.

---

## Public Endpoints (No Authentication Required)

### Contact & Lead Generation

| Endpoint | Method | Auth | Purpose | Response |
|----------|--------|------|---------|----------|
| `/api/contact` | POST | None | Contact form submission | `{"success": true}` + analytics event |
| `/api/subscribe` | POST | None | Newsletter signup | `{"success": true}` + welcome email |
| `/api/newsletter-slack` | POST | None | Newsletter Slack webhook | Slack notification |

### Content APIs

| Endpoint | Method | Auth | Purpose | Response |
|----------|--------|------|---------|----------|
| `/api/blog` | GET | None | Fetch blog posts from Notion | Array of posts |
| `/api/docs` | GET | None | Documentation pages | Notion page content |
| `/api/faqs` | GET | None | FAQ content | Array of FAQs |
| `/api/testimonials` | GET | None | Customer testimonials | Array of testimonials |
| `/api/case-studies` | GET | None | Case study content | Array of case studies |

### Product & Store

| Endpoint | Method | Auth | Purpose | Response |
|----------|--------|------|---------|----------|
| `/api/products/recommendations` | POST | None | AI-powered product recommendations | Product array |
| `/api/search` | POST | None | Hybrid semantic search | Search results |

### Authentication (Public)

| Endpoint | Method | Auth | Purpose | Response |
|----------|--------|------|---------|----------|
| `/api/auth/session` | GET | None | Session check | `{"authenticated": true/false}` |

---

## Admin Endpoints (Authentication Required)

### Analytics & Reporting

| Endpoint | Method | Auth | Purpose | Response |
|----------|--------|------|---------|----------|
| `/api/admin/analytics` | GET | Bearer | Analytics dashboard data | Consolidated metrics |
| `/api/admin/cost` | GET | Bearer | AWS cost dashboard | Cost breakdown panels |
| `/api/admin/reports` | GET | Bearer | Reports list | Array of reports |
| `/api/admin/reports/[id]` | GET | Bearer | Specific report | Report data |
| `/api/admin/audits` | POST | Bearer | Run audits | Audit results |
| `/api/admin/audits/list` | GET | Bearer | List audits | Audit history |

### Marketing & Ads

| Endpoint | Method | Auth | Purpose | Response |
|----------|--------|------|---------|----------|
| `/api/admin/campaigns/google` | GET/POST | Bearer | Google Ads campaigns | Campaign data |
| `/api/admin/campaigns/x` | GET/POST | Bearer | X/Twitter Ads campaigns | Campaign data |
| `/api/admin/linkedin-cap` | POST | Bearer | LinkedIn CAPI events | `{"success": true}` |
| `/api/admin/postiz` | GET/POST | Bearer | Postiz social management | Posts/schedules |

### User & Access Management

| Endpoint | Method | Auth | Purpose | Response |
|----------|--------|------|---------|----------|
| `/api/admin/users` | GET | Bearer | List users | User array |
| `/api/admin/users/[id]` | GET/PUT | Bearer | User management | User data |
| `/api/admin/workspaces` | GET/POST | Bearer | Workspace management | Workspace data |
| `/api/admin/client-portals` | GET | Bearer | Client portal list | Portal config |

### Infrastructure & Operations

| Endpoint | Method | Auth | Purpose | Response |
|----------|--------|------|---------|----------|
| `/api/admin/cluster` | GET | Bearer | Cluster health status | Node/pod status |
| `/api/admin/integrations` | GET | Bearer | Integration status | Connection status |
| `/api/admin/cache` | POST | Bearer | Cache management | Clear/refresh |
| `/api/admin/ops` | POST | Bearer | Operational commands | Status |

### Webhook Endpoints

| Endpoint | Method | Auth | Purpose | Response |
|----------|--------|------|---------|----------|
| `/api/webhooks/stripe` | POST | Signature | Stripe events | 200 OK |
| `/api/webhooks/sentry` | POST | Secret | Sentry alerts | 200 OK |
| `/api/webhooks/admin-alert` | POST | Internal | Admin alerts | Slack + ntfy |

---

## Authentication Endpoints

| Endpoint | Method | Auth | Purpose | Response |
|----------|--------|------|---------|----------|
| `/api/auth/register` | POST | None | User registration | User + session |
| `/api/auth/login` | POST | None | User login | User + session |
| `/api/auth/logout` | POST | None | User logout | Session cleared |
| `/api/auth/reset-password` | POST | None | Password reset request | Email sent |
| `/api/auth/reset-confirm` | POST | None | Confirm password reset | Password updated |

---

## Calendar & Booking

| Endpoint | Method | Auth | Purpose | Response |
|----------|--------|------|---------|----------|
| `/api/calendar/book` | POST | Service Account | Book appointment | Google Calendar event |
| `/api/calendar/availability` | GET | Service Account | Check slots | Available times |

---

## API Patterns & Conventions

### Authentication Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Error Responses
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {} // optional
}
```

### Success Responses
```json
{
  "success": true,
  "data": {} // payload
}
```

### Pagination
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasNext": true
  }
}
```

---

## Integration Points

### Stripe Webhooks
- `checkout.session.completed` → Creates orders in DynamoDB
- `invoice.payment_succeeded` → Updates subscription status
- `customer.subscription.deleted` → Handles cancellations

### EspoCRM Integration
- Contact form → Creates Contact + Deal
- Newsletter signup → Creates lead
- User sync → 55 users, 54 roles

### Slack Notifications
- #contacts: New lead notifications
- #alerts: System alerts
- #orders: Order confirmations

### Analytics Events
Tracked to R2 via `/api/analytics/r2`:
- `contact_form_submit`
- `newsletter_signup`
- `booking_created`
- `auth_login`
- `auth_register`

---

---

## Implementation Status

### Recently Created Endpoints (2026-07-17)
| Endpoint | File | Status |
|----------|------|--------|
| `/api/admin/analytics` | `src/app/api/admin/analytics/route.ts` | ✅ Implemented |
| `/api/admin/ops` | `src/app/api/admin/ops/route.ts` | ✅ Implemented |
| `/api/admin/cluster` | `src/app/api/admin/cluster/route.ts` | ✅ Implemented |
| `/api/admin/audits` (POST) | `src/app/api/admin/audits/route.ts` | ✅ Implemented |
| `/api/admin/users/[id]` | `src/app/api/admin/users/[id]/route.ts` | ✅ Implemented |
| `/api/blog` | `src/app/api/blog/route.ts` | ✅ Implemented |
| `/api/newsletter-slack` | `src/app/api/newsletter-slack/route.ts` | ✅ Implemented |
| `/api/products/recommendations` (POST) | `src/app/api/products/recommendations/route.ts` | ✅ Updated |
| `/api/search` (POST) | `src/app/api/search/route.ts` | ✅ Updated |

### All Public Endpoints Status
| Endpoint | Status |
|----------|--------|
| `/api/contact` | ✅ Existing |
| `/api/subscribe` | ✅ Existing |
| `/api/newsletter-slack` | ✅ New |
| `/api/blog` | ✅ New |
| `/api/docs` | ✅ Existing |
| `/api/faqs` | ✅ Existing |
| `/api/testimonials` | ✅ Existing |
| `/api/case-studies` | ✅ Existing |
| `/api/products/recommendations` | ✅ Updated (GET+POST) |
| `/api/search` | ✅ Updated (GET+POST) |
| `/api/auth/session` | ✅ Existing |

### All Admin Endpoints Status
| Endpoint | Status |
|----------|--------|
| `/api/admin/analytics` | ✅ New |
| `/api/admin/cost` | ✅ Existing |
| `/api/admin/reports` | ✅ Existing |
| `/api/admin/reports/[id]` | ✅ Existing |
| `/api/admin/audits` (POST) | ✅ New |
| `/api/admin/audits/list` | ⚠️ Redirects to `/api/admin/audits/latest` |
| `/api/admin/campaigns/google` | ✅ Existing |
| `/api/admin/campaigns/x` | ✅ Existing |
| `/api/admin/linkedin-cap` | ✅ Existing |
| `/api/admin/postiz` | ✅ Existing |
| `/api/admin/users` | ✅ Existing |
| `/api/admin/users/[id]` | ✅ New |
| `/api/admin/workspaces` | ✅ Existing |
| `/api/admin/client-portals` | ✅ Existing |
| `/api/admin/cluster` | ✅ New |
| `/api/admin/integrations` | ✅ Existing |
| `/api/admin/cache` | ✅ Existing |
| `/api/admin/ops` | ✅ New |

---

## Rate Limits
- Public endpoints: Unlimited
- Admin endpoints: 100 req/min per IP
