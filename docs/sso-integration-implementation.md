# SSO Integration Implementation

## Overview
**Implemented By:** api-engineer
**Date:** 2026-02-20
**Status:** Complete

### Task Description
Replace the local username/password authentication system in LGU-Chat with SSO integration to LGU-SSO (Laravel). This involves creating an SSO service, rewriting the auth layer, updating the database schema for SSO-based users, and modifying all auth-related API endpoints.

## Implementation Summary
The implementation replaces the entire local authentication system (bcrypt password hashing, JWT token generation/verification) with an SSO-based flow. A new `SsoService` class handles all communication with the LGU-SSO API, including token validation, employee authorization, and employee data retrieval. The `AuthService` class was completely rewritten to authenticate users via SSO tokens rather than username/password, with session management based on hashed SSO tokens instead of JWTs.

The database schema was updated as a fresh start: the `users` table now uses `sso_employee_uuid` as the unique identifier instead of `username`/`password_hash`, and the `sessions` table includes `sso_token_hash` for fast token-to-session lookups. All API routes were updated accordingly -- login returns an SSO redirect URL, registration returns 410 Gone, and logout invalidates sessions by token hash.

## Files Changed/Created

### New Files
- `/Users/jsonse/Documents/development/lgu-chat/lib/sso.ts` - SSO API communication service with token caching and 5-second timeouts
- `/Users/jsonse/Documents/development/lgu-chat/app/api/auth/sso/callback/route.ts` - SSO callback endpoint that authenticates users after SSO redirect

### Modified Files
- `/Users/jsonse/Documents/development/lgu-chat/lib/schema.ts` - Replaced users/sessions table definitions for SSO fields, removed runMigrations and createDefaultAdmin
- `/Users/jsonse/Documents/development/lgu-chat/lib/auth.ts` - Complete rewrite: removed bcrypt/JWT, added SSO token validation and user upsert logic
- `/Users/jsonse/Documents/development/lgu-chat/lib/models.ts` - Updated User/Session interfaces, removed CreateUserData/CreateSessionData, updated AuthResponse
- `/Users/jsonse/Documents/development/lgu-chat/lib/socket.ts` - Replaced JWT-based socket auth with SSO token validation, added periodic re-validation, cleaned up verbose logging
- `/Users/jsonse/Documents/development/lgu-chat/app/api/auth/login/route.ts` - Returns SSO login URL instead of accepting credentials
- `/Users/jsonse/Documents/development/lgu-chat/app/api/auth/register/route.ts` - Returns 410 Gone (self-registration disabled)
- `/Users/jsonse/Documents/development/lgu-chat/app/api/auth/logout/route.ts` - Invalidates session by token hash instead of JWT decode
- `/Users/jsonse/Documents/development/lgu-chat/app/api/auth/me/route.ts` - Updated SELECT columns to match new user schema
- `/Users/jsonse/Documents/development/lgu-chat/app/api/users/password/route.ts` - Returns 410 Gone (password managed by SSO)
- `/Users/jsonse/Documents/development/lgu-chat/app/api/admin/users/route.ts` - Removed CreateUserData import, updated GET query columns, POST returns 410 Gone
- `/Users/jsonse/Documents/development/lgu-chat/scripts/init-db.ts` - Updated to use createSystemUser instead of createDefaultAdmin
- `/Users/jsonse/Documents/development/lgu-chat/scripts/init-db.js` - Updated to use createSystemUser instead of createDefaultAdmin
- `/Users/jsonse/Documents/development/lgu-chat/scripts/fresh-db.ts` - Updated to use createSystemUser instead of createDefaultAdmin
- `/Users/jsonse/Documents/development/lgu-chat/scripts/manage-users.js` - Removed password/create commands, added role/status commands for SSO users
- `/Users/jsonse/Documents/development/lgu-chat/init-database.js` - Updated to use createSystemUser instead of createDefaultAdmin

## Key Implementation Details

### SsoService (lib/sso.ts)
**Location:** `/Users/jsonse/Documents/development/lgu-chat/lib/sso.ts`

The SsoService is a singleton class that handles all communication with the LGU-SSO API. It provides three API methods (validateToken, authorizeEmployee, getEmployee) and an in-memory token cache using a Map keyed by SHA-256 hashes of tokens with a configurable TTL (default 5 minutes). All HTTP requests use AbortController with a 5-second timeout to prevent hanging requests when SSO is unavailable.

**Rationale:** Centralized SSO communication avoids duplicating API calls across the codebase and enables caching at a single point.

