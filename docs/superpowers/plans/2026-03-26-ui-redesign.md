# LGU-Chat UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use @frontend-design skill when implementing visual components.

**Goal:** Modernize the LGU-Chat UI site-wide to a "Bold Accent" design — dark navy sidebar, light content area, blue-to-teal gradient accents — and remove all beta elements.

**Architecture:** Pure visual overhaul. No business logic, API, or database changes. Work proceeds bottom-up: foundation (colors, global CSS, base components) first, then page-level components (login, chat, admin). Each task produces a buildable state.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4 (oklch colors), Radix UI, CVA (class-variance-authority), Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-26-ui-redesign-design.md`

---

## File Structure

### Files to delete
- `components/ui/beta-agreement-dialog.tsx`
- `components/ui/beta-notice.tsx`
- `lib/beta-utils.ts`

### Files to modify (by task)

| Task | Files | Responsibility |
|------|-------|----------------|
| 1 | `components/auth/LoginForm.tsx`, `components/chat/ChatLayout.tsx`, `components/admin/AdminLayout.tsx` | Remove beta imports and usage |
| 2 | `app/globals.css` | Color system overhaul (oklch tokens) |
| 3 | `components/ui/button.tsx` | Add gradient variant |
| 4 | `components/auth/LoginForm.tsx` | Split layout login page |
| 5 | `components/chat/ChatLayout.tsx` | Dark sidebar, updated header/user info |
| 6 | `components/chat/ChatList.tsx` | Dark theme conversation items |
| 7 | `components/chat/ChatWindow.tsx` | Message bubbles, input area, header |
| 8 | `components/admin/AdminLayout.tsx`, `components/admin/AdminNavigation.tsx` | Dark admin sidebar, remove version badge |
| 9 | `components/ui/notification-badge.tsx`, `components/chat/NewChatDialog.tsx`, `components/chat/UserSettingsDialog.tsx`, `components/chat/GroupSettingsDialog.tsx`, `components/chat/FileUpload.tsx`, `components/admin/AdminDashboard.tsx`, `components/admin/UserManagement.tsx` | Minor alignment pass |

---

## Task 1: Remove All Beta Elements

**Files:**
- Delete: `components/ui/beta-agreement-dialog.tsx`
- Delete: `components/ui/beta-notice.tsx`
- Delete: `lib/beta-utils.ts`
- Modify: `components/auth/LoginForm.tsx`
- Modify: `components/chat/ChatLayout.tsx`
- Modify: `components/admin/AdminLayout.tsx`

- [ ] **Step 1: Remove beta imports and usage from LoginForm.tsx**

In `components/auth/LoginForm.tsx`:
- Remove the import line: `import { BetaNotice } from '@/components/ui/beta-notice';`
- Remove the JSX line: `<BetaNotice variant="warning" dismissible={false} persistent={true} />`

The file renders a `<div className="min-h-screen flex flex-col bg-muted/40">` — the BetaNotice is the first child inside it. Remove only that line.

- [ ] **Step 2: Remove beta imports and usage from ChatLayout.tsx**

In `components/chat/ChatLayout.tsx`:
- Remove import: `import { BetaNotice } from '@/components/ui/beta-notice';`
- Remove import: `import { BetaAgreementDialog } from '@/components/ui/beta-agreement-dialog';`
- Remove state: `const [showBetaAgreement, setShowBetaAgreement] = useState(false);`
- Remove JSX: `<BetaNotice variant="warning" dismissible={true} />` (inside the return, first child of the flex-col div)
- Remove JSX: `<BetaAgreementDialog onAgreementAccepted={() => setShowBetaAgreement(false)} />` (search for BetaAgreementDialog in the JSX)

- [ ] **Step 3: Remove beta imports and usage from AdminLayout.tsx**

In `components/admin/AdminLayout.tsx`:
- Remove import: `import { BetaNotice } from '@/components/ui/beta-notice';`
- Remove JSX: `<BetaNotice variant="info" dismissible={true} />` (first child inside the `h-screen flex flex-col` div)

- [ ] **Step 4: Delete beta files**

```bash
rm components/ui/beta-agreement-dialog.tsx
rm components/ui/beta-notice.tsx
rm lib/beta-utils.ts
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors about missing beta modules.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove all beta UI elements (banners, modal, utils)"
```

---

## Task 2: Update Color System & Global CSS

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Rewrite globals.css with new color tokens**

Replace the entire contents of `app/globals.css` with:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.75rem;

  /* Core backgrounds */
  --background: oklch(0.98 0.002 250);
  --foreground: oklch(0.145 0.03 261);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0.03 261);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0.03 261);

  /* Primary — navy solid */
  --primary: oklch(0.205 0.03 265);
  --primary-foreground: oklch(0.985 0.002 248);

  /* Secondary */
  --secondary: oklch(0.96 0.003 265);
  --secondary-foreground: oklch(0.205 0.03 265);

  /* Muted */
  --muted: oklch(0.96 0.003 265);
  --muted-foreground: oklch(0.52 0.025 260);

  /* Accent */
  --accent: oklch(0.96 0.003 265);
  --accent-foreground: oklch(0.205 0.03 265);

  /* Destructive */
  --destructive: oklch(0.577 0.245 27.325);

  /* Borders & inputs */
  --border: oklch(0.905 0.007 260);
  --input: oklch(0.905 0.007 260);
  --ring: oklch(0.59 0.16 255);

  /* Charts */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);

  /* Sidebar — dark navy */
  --sidebar: oklch(0.205 0.03 265);
  --sidebar-foreground: oklch(0.93 0.006 265);
  --sidebar-primary: oklch(0.59 0.16 255);
  --sidebar-primary-foreground: oklch(0.985 0.002 248);
  --sidebar-accent: oklch(0.28 0.035 260);
  --sidebar-accent-foreground: oklch(0.93 0.006 265);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.59 0.16 255);

  /* Custom — gradient & glow */
  --gradient-from: oklch(0.59 0.16 255);
  --gradient-to: oklch(0.63 0.14 195);
  --shadow-glow: 0 4px 16px oklch(0.59 0.16 255 / 30%);
}

.dark {
  --background: oklch(0.205 0.03 261);
  --foreground: oklch(0.96 0.003 248);
  --card: oklch(0.25 0.035 260);
  --card-foreground: oklch(0.96 0.003 248);
  --popover: oklch(0.25 0.035 260);
  --popover-foreground: oklch(0.96 0.003 248);

  --primary: oklch(0.93 0.006 265);
  --primary-foreground: oklch(0.205 0.03 265);

  --secondary: oklch(0.28 0.035 260);
  --secondary-foreground: oklch(0.96 0.003 248);

  --muted: oklch(0.28 0.035 260);
  --muted-foreground: oklch(0.65 0.025 260);

  --accent: oklch(0.28 0.035 260);
  --accent-foreground: oklch(0.96 0.003 248);

  --destructive: oklch(0.704 0.191 22.216);

  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.52 0.025 260);

  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);

  /* Sidebar — deeper navy */
  --sidebar: oklch(0.145 0.02 265);
  --sidebar-foreground: oklch(0.96 0.003 248);
  --sidebar-primary: oklch(0.65 0.18 255);
  --sidebar-primary-foreground: oklch(0.985 0.002 248);
  --sidebar-accent: oklch(0.28 0.035 260);
  --sidebar-accent-foreground: oklch(0.96 0.003 248);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.52 0.025 260);

  /* Custom — brighter gradient for dark mode */
  --gradient-from: oklch(0.68 0.16 255);
  --gradient-to: oklch(0.72 0.14 195);
  --shadow-glow: 0 4px 16px oklch(0.68 0.16 255 / 30%);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  h1, h2, h3, h4, h5, h6 {
    letter-spacing: -0.025em;
  }
}

@layer utilities {
  .line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .text-truncate-ellipsis {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .gradient-accent {
    background: linear-gradient(135deg, var(--gradient-from), var(--gradient-to));
  }

  .shadow-glow {
    box-shadow: var(--shadow-glow);
  }
}
```

