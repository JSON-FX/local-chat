# LGU-Chat UI Redesign — Design Specification

**Date:** 2026-03-26
**Status:** Approved
**Direction:** Modern SaaS Chat App — Bold Accent variant

## Overview

Site-wide UI remodel of LGU-Chat to modernize the look and feel. The redesign follows a "Bold Accent" direction: dark navy sidebar contrasted with a bright white/off-white content area, blue-to-teal gradient accents for primary CTAs, and a polished SaaS chat aesthetic inspired by Slack, Teams, and Discord.

Additionally, all beta-related elements (banners, modals, utilities) are removed entirely.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Direction | Modern SaaS Chat App |
| Color palette | Keep navy blue primary, modernize surroundings |
| Sidebar | Collapsible with smooth animation |
| Message style | Hybrid — flat rows with background tinting for sender/receiver |
| Login page | Split layout (branding left, login form right) |
| Dark mode | Keep both themes, modernize together |
| Beta elements | Remove completely |

---

## Section 1: Beta Removal

### Files to delete
- `components/ui/beta-agreement-dialog.tsx` — modal forced on every first login
- `components/ui/beta-notice.tsx` — yellow/blue banner on every page
- `lib/beta-utils.ts` — BetaManager utility class

### Files to modify (remove beta imports and usage)
- `components/chat/ChatLayout.tsx` — remove BetaNotice banner, BetaAgreementDialog, `showBetaAgreement` state, and all related imports
- `components/auth/LoginForm.tsx` — remove BetaNotice banner and import
- `components/admin/AdminLayout.tsx` — remove BetaNotice banner and import

### localStorage keys to stop using
- `beta-agreement-accepted`
- `beta-agreement-date`
- `beta-notice-dismissed`

No replacement UI needed. The app loads cleanly without interruptions.

---

## Section 2: Color System & Theme

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| Sidebar bg | `#0f172a` → `#172554` gradient | Dark anchor panel |
| Content bg | `#fafbfc` | Chat area, admin content |
| Card bg | `#ffffff` | Cards, input backgrounds |
| Primary accent | `linear-gradient(135deg, #3b82f6, #06b6d4)` | CTAs: Send, New Chat, SSO |
| Primary solid | `#0f172a` | Non-gradient buttons |
| Text heading | `#0f172a` | Headings |
| Text body | `#334155` | Body text |
| Text secondary | `#64748b` | Secondary/helper text |
| Text muted | `#94a3b8` | Timestamps, captions |
| Border light | `#e2e8f0` | Input borders, dividers |
| Border subtle | `#f1f5f9` | Subtle separators |
| Active conversation | `rgba(59,130,246,0.2)` bg + `3px solid #3b82f6` left border | Selected chat item |
| Sender message | `#eff6ff` bg, `#dbeafe` border | Own messages |
| Receiver message | `#f8fafc` bg, `#f1f5f9` border | Others' messages |
| Online | `#22c55e` | Online indicator |
| Destructive | Keep current red | Error/delete actions |
| CTA glow | `0 4px 16px rgba(59,130,246,0.3)` | Gradient button shadow |

### Dark Mode

| Token | Value | Usage |
|-------|-------|-------|
| Sidebar bg | `#0a0f1a` → `#0f172a` | Deeper navy |
| Content bg | `#1e293b` | Chat area, admin content |
| Card bg | `#1e293b` | Cards, slightly lighter for elevation |
| Primary accent | Same gradient, slightly brighter | CTAs |
| Text heading | `#f1f5f9` | Headings |
| Text body | `#cbd5e1` | Body text |
| Text secondary | `#94a3b8` | Secondary text |
| Border | `rgba(255,255,255,0.08)` subtle, `rgba(255,255,255,0.12)` medium | Dividers |
| Sender message | `rgba(59,130,246,0.15)` | Own messages |
| Receiver message | `rgba(255,255,255,0.05)` | Others' messages |

### New CSS Custom Properties

```css
--gradient-accent: linear-gradient(135deg, #3b82f6, #06b6d4);
--shadow-glow: 0 4px 16px rgba(59, 130, 246, 0.3);
```

---

## Section 3: Login Page

### Layout
Split layout — left branding panel, right login form.

### Left Panel (branding)
- Full-height dark navy gradient (`#0f172a` → `#172554`)
- Top-left: LGU-Chat logo (blue-to-teal gradient rounded square) + "LGU-Chat" text
- Center: Abstract decorative elements — blurred gradient circles (blue/teal) + rotated bordered rectangles
- Bottom-left: Bold tagline "Connect. Collaborate. Communicate." (weight-800, ~26px), subtitle "The official messaging platform for the Local Government of Quezon Bukidnon."

### Right Panel (login form)
- Off-white background (`#fafbfc`)
- Government building icon in white card with subtle shadow
- "Sign in to your account" heading (20px, weight-700)
- "Access your secure government workspace" subtitle
- Full-width SSO button: dark navy `#0f172a`, "Sign in with LGU-SSO →"
- Security badge: white card with lock icon + "Secured with Single Sign-On authentication"
- Footer copyright at bottom center

### Responsive
- Mobile: stack vertically — branding becomes shorter hero at top, login form below
- Abstract shapes scale down or hide on small screens

### Removed
- BetaNotice banner
- Old centered Card/CardHeader/CardContent structure
- `bg-muted/40` full-page background

---

## Section 4: Chat Layout — Sidebar

### Expanded (~320px)

**Header:**
- Dark navy gradient background
- LGU-Chat logo (blue-to-teal gradient square with "L") + "LGU-Chat" white text
- Notification bell + connection status dot integrated into header (subtle, not separate badges)

**New Chat button:**
- Blue-to-teal gradient with glow shadow
- Full-width, centered "+ New Chat"