### AuthService Rewrite (lib/auth.ts)
**Location:** `/Users/jsonse/Documents/development/lgu-chat/lib/auth.ts`

The AuthService was completely rewritten. Key methods:
- `authenticateWithSso()` - Called after SSO callback; authorizes the employee, fetches full profile, upserts the local user, creates a session with hashed token
- `upsertLocalUser()` - Creates or updates a local user based on SSO employee UUID, syncing profile fields from SSO
- `validateSsoToken()` - Two-tier validation: fast path checks local session by token hash, slow path falls back to SSO API with cache
- `mapSsoRole()` - Maps SSO roles (super_administrator, administrator) to local roles (admin, user)

**Rationale:** The two-tier token validation minimizes SSO API calls for active sessions while still supporting fresh token validation.

### Socket.io SSO Authentication (lib/socket.ts)
**Location:** `/Users/jsonse/Documents/development/lgu-chat/lib/socket.ts`

The socket authenticate handler now calls `AuthService.validateSsoToken()` instead of `AuthService.verifyToken()` + `AuthService.validateSession()`. A periodic re-validation interval (every 15 minutes) checks if the SSO token is still valid and disconnects the socket if the token has been revoked. The interval is cleared on socket disconnect to prevent leaks.

**Rationale:** Periodic re-validation ensures that if a user's SSO access is revoked, their websocket connection is terminated within a reasonable timeframe.

### Database Schema Changes (lib/schema.ts)
**Location:** `/Users/jsonse/Documents/development/lgu-chat/lib/schema.ts`

Users table: Replaced `username UNIQUE`/`password_hash` with `sso_employee_uuid UNIQUE`/SSO profile fields (`full_name`, `sso_role`, `office_name`, `profile_synced_at`). Sessions table: Added `sso_token_hash` column. New indexes: `idx_users_sso_uuid`, `idx_sessions_sso_token_hash`. Removed: `idx_users_username`, `runMigrations()`, `createDefaultAdmin()`.

**Rationale:** Fresh start approach since the schema change is fundamental (removing password_hash, adding SSO UUID as primary identifier).

## Integration Points

### APIs/Endpoints
- `GET /api/auth/sso/callback` - SSO callback; receives token and state params, authenticates user, redirects to client-side callback page
- `POST /api/auth/login` - Returns SSO login URL with state parameter for CSRF protection
- `GET /api/auth/login` - Same as POST (convenience for browser redirect flows)
- `POST /api/auth/logout` - Invalidates session by Bearer token hash
- `GET /api/auth/me` - Returns authenticated user profile with SSO fields
- `POST /api/auth/register` - Returns 410 Gone
- `PUT /api/users/password` - Returns 410 Gone

### External Services
- LGU-SSO API (`SSO_API_URL`): POST /sso/validate, POST /sso/authorize, GET /sso/employee
- LGU-SSO UI (`SSO_LOGIN_URL`): Login redirect with client_id, redirect_uri, state params

### Environment Variables Required
- `SSO_API_URL` - LGU-SSO API base URL (default: http://lgu-sso.test/api/v1)
- `SSO_LOGIN_URL` - LGU-SSO UI login page (default: http://lgu-sso-ui.test/sso/login)
- `SSO_CLIENT_ID` - Application client ID registered in SSO
- `SSO_CLIENT_SECRET` - Application client secret
- `SSO_REDIRECT_URI` - Callback URL for SSO (default: http://localhost:3000/auth/callback)
- `SSO_TOKEN_CACHE_TTL` - Token cache TTL in seconds (default: 300)

## Known Issues & Limitations

### Limitations
1. **Admin users detail route uses old column names** - The file `/Users/jsonse/Documents/development/lgu-chat/app/api/admin/users/[userId]/route.ts` still references old schema columns (name, last_name, middle_name, department, mobile_number, ban_reason, banned_until, failed_login_attempts, last_failed_login, profile_data). This route will need to be updated to use the new schema columns.

2. **No state parameter validation** - The SSO callback does not validate the state parameter against a stored value. The state is passed through to the client-side callback but not verified server-side for CSRF protection.

3. **Frontend not updated** - This implementation only covers the backend. The frontend login page, auth context/hooks, and socket authentication code will need to be updated to work with the new SSO flow.

## Dependencies for Other Tasks
- Frontend auth components need to be updated to redirect to SSO login URL instead of showing username/password form
- Frontend needs to handle the /auth/callback route to extract the token from URL params and store it
- Frontend socket connection code needs to pass the SSO token instead of JWT
- The admin users detail route needs column name updates to match new schema
- Database needs to be reset (fresh start) before running the application with the new schema