- [ ] **Step 2: Clean up font references in layout.tsx**

In `app/layout.tsx`, the `--font-sans` and `--font-mono` CSS properties are already set via inline style. Verify the `@theme inline` block in globals.css references `--font-sans` (not `--font-geist-sans`). Already handled in the CSS above — `--font-sans: var(--font-sans)`.

No changes needed to layout.tsx — it already uses system fonts correctly.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds. Colors will look different but the app still functions.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: overhaul color system for Bold Accent theme"
```

---

## Task 3: Add Gradient Button Variant

**Files:**
- Modify: `components/ui/button.tsx`

- [ ] **Step 1: Add gradient variant to buttonVariants**

In `components/ui/button.tsx`, add a new variant to the `variant` object inside the `cva()` call:

After the `link` variant line, add:
```typescript
gradient:
  "gradient-accent text-white shadow-glow hover:opacity-90 focus-visible:ring-[var(--gradient-from)]/30",
```

The full variants object becomes:
```typescript
variant: {
  default:
    "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
  destructive:
    "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
  outline:
    "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
  secondary:
    "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
  ghost:
    "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  link: "text-primary underline-offset-4 hover:underline",
  gradient:
    "gradient-accent text-white shadow-glow hover:opacity-90",
},
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/ui/button.tsx
git commit -m "feat: add gradient button variant for primary CTAs"
```

---

## Task 4: Redesign Login Page

**Files:**
- Modify: `components/auth/LoginForm.tsx`

- [ ] **Step 1: Rewrite LoginForm.tsx with split layout**

Replace the entire content of `components/auth/LoginForm.tsx` with:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import Image from 'next/image';

const SSO_LOGIN_URL = process.env.NEXT_PUBLIC_SSO_LOGIN_URL || 'http://lgu-sso-ui.test/sso/login';
const SSO_CLIENT_ID = process.env.NEXT_PUBLIC_SSO_CLIENT_ID || '';

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (error === 'auth_failed') {
      toast.error('Authentication failed. Please try again.');
    } else if (error === 'missing_params') {
      toast.error('Invalid authentication response.');
    }
  }, [error]);

  const handleSsoLogin = () => {
    setIsRedirecting(true);

    // Generate CSRF state
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    sessionStorage.setItem('sso_state', state);

    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/sso/callback`);
    const loginUrl = `${SSO_LOGIN_URL}?client_id=${SSO_CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}`;

    window.location.href = loginUrl;
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel — Branding */}
      <div className="relative lg:w-1/2 bg-[oklch(0.205_0.03_265)] overflow-hidden flex flex-col justify-between p-8 lg:p-12 min-h-[280px] lg:min-h-screen">
        {/* Abstract decorative elements */}
        <div className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full bg-[oklch(0.59_0.16_255_/_15%)] blur-[80px]" />
        <div className="absolute bottom-[-120px] left-[-60px] w-[500px] h-[500px] rounded-full bg-[oklch(0.63_0.14_195_/_10%)] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] border border-white/5 rounded-3xl rotate-45" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] border border-white/[3%] rounded-[40px] rotate-[25deg]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-[10px] gradient-accent flex items-center justify-center shadow-glow">
            <Image
              src="/lgu-seal.png"
              alt="LGU Seal"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
          <span className="font-bold text-base text-white">LGU-Chat</span>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <h1 className="text-[26px] lg:text-[32px] font-extrabold text-white leading-tight">
            Connect.<br />Collaborate.<br />Communicate.
          </h1>
          <p className="mt-3 text-sm text-[oklch(0.65_0.015_260)] leading-relaxed">
            The official messaging platform for the<br />
            Local Government of Quezon Bukidnon.
          </p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 bg-[oklch(0.98_0.002_250)] flex flex-col items-center justify-center p-8 lg:p-12 relative">
        <div className="w-full max-w-[320px]">
          {/* Icon */}
          <div className="w-12 h-12 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center mb-6">
            <Image
              src="/lgu-seal.png"
              alt="LGU Seal"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>

          <h2 className="text-xl font-bold text-foreground mb-1.5">Sign in to your account</h2>
          <p className="text-sm text-muted-foreground mb-7">Access your secure government workspace</p>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive mb-5"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {error === 'auth_failed'
                  ? 'Authentication failed. Please try again.'
                  : 'An error occurred during sign in.'}
              </span>
            </div>
          )}

          <Button
            onClick={handleSsoLogin}
            className="w-full h-12 text-sm font-semibold"
            disabled={isRedirecting}
          >
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Redirecting to SSO...
              </>
            ) : (
              <>
                Sign in with LGU-SSO
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>

          {/* Security badge */}
          <div className="flex items-center gap-2 mt-5 p-3 bg-white rounded-xl border border-border">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Secured with Single Sign-On authentication</span>
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-5 leading-relaxed">
            You will be redirected to the LGU Single Sign-On portal to enter your credentials.
          </p>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-4 text-[11px] text-muted-foreground">
          &copy; {new Date().getFullYear()} Local Government of Quezon Bukidnon. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/auth/LoginForm.tsx
git commit -m "feat: redesign login page with split layout and bold branding"
```

---

## Task 5: Redesign Chat Sidebar

**Files:**
- Modify: `components/chat/ChatLayout.tsx`

This is the largest file (~1590 lines). Only the JSX return section (lines ~1323-1590) and imports change. Business logic remains untouched.

- [ ] **Step 1: Update the sidebar JSX in ChatLayout.tsx**

The sidebar starts at approximately line 1329 (`{/* Sidebar */}`) and ends at line 1589. Make these changes:

**Sidebar container (line ~1329):**
Replace:
```tsx
<div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} border-r border-border flex flex-col h-full transition-all duration-300 ease-in-out`}>
```
With:
```tsx
<div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} flex flex-col h-full transition-all duration-300 ease-in-out`} style={{ background: 'linear-gradient(180deg, oklch(0.205 0.03 265), oklch(0.18 0.03 268))' }}>
```

**Header section (line ~1331):**
Replace:
```tsx
<div className="h-16 px-4 flex items-center justify-between border-b border-border">
```
With:
```tsx
<div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
```

**Logo container — expanded (line ~1335):**
Replace:
```tsx
<div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
```
With:
```tsx
<div className="h-8 w-8 rounded-[10px] gradient-accent shadow-glow flex items-center justify-center">
```

**App name (line ~1344):**
Replace:
```tsx
<span className="font-semibold">LGU-Chat</span>
```
With:
```tsx
<span className="font-semibold text-white">LGU-Chat</span>
```

**Notification bell button (line ~1348-1362):**
Replace:
```tsx
className="text-muted-foreground hover:text-foreground p-1"
```
With:
```tsx
className="text-white/50 hover:text-white p-1"
```

Replace the green bell icon:
```tsx
<Bell className="h-4 w-4 text-green-600" />
```
With:
```tsx
<Bell className="h-4 w-4 text-green-400" />
```

Replace the muted bell icon:
```tsx
<BellOff className="h-4 w-4 text-muted-foreground" />
```
With:
```tsx
<BellOff className="h-4 w-4 text-white/40" />
```

**Connection status badges (lines ~1366-1375):**
Replace:
```tsx
<Badge variant="secondary" className="text-xs">
  <Circle className="h-2 w-2 mr-1 fill-green-500 text-green-500" />
  Online