**Conversation list:**
- Active: `rgba(59,130,246,0.2)` bg + `3px solid #3b82f6` left border
- Inactive: transparent, subtle hover
- Each item: name (white, semibold), preview (muted), timestamp (right, muted)
- Online: green dot on avatar
- Unread: blue gradient pill badge
- Groups: group icon prefix

**User info (bottom):**
- Border-top separator (`rgba(255,255,255,0.1)`)
- Avatar (gradient circle) + name + role/position
- Settings + logout ghost buttons (muted → white on hover)

### Collapsed (~64px)
- Logo icon only
- Avatar circles for conversations
- Icon-only buttons at bottom
- Width transition: `300ms ease-in-out`

### Changes from current
- Sidebar background: light/white → dark navy gradient
- Text/icons become light-on-dark
- Connection status: separate badge → subtle dot on logo
- Notification bell: integrated into header
- Toggle button: more subtle chevron/panel icon

---

## Section 5: Chat Layout — Message Area

### Chat header
- White bg (light) / `#1e293b` (dark), bottom border
- Left: avatar + name (bold) + online status
- Right: action icons (settings, more options) as ghost buttons

### Messages area
- Background: `#fafbfc` (light) / `#1e293b` (dark)

### Receiver messages (left)
- 24px avatar circle on left
- Card: `#f8fafc` bg, `1px solid #f1f5f9`, radius `4px 16px 16px 16px`
- Text: `#334155`, 14px
- Timestamp: `#94a3b8`, 11px

### Sender messages (right)
- No avatar
- Card: `#eff6ff` bg, `1px solid #dbeafe`, radius `16px 4px 16px 16px`
- Text: `#0f172a`, 14px
- Timestamp: `#94a3b8`, 11px + read checkmarks

### File attachments
- Compact card: white bg, border, file icon + filename + size
- Images: inline thumbnail with rounded corners
- Download button on hover

### Typing indicator
- Animated dots + "Juan is typing..." in muted text

### Input area
- White bg, `2px solid #e2e8f0`, `12px` radius
- Focus: border → `#3b82f6`
- Left: paperclip (muted, hover → blue)
- Center: "Type a message..." placeholder
- Right: gradient send button with glow; disabled = muted gray

### Dark mode
- Receiver: `rgba(255,255,255,0.05)` bg
- Sender: `rgba(59,130,246,0.15)` bg
- Input border: `rgba(255,255,255,0.12)`, focus → `#3b82f6`

---

## Section 6: Admin Layout

### Changes
- Remove BetaNotice from admin
- Remove "LocalChat Admin v1.0" badge
- Apply same dark sidebar / light content split as chat
- Admin sidebar (AdminNavigation): dark navy gradient, active item uses blue left-border accent
- Top bar: white bg, Shield + "Administration Panel" text, alerts dropdown + user menu
- Content area: off-white bg, cards use white with subtle shadows
- Loading spinner: gradient-accented instead of plain border

---

## Section 7: Global Polish & Components

### Typography
- System fonts (kept for Docker/air-gapped compatibility)
- Headings: letter-spacing `-0.025em`
- Sizing: 14px base, 12px secondary, 11px timestamps/captions

### Border radius
- Base: `0.75rem` (12px), up from `0.625rem` (10px)
- Buttons: `10px`
- Message bubbles: `16px` with flat corner
- Avatars: circular
- Cards/panels: `12px`
- Inputs: `12px`

### Shadows
- Minimal — only for elevated elements (login card, dropdowns, popovers)
- CTA glow: `0 4px 16px rgba(59,130,246,0.3)` on gradient buttons
- Card hover: `0 2px 8px rgba(0,0,0,0.06)`

### Transitions
- Interactive elements: `transition: all 0.2s ease`
- Sidebar collapse: `300ms ease-in-out`
- Focus rings: blue glow instead of default outline

### Loading states
- Gradient-accented spinner
- "Loading LGU-Chat..." in updated typography

### Button variants (update `button.tsx`)
- `default`: navy solid `#0f172a` (light) / lighter slate (dark)
- New `gradient` variant: blue-to-teal gradient with glow shadow — for primary CTAs
- `ghost`, `outline`, `secondary`, `destructive`: keep logic, update colors

### Dialogs/Modals
- 12px radius, updated colors, consistent spacing
- No structural changes — theme alignment only

### Toasts (Sonner)
- Match new color palette for success/error/info toasts

---

## Files Affected (Summary)

### Delete
- `components/ui/beta-agreement-dialog.tsx`
- `components/ui/beta-notice.tsx`
- `lib/beta-utils.ts`

### Major changes
- `app/globals.css` — complete color system overhaul
- `components/auth/LoginForm.tsx` — full redesign to split layout
- `components/chat/ChatLayout.tsx` — dark sidebar, remove beta, updated styling
- `components/chat/ChatWindow.tsx` — message bubbles, input area, header
- `components/chat/ChatList.tsx` — dark theme conversation items
- `components/admin/AdminLayout.tsx` — dark sidebar, remove beta/version badge
- `components/admin/AdminNavigation.tsx` — dark theme navigation
- `components/ui/button.tsx` — new gradient variant

### Minor changes (color/spacing alignment)
- `components/ui/card.tsx`
- `components/ui/badge.tsx`
- `components/ui/dialog.tsx`
- `components/ui/input.tsx`
- `components/ui/notification-badge.tsx`
- `components/chat/NewChatDialog.tsx`
- `components/chat/UserSettingsDialog.tsx`
- `components/chat/GroupSettingsDialog.tsx`
- `components/chat/FileUpload.tsx`
- `components/admin/AdminDashboard.tsx`
- `components/admin/UserManagement.tsx`
