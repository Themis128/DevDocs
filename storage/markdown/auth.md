# Cloudless.gr Authentication System
*Generated: 2026-07-17*

## Overview
D1-based authentication system designed to replace AWS Cognito + DynamoDB for Cloudflare Free Tier migration.

---

## Architecture

### Authentication Flow

```
Browser → /api/auth/* endpoint → D1 database
                    ↓
              SESSION_SECRET signing
                    ↓
              Session cookie (30-day expiry)
```

### Database Schema

#### Users Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | UUID v4 |
| `email` | TEXT (UNIQUE) | User email address |
| `name` | TEXT | Optional display name |
| `company` | TEXT | Optional company |
| `phone` | TEXT | Optional phone |
| `password_hash` | TEXT | SHA-256 hash (needs bcrypt upgrade per todo.txt) |
| `preferences_json` | TEXT | JSON for reset tokens, etc. |
| `created_at` | DATETIME | Account creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

#### Sessions Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | UUID v4 session token |
| `user_id` | TEXT (FK) | References users.id |
| `expires_at` | DATETIME | 30 days from creation |
| `created_at` | DATETIME | Session start timestamp |

#### User Roles Table
| Column | Type | Description |
|--------|------|-------------|
| `user_id` | TEXT (PK/FK) | References users.id |
| `role` | TEXT | 'user' or 'admin' |

---

## Password Hashing

### Current Implementation (SHA-256)
```typescript
// src/lib/auth-d1.ts lines 72-77
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SESSION_SECRET);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return encodeHex(new Uint8Array(hash));
}
```

**Note:** Security recommendation from todo.txt line 46 - upgrade to bcrypt for better security.

### Security Enhancement (Recommended)
```typescript
// Proposed bcrypt implementation
import { hashSync, compareSync } from 'bcrypt';
// Requires adding bcrypt to Worker deps
```

---

## Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/auth/register` | POST | Create new user | None |
| `/api/auth/login` | POST | Authenticate + create session | None |
| `/api/auth/logout` | POST | Delete session | Session cookie |
| `/api/auth/reset-password` | POST | Request reset token | None |
| `/api/auth/reset-confirm` | POST | Consume reset token | None |
| `/api/auth/session` | GET | Check current session | None |

---

## Request/Response Formats

### Register (`/api/auth/register`)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Optional Name"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Optional Name",
    "created_at": 1234567890
  },
  "session": {
    "id": "session-uuid",
    "expires_at": 1234567890
  }
}
```

**Error Responses:**
```json
{ "error": "User already exists" } // 400
{ "error": "Failed to create user" } // 500
{ "error": "Authentication not configured" } // 503 (missing SESSION_SECRET)
```

### Login (`/api/auth/login`)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as register

### Reset Password (`/api/auth/reset-password`)

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "token": "base64-token", // Only sent if user exists
  "success": true // Always returns success (don't reveal existence)
}
```

### Reset Confirm (`/api/auth/reset-confirm`)

**Request:**
```json
{
  "token": "base64-token-from-email",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{ "success": true }
```

---

## Session Management

### Cookie Configuration
- Cookie name: `session` (default)
- HttpOnly: Yes
- Secure: Yes (HTTPS only)
- SameSite: Strict
- Expiry: 30 days

### Session Validation
```typescript
// Sessions checked via:
// 1. Cookie header
// 2. Lookup in session table
// 3. Check expires_at > now()

// Automatic cleanup available:
// cleanupExpiredSessions() - delete old sessions
```

---

## Admin Functions

### Promote to Admin
```typescript
POST /api/admin/users/promote
{ "email": "user@example.com" }
// Calls createAdminUser() - adds 'admin' role
```

### Check Admin Status
```typescript
// isAdmin() function checks user_role table for 'admin' role
```

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SESSION_SECRET` | ✅ Yes | Password salt + token signing (32+ bytes) |
| `AUTH_PROVIDER` | ✅ Yes | Must be set to "d1" |
| `DATABASE_TYPE` | ✅ Yes | Must be set to "d1" |

---

## Deployment Configuration

### Wrangler Configuration (`wrangler.jsonc`)
```json
{
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "user-auth-db"
    }
  ]
}
```

### Secrets Management
```bash
# Add session secret (required)
pnpm wrangler secret put SESSION_SECRET

# Verify
pnpm wrangler secret list
```

---

## Migration Notes

### From Cognito (Deprecated)
- Cognito auth being phased out
- All new auth should use D1
- Password reset flow customized (stored in preferences_json)

### Sync Status
- 55 users synced from PostgreSQL standby
- 54 roles synced
- D1 session endpoint verified returning 200

---

## Security Considerations

### Current (SHA-256)
- ✅ Password salted with SESSION_SECRET
- ✅ Session tokens are UUID v4 (unpredictable)
- ✅ HttpOnly cookies
- ❌ SHA-256 is fast (vulnerable to brute force)

### Recommended Improvements (per todo.txt)
1. Upgrade to bcrypt for password hashing
2. Add rate limiting to auth endpoints (line 47)
3. Add CSRF protection to auth forms (line 49)
4. Session cleanup job (line 48)

---

## Troubleshooting

### Common Issues

**"Authentication not configured" (503)**
- Check SESSION_SECRET is set in Wrangler secrets
- Run: `pnpm wrangler secret list`

**Session not persisting**
- Check cookie settings in browser dev tools
- Verify SameSite/Secure flags match your domain

**Password reset not working**
- Check email delivery for reset link
- Verify token hasn't expired (24h window)
- Check preferences_json column for token storage

### Debug Commands
```bash
# Test D1 connection
curl https://cloudless.gr/api/auth/session

# Check user exists
pnpm wrangler d1 execute user-auth-db --remote \
  --command "SELECT * FROM user WHERE email = 'you@example.com'"

# List all sessions for a user
pnpm wrangler d1 execute user-auth-db --remote \
  --command "SELECT * FROM session WHERE user_id = 'user-uuid'"
```

---

## Related Documentation

- [API Catalog](./cloudless-api-catalog.md) - All auth endpoints
- [Cloudflare Map](./cloudflare-map.md) - Workers + D1 setup
- [Cluster Map](./CLUSTER-MAP.md) - Backup procedures
- [Troubleshooting](./troubleshooting-guide.md) - Common auth issues