</Badge>
```
With:
```tsx
<Badge variant="secondary" className="text-xs bg-white/10 text-white/70 border-0">
  <Circle className="h-2 w-2 mr-1 fill-green-400 text-green-400" />
  Online
</Badge>
```

Replace:
```tsx
<Badge variant="destructive" className="text-xs">
  <Circle className="h-2 w-2 mr-1 fill-red-500 text-red-500" />
  Offline
</Badge>
```
With:
```tsx
<Badge variant="destructive" className="text-xs bg-red-500/20 text-red-300 border-0">
  <Circle className="h-2 w-2 mr-1 fill-red-400 text-red-400" />
  Offline
</Badge>
```

**Collapsed state logo (line ~1381):**
Replace:
```tsx
<div className="h-6 w-6 rounded bg-white shadow-sm flex items-center justify-center">
```
With:
```tsx
<div className="h-6 w-6 rounded-lg gradient-accent shadow-glow flex items-center justify-center">
```

**Collapsed connection indicators (line ~1390-1394):**
Update `fill-green-500 text-green-500` to `fill-green-400 text-green-400` and `fill-red-500 text-red-500` to `fill-red-400 text-red-400`.

**Collapsed notification button (lines ~1397-1411):**
Update the same way as expanded — `text-green-600` → `text-green-400`, `text-muted-foreground` → `text-white/40`.

**Toggle button section (line ~1417):**
Replace:
```tsx
<div className="px-2 py-2 border-b border-border">
```
With:
```tsx
<div className="px-2 py-2 border-b border-white/10">
```

The toggle button itself — update class:
Replace:
```tsx
className={`w-full ${sidebarCollapsed ? 'justify-center' : 'justify-start'} space-x-2`}
```
With:
```tsx
className={`w-full text-white/60 hover:text-white hover:bg-white/10 ${sidebarCollapsed ? 'justify-center' : 'justify-start'} space-x-2`}
```

**New Chat button section (line ~1437):**
Replace:
```tsx
<div className="p-2 border-b border-border">
```
With:
```tsx
<div className="p-2 border-b border-white/10">
```

**User info — expanded (line ~1464):**
Replace:
```tsx
<div className="p-4 border-t border-border">
```
With:
```tsx
<div className="p-4 border-t border-white/10">
```

**User name text (line ~1481):**
Replace:
```tsx
<p className="font-medium">
```
With:
```tsx
<p className="font-medium text-white">
```

**User position text (line ~1485):**
Replace:
```tsx
<p className="text-sm text-muted-foreground">{currentUser.position}</p>
```
With:
```tsx
<p className="text-sm text-white/50">{currentUser.position}</p>
```

**User office_name text (line ~1488):**
Replace:
```tsx
<p className="text-xs text-muted-foreground">{currentUser.office_name}</p>
```
With:
```tsx
<p className="text-xs text-white/40">{currentUser.office_name}</p>
```

**User role fallback (line ~1491):**
Replace:
```tsx
<p className="text-sm text-muted-foreground capitalize">{currentUser?.role}</p>
```
With:
```tsx
<p className="text-sm text-white/50 capitalize">{currentUser?.role}</p>
```

**Settings/logout buttons (lines ~1502-1530):**
Replace all instances of:
```tsx
className="text-muted-foreground hover:text-foreground"
```
With:
```tsx
className="text-white/50 hover:text-white hover:bg-white/10"
```

**Collapsed user info (line ~1538):**
Replace:
```tsx
<div className="p-2 border-t border-border flex flex-col items-center space-y-1">
```
With:
```tsx
<div className="p-2 border-t border-white/10 flex flex-col items-center space-y-1">
```

**Collapsed user initials (line ~1548):**
Replace:
```tsx
<span className="text-xs font-semibold">
```
With:
```tsx
<span className="text-xs font-semibold text-white">
```

**Collapsed settings/logout buttons (lines ~1554-1588):**
Same replacement: `text-muted-foreground hover:text-foreground` → `text-white/50 hover:text-white hover:bg-white/10`.

**Any remaining sidebar sections** (e.g., footer/signature area near lines 1594-1595):
Any `border-t border-border` → `border-t border-white/10`, any `text-muted-foreground` → `text-white/40`. Apply the same dark-sidebar pattern consistently to every element within the sidebar container.

- [ ] **Step 2: Update the content area background**

After the sidebar div closes (approximately line 1590+), the main content area begins. Find:
```tsx
{/* Main Chat Area */}
```
Or the ChatWindow section. The wrapper around ChatWindow should use the off-white background. If it doesn't already have a bg class, add `bg-background` to the container div.

- [ ] **Step 3: Update loading state**

Replace the loading spinner (lines ~1314-1320):
```tsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
```
With:
```tsx
<div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-[var(--gradient-from)] border-r-[var(--gradient-to)] mx-auto"></div>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add components/chat/ChatLayout.tsx
git commit -m "feat: redesign chat sidebar with dark navy theme"
```

---

## Task 6: Restyle Chat Conversation List

**Files:**
- Modify: `components/chat/ChatList.tsx`

The ChatList renders inside the dark sidebar, so all its colors need to work on dark backgrounds.

- [ ] **Step 1: Update conversation item styles**

Key changes in `components/chat/ChatList.tsx`:

**Selected conversation background:**
Find the `bg-accent` class on selected conversation items and replace with:
```tsx
className="bg-[oklch(0.59_0.16_255_/_20%)] border-l-[3px] border-l-[oklch(0.59_0.16_255)]"
```

**Unselected conversation hover:**
Replace any `hover:bg-accent` or `hover:bg-muted` with:
```tsx
hover:bg-white/5
```

**Conversation name text:**
Replace text color classes to use `text-white` for names and `text-white/50` for preview text and timestamps.

**Avatar fallback for groups:**
Replace `bg-blue-100 text-blue-700` with `bg-white/10 text-white/70`.

**Avatar fallback for direct:**
Replace `bg-primary/10` with `bg-white/10`.

**Online indicator:**
Replace `fill-green-500 text-green-500` with `fill-green-400 text-green-400`.

**Group indicator badge:**
Replace `bg-blue-500` with `gradient-accent`.

**Typing indicator:**
Replace `text-primary` with `text-[var(--gradient-from)]`.

**Unread badge:**
The NotificationBadge component uses hardcoded `bg-red-500` — this will be updated in Task 9.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/chat/ChatList.tsx
git commit -m "feat: restyle conversation list for dark sidebar theme"
```

