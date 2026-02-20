# LGU-Chat Frontend SSO Changes

## Overview
**Implemented By:** ui-designer
**Date:** 2026-02-20
**Status:** Complete

### Task Description
Replace the existing username/password authentication flow with LGU Single Sign-On (SSO) integration on the frontend. This involved rewriting the login form, creating an SSO callback page, updating the API service and type definitions, and making the user settings dialog SSO-aware.

## Implementation Summary
The authentication UI was completely overhauled to support SSO. The LoginForm was rewritten to show a single "Sign in with LGU-SSO" button that redirects to the SSO portal with CSRF state protection. A new callback page handles the token received from SSO, validates the CSRF state, and completes authentication. The API service had its login/register methods removed and replaced with a getSsoLoginUrl method. The User type interface was updated to reflect SSO-provided fields (full_name, office_name, sso_role, etc.) replacing the old local fields. The UserSettingsDialog was updated to show profile information as read-only (since it comes from SSO) and the password tab was removed entirely.

Additionally, ChatLayout.tsx and NewChatDialog.tsx were updated to use the new `full_name` field instead of the removed `name`, `last_name`, and `middle_name` fields to prevent TypeScript compilation errors.

## Files Changed/Created

### New Files
- `/Users/jsonse/Documents/development/lgu-chat/app/auth/callback/page.tsx` - SSO callback page that validates state, stores token, and redirects to chat

### Modified Files
- `/Users/jsonse/Documents/development/lgu-chat/components/auth/LoginForm.tsx` - Replaced username/password form with SSO redirect button
- `/Users/jsonse/Documents/development/lgu-chat/lib/api.ts` - Removed login/register methods, added getSsoLoginUrl method
- `/Users/jsonse/Documents/development/lgu-chat/lib/types.ts` - Updated User interface for SSO fields, updated AuthResponse
- `/Users/jsonse/Documents/development/lgu-chat/components/chat/UserSettingsDialog.tsx` - Made profile read-only, removed password tab, updated for SSO fields
- `/Users/jsonse/Documents/development/lgu-chat/components/chat/ChatLayout.tsx` - Updated user display name references from name/last_name/middle_name to full_name, replaced department with office_name
- `/Users/jsonse/Documents/development/lgu-chat/components/chat/NewChatDialog.tsx` - Updated formatUserDisplayName to use full_name instead of old name fields

## Key Implementation Details

### LoginForm (SSO Redirect)
**Location:** `/Users/jsonse/Documents/development/lgu-chat/components/auth/LoginForm.tsx`

The login form now generates a random hex string as CSRF state (stored in sessionStorage), then redirects to the SSO login URL with client_id, redirect_uri, and state parameters. Error states from failed callbacks are displayed via an inline alert and toast notifications. The component shows a loading state while the redirect is in progress. Registration UI, demo credentials display, and the register mode toggle were all removed.

**Rationale:** SSO authentication eliminates local credential management and delegates authentication to a central identity provider.

### Auth Callback Page
**Location:** `/Users/jsonse/Documents/development/lgu-chat/app/auth/callback/page.tsx`

A client-side page wrapped in Suspense that handles the SSO callback. It validates the token and state query parameters, checks the CSRF state against sessionStorage, stores the token via apiService.setToken(), validates it by calling getCurrentUser(), and redirects to /chat on success. Error states show a card with a "Back to Login" button.

**Rationale:** The callback page must run client-side to access sessionStorage for CSRF validation and to store the JWT token in localStorage via the API service.

### API Service Updates
**Location:** `/Users/jsonse/Documents/development/lgu-chat/lib/api.ts`

Removed the `login(username, password)` and `register(username, password, confirmPassword)` methods. Added `getSsoLoginUrl()` which makes a GET request to `/api/auth/login`. All other methods (logout, getCurrentUser, sendMessage, etc.) remain unchanged.

**Rationale:** With SSO, the frontend no longer handles credential submission directly. The getSsoLoginUrl method provides a server-side alternative for obtaining the SSO redirect URL.

### Type Updates
**Location:** `/Users/jsonse/Documents/development/lgu-chat/lib/types.ts`

The User interface was updated to include SSO-specific fields: sso_employee_uuid, sso_role, full_name, office_name, profile_synced_at, last_login. Removed deprecated fields: name, last_name, middle_name, department, mobile_number. AuthResponse was updated to reflect the SSO flow (login_url and state instead of token/user). Message and Conversation interfaces were kept unchanged as they reference sender_name/sender_last_name which come from the database join.

**Rationale:** The User model now reflects the SSO-synced data structure where full_name replaces the separate first/middle/last name fields.

### UserSettingsDialog Updates
**Location:** `/Users/jsonse/Documents/development/lgu-chat/components/chat/UserSettingsDialog.tsx`

The profile tab now shows read-only information with an informational banner stating "This information is managed by LGU-SSO and cannot be edited here." All input fields were replaced with static text display. The password tab was completely removed. Tab navigation now shows only "Profile" and "Avatar". Badge display shows both local role and SSO role. The avatar tab remains fully functional for local avatar management.

**Rationale:** Profile data is sourced from SSO and should not be editable locally. Password management is handled by the SSO portal.

### Cascading Updates (ChatLayout, NewChatDialog)
**Locations:**
- `/Users/jsonse/Documents/development/lgu-chat/components/chat/ChatLayout.tsx`
- `/Users/jsonse/Documents/development/lgu-chat/components/chat/NewChatDialog.tsx`

Updated all references to `currentUser.name`, `currentUser.last_name`, `currentUser.middle_name`, and `currentUser.department` to use `currentUser.full_name` and `currentUser.office_name` respectively. The complex IIFE for building full names from separate fields was replaced with simple `full_name || username` fallback logic.

**Rationale:** These changes were necessary to prevent TypeScript compilation errors after removing the old fields from the User interface.

## Security Considerations
- CSRF protection via random state parameter stored in sessionStorage and validated on callback
- State is cleared from sessionStorage immediately after validation (whether successful or not)
- Token is cleared from localStorage on authentication failure in the callback
- SSO tokens are validated server-side via the /api/auth/me endpoint before granting access

## Dependencies for Other Tasks
- Backend must implement the SSO callback token exchange (receiving authorization from SSO and issuing JWT)
- Backend /api/auth/me must return the updated User structure with SSO fields
- Backend /api/auth/login GET endpoint should return SSO login URL configuration

## Notes
- The Conversation interface still includes other_user_name, other_user_last_name, other_user_middle_name fields since these come from database joins and may still be populated by the backend during the transition period
- The Message interface still includes sender_name, sender_last_name, sender_middle_name for the same reason
- Environment variables NEXT_PUBLIC_SSO_LOGIN_URL and NEXT_PUBLIC_SSO_CLIENT_ID must be configured for the SSO redirect to work correctly
