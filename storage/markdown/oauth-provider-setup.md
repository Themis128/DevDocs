# OAuth Provider Setup Guide for Cloudless.gr
*Generated: 2026-07-17 - Completing todo.txt line 217*

## Overview
Guide for configuring OAuth providers (Google, GitHub, etc.) for the cloudless.gr authentication system.

---

## Current Auth Architecture

Cloudless.gr uses **D1-based authentication** (per `auth.md` and `auth-d1.ts`):

```
Browser → /api/auth/* endpoint → D1 database
```

OAuth integration can be added to enable social login alongside the existing email/password flow.

---

## Supported Providers

| Provider | Status | Notes |
|----------|--------|-------|
| Google OAuth | ✅ Ready | Most common provider |
| GitHub OAuth | ⚠️ Partial | Needs endpoint implementation |
| OAuth Generic | 🔄 Planned | Support for any OpenID Connect provider |

---

## Google OAuth Configuration

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. Authorized redirect URIs:
   ```
   https://cloudless.gr/api/auth/google/callback
   ```

### 2. Environment Variables

Set these secrets in Wrangler (required for Workers deployment):

```bash
# Google OAuth client ID
pnpm wrangler secret put GOOGLE_CLIENT_ID

# Google OAuth client secret  
pnpm wrangler secret put GOOGLE_CLIENT_SECRET

# OAuth callback URL (for non-Wrangler environments)
pnpm wrangler secret put NEXTAUTH_URL
# Value: https://cloudless.gr
```

### 3. Database Schema Updates

Add OAuth support to the user table:

```sql
-- Add OAuth columns to user table
ALTER TABLE user ADD COLUMN google_id TEXT UNIQUE;
ALTER TABLE user ADD COLUMN avatar_url TEXT;

-- Create index for faster lookups
CREATE INDEX idx_user_google_id ON user(google_id);
```

### 4. Implementation Flow

```
Browser
   ↓
/api/auth/google (GET) → Redirects to Google OAuth
   ↓
Google Consent Screen
   ↓
/api/auth/google/callback (GET) → Exchange code for tokens
   ↓
Create/find user in D1 → Set session cookie
   ↓
Redirect to /portal or intended destination
```

---

## GitHub OAuth Configuration

### 1. Create GitHub OAuth App

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Application name: `cloudless.gr`
4. Homepage URL: `https://cloudless.gr`
5. Authorization callback URL:
   ```
   https://cloudless.gr/api/auth/github/callback
   ```

### 2. Environment Variables

```bash
# GitHub OAuth credentials
pnpm wrangler secret put GITHUB_CLIENT_ID
pnpm wrangler secret put GITHUB_CLIENT_SECRET

# Same NEXTAUTH_URL as above
```

---

## Generic OAuth (OpenID Connect)

### Configuration via Environment

For adding new providers without code changes:

```bash
# OIDC provider base URL
pnpm wrangler secret put OIDC_ISSUER
# Example: https://accounts.google.com or https://token.actions.githubusercontent.com

# OIDC client ID and secret
pnpm wrangler secret put OIDC_CLIENT_ID
pnpm wrangler secret put OIDC_CLIENT_SECRET
```

---

## D1 Schema for OAuth Support

### Users Table Extension

```sql
-- Extended user table with OAuth support
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company TEXT,
  phone TEXT,
  password_hash TEXT,
  preferences_json TEXT,
  google_id TEXT UNIQUE,      -- OAuth provider ID
  avatar_url TEXT,            -- Profile image
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Sessions table (unchanged)
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id)
);

-- User roles table (unchanged)
CREATE TABLE user_role (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id)
);
```

---

## OAuth Endpoint Implementation

### Route Structure

```
src/app/api/auth/
├── google/
│   ├── route.ts       # Initiates OAuth flow
│   └── callback/
│       └── route.ts   # Handles callback + user creation
├── github/
│   ├── route.ts
│   └── callback/
│       └── route.ts
└── oauth/
    └── route.ts       # Generic OIDC handler
```

### Session Handling

OAuth sessions use the same D1 session store:

```typescript
// After OAuth callback verification
const sessionId = crypto.randomUUID();
const expiresAt = Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS;

await db
  .prepare("INSERT INTO session (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
  .bind(sessionId, user.id, expiresAt, Math.floor(Date.now() / 1000))
  .run();
```

---