---

## Task 7: Redesign Message Area

**Files:**
- Modify: `components/chat/ChatWindow.tsx`

- [ ] **Step 1: Update chat header**

Find the chat header section (the top bar showing the selected conversation's name and status). Update its classes:
- Background: `bg-white dark:bg-[oklch(0.25_0.035_260)]`
- Border: `border-b border-border`
- Online status text: keep `text-green-500` (this is on a light background)

- [ ] **Step 2: Update message area background**

The messages scroll area should have:
```tsx
className="bg-[oklch(0.98_0.002_250)] dark:bg-[oklch(0.205_0.03_261)]"
```

- [ ] **Step 3: Update message bubbles**

**Receiver messages (others — left aligned):**
Find the message container for non-current-user messages. Update the message card:
```tsx
className="bg-[#f8fafc] dark:bg-white/5 border border-[#f1f5f9] dark:border-white/8 rounded-[4px_16px_16px_16px] px-3.5 py-2.5"
```

Timestamp below: `text-[11px] text-muted-foreground`

**Sender messages (own — right aligned):**
Find the message container for current user messages. Update:
```tsx
className="bg-[#eff6ff] dark:bg-[oklch(0.59_0.16_255_/_15%)] border border-[#dbeafe] dark:border-[oklch(0.59_0.16_255_/_20%)] rounded-[16px_4px_16px_16px] px-3.5 py-2.5"
```

Timestamp: `text-[11px] text-muted-foreground` with right alignment.

- [ ] **Step 4: Update input area**

Find the message input area at the bottom. Update the container:
```tsx
className="flex items-center gap-2 bg-white dark:bg-white/5 border-2 border-border focus-within:border-[var(--gradient-from)] rounded-xl px-3 py-2 transition-colors"
```

Update the Send button to use the gradient variant:
```tsx
<Button variant="gradient" size="sm" ...>
```

For the disabled state of the send button, add conditional:
```tsx
className={message.trim() ? '' : 'opacity-50 !bg-muted !shadow-none !text-muted-foreground'}
```

**Paperclip/attach button:**
Update hover: `text-muted-foreground hover:text-[var(--gradient-from)]`

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add components/chat/ChatWindow.tsx
git commit -m "feat: redesign message area with hybrid bubble style and gradient input"
```

---

## Task 8: Redesign Admin Layout & Navigation

**Files:**
- Modify: `components/admin/AdminLayout.tsx`
- Modify: `components/admin/AdminNavigation.tsx`

- [ ] **Step 1: Update AdminNavigation.tsx to dark theme**

Replace the root Card wrapper:
```tsx
<Card className={`h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
  <CardContent className="p-0 h-full flex flex-col">
```
With:
```tsx
<div className={`h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} flex flex-col`} style={{ background: 'linear-gradient(180deg, oklch(0.205 0.03 265), oklch(0.18 0.03 268))' }}>
```

And update the closing tags accordingly (`</CardContent></Card>` → `</div>`).

Remove the `Card` and `CardContent` imports if no longer used in this file.

**Header section:**
Replace:
```tsx
<div className="p-4 border-b">
```
With:
```tsx
<div className="p-4 border-b border-white/10">
```

**Shield icon and title:**
Replace:
```tsx
<Shield className="w-6 h-6 text-primary" />
<span className="font-bold text-lg">Admin Panel</span>
```
With:
```tsx
<Shield className="w-6 h-6 text-[var(--gradient-from)]" />
<span className="font-bold text-lg text-white">Admin Panel</span>
```

**Collapse button:**
Add `text-white/60 hover:text-white hover:bg-white/10` to the Button className.

**Navigation items — active state:**
Replace:
```tsx
${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}
```
With:
```tsx
${active ? 'bg-[oklch(0.59_0.16_255_/_20%)] text-white border-l-[3px] border-l-[oklch(0.59_0.16_255)]' : 'text-white/60 hover:text-white hover:bg-white/5'}
```

Remove `hover:bg-accent hover:text-accent-foreground` from the common classes.

**Tooltip (collapsed):**
Replace:
```tsx
bg-popover text-popover-foreground
```
With:
```tsx
bg-[oklch(0.25_0.035_260)] text-white
```

**System status section:**
Replace:
```tsx
<span className="text-muted-foreground">System Status</span>
```
With:
```tsx
<span className="text-white/50">System Status</span>
```

Replace `text-green-600` with `text-green-400`.

Replace all `text-muted-foreground` in the CPU/Memory/Storage labels with `text-white/50`.

Replace `font-medium` values with `font-medium text-white/80`.

**Separator elements:**
Replace `<Separator />` with:
```tsx
<div className="border-t border-white/10" />
```

**Logout button:**
Add `text-white/60 hover:text-white hover:bg-white/10` to the Button.

- [ ] **Step 2: Update AdminLayout.tsx**

Remove the "LocalChat Admin v1.0" badge. Find:
```tsx
<Badge variant="outline" className="text-xs">
  LocalChat Admin v1.0
</Badge>
```
Delete those lines.

Update the loading spinner:
Replace:
```tsx
<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
```
With:
```tsx
<div className="animate-spin rounded-full h-12 w-12 border-2 border-transparent border-t-[var(--gradient-from)] border-r-[var(--gradient-to)]"></div>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/AdminLayout.tsx components/admin/AdminNavigation.tsx
git commit -m "feat: redesign admin layout with dark sidebar and updated navigation"
```

---

## Task 9: Minor Component Alignment Pass

**Files:**
- Modify: `components/ui/notification-badge.tsx`
- Modify: `components/chat/NewChatDialog.tsx`
- Modify: `components/chat/UserSettingsDialog.tsx`
- Modify: `components/chat/GroupSettingsDialog.tsx`
- Modify: `components/chat/FileUpload.tsx`
- Modify: `components/admin/AdminDashboard.tsx`
- Modify: `components/admin/UserManagement.tsx`

- [ ] **Step 1: Update notification-badge.tsx**

Replace `bg-red-500` with `gradient-accent` to match the new theme:
```tsx
className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full gradient-accent text-white text-xs font-semibold flex items-center justify-center shadow-glow border-2 border-background z-20"
```

- [ ] **Step 2: Update NewChatDialog.tsx**

Update the "New Chat" trigger button to use the gradient variant:
Find the primary button that opens the dialog and change to `variant="gradient"`.

Online status dots: `fill-green-500 text-green-500` → keep as-is (these render on light dialog backgrounds).

- [ ] **Step 3: Update UserSettingsDialog.tsx**

Update the hardcoded blue info box:
Replace:
```tsx
bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-200
```
With:
```tsx
bg-[var(--gradient-from)]/5 border border-[var(--gradient-from)]/20 p-3 text-sm text-[var(--gradient-from)] dark:text-[var(--gradient-to)]
```

- [ ] **Step 4: Update GroupSettingsDialog.tsx**

The hardcoded role colors (yellow for admin, blue for moderator, amber for leave) can stay as semantic colors — they communicate role meaning, not brand. No changes needed.

- [ ] **Step 5: Update FileUpload.tsx**

The file-type icon colors are semantic (blue=image, red=PDF, green=spreadsheet, etc.) — keep as-is. These aren't brand colors.

Update the drop zone active state:
Replace `border-blue-500 bg-blue-50` with `border-[var(--gradient-from)] bg-[var(--gradient-from)]/5`.

- [ ] **Step 6: Update AdminDashboard.tsx**

The health status colors (green/yellow/red) are semantic — keep as-is.

Update alert left-border colors if they use brand blue — replace with `border-l-[var(--gradient-from)]`.

- [ ] **Step 7: Update UserManagement.tsx**

Role/status colors are semantic — keep as-is.

- [ ] **Step 8: Verify build**

```bash
npm run build
```

- [ ] **Step 9: Commit**

```bash
git add components/ui/notification-badge.tsx components/chat/NewChatDialog.tsx components/chat/UserSettingsDialog.tsx components/chat/FileUpload.tsx components/admin/AdminDashboard.tsx
git commit -m "feat: align minor components with Bold Accent theme"
```

---

## Note: Auto-Updated Components

The spec lists `card.tsx`, `badge.tsx`, `dialog.tsx`, and `input.tsx` under minor changes. These components use CSS variable tokens (`bg-card`, `bg-primary`, `border-input`, etc.) that automatically pick up the new colors from the Task 2 globals.css rewrite. No manual changes are needed for these files.

---

## Task 10: Final Build Verification & Cleanup

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: Clean build, no errors, no warnings about missing modules.

- [ ] **Step 2: Check for any remaining beta references**

```bash
grep -r "beta" --include="*.tsx" --include="*.ts" --include="*.css" components/ lib/ app/ | grep -v node_modules | grep -v ".superpowers"
```

Expected: No results (all beta code removed).

- [ ] **Step 3: Check for any remaining old color references that should have been updated**

```bash
grep -r "bg-muted/40" --include="*.tsx" components/ app/
```

Expected: No results (old login background removed).

- [ ] **Step 4: Commit any cleanup**

If any stray issues found, fix and commit:
```bash
git add -A
git commit -m "chore: final cleanup for UI redesign"
```
