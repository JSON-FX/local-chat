# User Settings: Profile Fixes, Appearance & Bubble Styling

**Date:** 2026-03-27

## Overview

Three changes to the User Settings modal:
1. Fix profile data display (username bug, remove email, correct field sources)
2. Add theme toggle (light/dark/system)
3. Add personal chat bubble color preset picker

## 1. Profile Data Fixes

### Username Bug

**Root cause:** `lib/auth.ts` → `upsertLocalUser()` sets both `username` and `full_name` to the computed `fullName` variable. The SSO login username (e.g., `"j.doe"`) from `ssoEmployee.username` is never extracted.

**Fix:** Extract `ssoEmployee.username` and use it for the `username` column in both the UPDATE and INSERT queries. `full_name` continues to use the computed full name.

### Profile Modal Field Changes

| Field | Before | After |
|-------|--------|-------|
| Full Name | `currentUser.full_name` (SSO) | No change |
| Username | Shows full name (bug) | Shows SSO login username (`"j.doe"`) |
| Email | Displayed | Removed |
| Position | `currentUser.position` (SSO) | No change |
| Office | `currentUser.office_name` (SSO) | No change |
| Badges | Username + Role + SSO Role | Role + SSO Role only (remove redundant Username badge) |

## 2. Theme Toggle

### Storage

Stored in `profile_data` JSON column on the users table:
```json
{ "theme": "system" }
```

Also persisted to `localStorage` for instant load before API response.

### Options

| Option | Behavior |
|--------|----------|
| Light | Forces light mode (`dark` class removed from `<html>`) |
| Dark | Forces dark mode (`dark` class added to `<html>`) |
| System | Follows OS `prefers-color-scheme` (default) |

### UI

Located in the Appearance tab of User Settings. Three option cards in a row, each with an icon (sun/moon/monitor) and label. Selected card has a highlight ring. Saves immediately on click.

## 3. Chat Bubble Style Presets

### Storage

Stored in `profile_data` JSON column:
```json
{ "theme": "system", "bubble_style": "default" }
```

### Presets

| Key | Type | Description |
|-----|------|-------------|
| `default` | solid | Current blue (no change from existing) |
| `emerald` | solid | Green tint |
| `violet` | solid | Purple tint |
| `rose` | solid | Pink tint |
| `amber` | solid | Warm yellow/orange tint |
| `slate` | solid | Neutral gray |
| `ocean` | gradient | Blue to Teal |
| `sunset` | gradient | Orange to Pink |
| `aurora` | gradient | Green to Purple |
| `lavender` | gradient | Purple to Blue |

Each preset defines four values: `bg` (light mode), `bg` (dark mode), `border` (light mode), `border` (dark mode). Gradient presets use `linear-gradient(135deg, colorA, colorB)`.

### Rendering

- Only affects the current user's own sent message bubbles (personal preference)
- Other users' messages remain the existing light gray/white style
- Solid presets applied via `backgroundColor` inline style
- Gradient presets applied via `background` inline style
- Border color via `borderColor` inline style
- Dark mode: each preset has separate light/dark values; selected based on current theme
- Reply preview backgrounds within styled bubbles use semi-transparent white overlay (unchanged approach)

### UI

Located in the Appearance tab, below the Theme section. Section title: "Chat Bubble Style", subtitle: "Choose how your sent messages appear". Grid of preset cards (3 columns desktop, 2 mobile). Each card shows a small preview bubble with sample text styled in that preset's colors, with the preset name below. Selected card has a checkmark/highlight ring. Saves immediately on click with toast confirmation.

## 4. User Settings Dialog Tab Structure

Updated tab order: **Profile** | **Avatar** | **Appearance**

Appearance tab contains (top to bottom):
1. Theme section
2. Chat Bubble Style section

## 5. API Changes

### Existing Endpoint
- `GET /api/auth/me` — parse `profile_data` JSON and include `bubble_style` and `theme` fields on the user object

### New Endpoint
- `PUT /api/users/preferences` — accepts `{ bubble_style?: string, theme?: string }`, validates against known presets/options, merges into `profile_data` JSON

### User Type Update
Add optional fields to the `User` interface:
```typescript
bubble_style?: string;
theme?: string;
```

## 6. Files to Modify

| File | Changes |
|------|---------|
| `lib/auth.ts` | Extract `ssoEmployee.username` for username column |
| `lib/types.ts` | Add `bubble_style?` and `theme?` to User interface |
| `components/chat/UserSettingsDialog.tsx` | Remove email, fix username display, remove username badge, add Appearance tab with theme toggle and bubble preset picker |
| `components/chat/ChatWindow.tsx` | Replace hardcoded current-user bubble colors with dynamic preset styling |
| `app/api/auth/me/route.ts` | Parse `profile_data` and include fields in response |
| `app/api/users/preferences/route.ts` | New endpoint for saving preferences |
| `app/globals.css` | No changes needed (presets defined in component config) |

### New Files
| File | Purpose |
|------|---------|
| `lib/bubble-presets.ts` | Shared preset definitions (key → colors map) |