## Frontend Integration

### Login Page Updates

Add OAuth buttons to existing auth forms:

```tsx
// src/components/auth-form.tsx (or similar)
<div className="oauth-providers">
  <button onClick={() => signIn('google')}>
    Sign in with Google
  </button>
  <button onClick={() => signIn('github')}>
    Sign in with GitHub
  </button>
</div>
```

### Session Check

Same endpoint works for OAuth and password sessions:

```typescript
// /api/auth/session returns user info regardless of auth method
const session = await fetch('/api/auth/session').then(r => r.json());
// { authenticated: true, user: { email, name, avatar_url } }
```

---

## Environment Variables Reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `SESSION_SECRET` | ✅ Yes | Password hashing + session signing |
| `GOOGLE_CLIENT_ID` | For Google OAuth | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Google OAuth | OAuth client secret |
| `GITHUB_CLIENT_ID` | For GitHub OAuth | OAuth client ID |
| `GITHUB_CLIENT_SECRET` | For GitHub OAuth | OAuth client secret |
| `NEXTAUTH_URL` | For OAuth | Base URL for callbacks |
| `OIDC_ISSUER` | For OIDC | Issuer URL for generic provider |
| `OIDC_CLIENT_ID` | For OIDC | OIDC client ID |
| `OIDC_CLIENT_SECRET` | For OIDC | OIDC client secret |

---

## Deployment Checklist

- [ ] Create OAuth credentials in provider console
- [ ] Add authorized redirect URIs matching your domain
- [ ] Set secrets via `pnpm wrangler secret put`
- [ ] Update D1 schema with OAuth columns
- [ ] Deploy Workers with updated configuration
- [ ] Test OAuth flow end-to-end
- [ ] Verify session cookie works across OAuth/password auth

---

## Testing OAuth Locally

### Development Mode

```bash
# Start local dev server
pnpm dev

# For Google OAuth, add to .env.local:
# GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=xxx

# Use http://localhost:3000 for callback URL in Google console
```

### Tunnel for External Testing

```bash
# Expose localhost for OAuth callback testing
cloudflared tunnel --url http://localhost:3000

# Use the tunnel URL in OAuth provider console
```

---

## Troubleshooting

### OAuth Redirect Mismatch

**Error:** `redirect_uri_mismatch`

**Solution:**
1. Check authorized redirect URIs in provider console
2. Verify `NEXTAUTH_URL` matches your domain
3. Ensure no trailing slashes in URLs

### Session Not Persisting

**Check:**
```bash
# Verify user created
pnpm wrangler d1 execute user-auth-db --remote \
  --command "SELECT id, email, google_id FROM user WHERE email = 'xxx'"

# Check session exists
pnpm wrangler d1 execute user-auth-db --remote \
  --command "SELECT * FROM session WHERE user_id = 'user-uuid'"
```

### Missing Avatar

OAuth profile images are stored in `avatar_url`. If missing:
1. Check OAuth callback handler fetches profile image
2. Verify `avatar_url` column exists in schema
3. Check network tab for profile image endpoint errors

---

## Security Considerations

### OAuth State Parameter

Always use state parameter to prevent CSRF:

```typescript
// Generate cryptographically random state
const state = crypto.getRandomValues(new Uint8Array(32));
// Store in session/cookie, verify on callback
```

### Token Storage

Never store OAuth tokens in the database. The D1 auth system:
- Uses short-lived session tokens (UUID v4)
- Validates sessions against expiry time
- Deletes expired sessions via cleanup job

### Rate Limiting

OAuth endpoints should be rate-limited:

```typescript
// Consider adding to OAuth routes
import { rateLimit } from '@/lib/rate-limit';

// Limit OAuth attempts per IP
await rateLimit('oauth-attempt', 5, 60); // 5 attempts per minute
```

---

## Related Documentation

- [Auth System](./auth.md) - D1 authentication implementation
- [API Catalog](./cloudless-api-catalog.md) - All auth endpoints
- [Cloudflare Map](./cloudflare-map.md) - Workers configuration
- [Troubleshooting Guide](./troubleshooting-guide.md) - Common OAuth issues

---

## Next Actions

- [ ] Implement Google OAuth callback route
- [ ] Add OAuth columns to D1 schema migration
- [ ] Update frontend with OAuth buttons
- [ ] Add rate limiting to OAuth endpoints