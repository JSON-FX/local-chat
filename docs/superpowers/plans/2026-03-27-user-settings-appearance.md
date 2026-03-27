# User Settings: Profile Fixes, Appearance & Bubble Styling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the username bug in SSO sync, remove email from profile display, add a theme toggle (light/dark/system) and personal chat bubble color preset picker to the User Settings modal.

**Architecture:** Store user preferences (`theme`, `bubble_style`) in the existing `profile_data` JSON column on the `users` table. Add a `next-themes` ThemeProvider for theme management. Define bubble presets as a shared config used by both the settings UI and the chat bubble renderer. The `/api/users/preferences` endpoint merges preference updates into `profile_data`.

**Tech Stack:** Next.js, next-themes (already installed), Tailwind CSS (dark mode via `.dark` class), SQLite, shadcn/ui components.

---

### Task 1: Fix username bug in SSO sync

**Files:**
- Modify: `lib/auth.ts:69-106` (upsertLocalUser method)

- [ ] **Step 1: Extract SSO username and fix UPDATE query**

In `lib/auth.ts`, the `upsertLocalUser` method currently sets `username` to `fullName`. Fix it to extract `ssoEmployee.username`:

```typescript
// lib/auth.ts — upsertLocalUser method (replace lines 69-106)
static async upsertLocalUser(ssoEmployee: any, ssoRole: string): Promise<any> {
    const db = await getDatabase();
    const localRole = this.mapSsoRole(ssoRole);
    const uuid = ssoEmployee.uuid;
    const username = ssoEmployee.username || '';
    const fullName = ssoEmployee.full_name || `${ssoEmployee.first_name || ''} ${ssoEmployee.last_name || ''}`.trim();
    const email = ssoEmployee.email || '';
    const position = ssoEmployee.position || '';
    const officeName = ssoEmployee.office?.name || '';

    // Try to find existing user
    const existingUser = await db.get(
      'SELECT * FROM users WHERE sso_employee_uuid = ?',
      [uuid]
    );

    if (existingUser) {
      // Update profile
      await db.run(
        `UPDATE users SET
          username = ?, email = ?, role = ?, sso_role = ?,
          full_name = ?, position = ?, office_name = ?,
          profile_synced_at = CURRENT_TIMESTAMP, status = 'active'
        WHERE sso_employee_uuid = ?`,
        [username, email, localRole, ssoRole, fullName, position, officeName, uuid]
      );
      return { ...existingUser, username, role: localRole, sso_role: ssoRole, full_name: fullName, email, position, office_name: officeName };
    }

    // Create new user
    await db.run(
      `INSERT INTO users (sso_employee_uuid, username, email, role, sso_role, full_name, position, office_name, profile_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [uuid, username, email, localRole, ssoRole, fullName, position, officeName]
    );

    const newUser = await db.get('SELECT * FROM users WHERE sso_employee_uuid = ?', [uuid]);
    return newUser;
  }
```

Key changes:
- Added `const username = ssoEmployee.username || '';` (line after uuid)
- UPDATE params: first param is now `username` instead of `fullName`
- INSERT params: second param is now `username` instead of `fullName`
- Return object for existing user includes `username` instead of inheriting old value

- [ ] **Step 2: Verify the change compiles**

Run: `cd /Users/jsonse/Documents/development/lgu-chat && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `auth.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "fix(auth): extract SSO username instead of using full_name for username column"
```

---

### Task 2: Update User type and /api/auth/me to include preferences

**Files:**
- Modify: `lib/types.ts:3-17` (User interface)
- Modify: `app/api/auth/me/route.ts`

- [ ] **Step 1: Add preference fields to User interface**

In `lib/types.ts`, add `bubble_style` and `theme` to the User interface:

```typescript
export interface User {
  id: number;
  username: string;
  sso_employee_uuid?: string;
  role: 'admin' | 'user';
  sso_role?: string;
  full_name?: string;
  position?: string;
  office_name?: string;
  email?: string;
  avatar_path?: string;
  profile_synced_at?: string;
  created_at: string;
  last_login?: string;
  bubble_style?: string;
  theme?: string;
}
```

- [ ] **Step 2: Update /api/auth/me to parse profile_data**

In `app/api/auth/me/route.ts`, add `profile_data` to the SELECT query and parse the JSON to extract `bubble_style` and `theme`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { getDatabase } from '../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const db = await getDatabase();
    const fullUser = await db.get(
      'SELECT id, sso_employee_uuid, username, role, sso_role, full_name, position, office_name, email, avatar_path, created_at, last_login, profile_synced_at, profile_data FROM users WHERE id = ?',
      [user.id]
    );

    if (!fullUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse profile_data JSON and merge preferences into response
    let preferences: Record<string, any> = {};
    if (fullUser.profile_data) {
      try {
        preferences = JSON.parse(fullUser.profile_data);
      } catch {
        // Ignore malformed JSON
      }
    }

    const { profile_data, ...userData } = fullUser;

    return NextResponse.json({
      success: true,
      data: {
        ...userData,
        bubble_style: preferences.bubble_style || 'default',
        theme: preferences.theme || 'system',
      },
      message: 'User profile retrieved successfully'
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get user profile' },
      { status: 401 }
    );
  }
}
```

- [ ] **Step 3: Verify the change compiles**

Run: `cd /Users/jsonse/Documents/development/lgu-chat && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts app/api/auth/me/route.ts
git commit -m "feat(api): add bubble_style and theme preferences to User type and /api/auth/me"
```

---

### Task 3: Create preferences API endpoint

**Files:**
- Create: `app/api/users/preferences/route.ts`

- [ ] **Step 1: Create PUT /api/users/preferences endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { getDatabase } from '../../../../lib/database';

const VALID_THEMES = ['light', 'dark', 'system'];
const VALID_BUBBLE_STYLES = [
  'default', 'emerald', 'violet', 'rose', 'amber', 'slate',
  'ocean', 'sunset', 'aurora', 'lavender'
];

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { bubble_style, theme } = body;

    // Validate inputs
    if (bubble_style !== undefined && !VALID_BUBBLE_STYLES.includes(bubble_style)) {
      return NextResponse.json(
        { success: false, error: `Invalid bubble_style. Must be one of: ${VALID_BUBBLE_STYLES.join(', ')}` },
        { status: 400 }
      );
    }

    if (theme !== undefined && !VALID_THEMES.includes(theme)) {
      return NextResponse.json(
        { success: false, error: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}` },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get current profile_data
    const row = await db.get('SELECT profile_data FROM users WHERE id = ?', [user.id]);
    let profileData: Record<string, any> = {};
    if (row?.profile_data) {
      try {
        profileData = JSON.parse(row.profile_data);
      } catch {
        // Reset if malformed
      }
    }

    // Merge updates
    if (bubble_style !== undefined) profileData.bubble_style = bubble_style;
    if (theme !== undefined) profileData.theme = theme;

    // Save
    await db.run(
      'UPDATE users SET profile_data = ? WHERE id = ?',
      [JSON.stringify(profileData), user.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        bubble_style: profileData.bubble_style || 'default',
        theme: profileData.theme || 'system',
      },
      message: 'Preferences updated successfully'
    });
  } catch (error: any) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update preferences' },
      { status: 401 }
    );
  }
}
```

- [ ] **Step 2: Verify the change compiles**

Run: `cd /Users/jsonse/Documents/development/lgu-chat && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/users/preferences/route.ts
git commit -m "feat(api): add PUT /api/users/preferences for bubble_style and theme"
```

---

### Task 4: Create bubble presets config

**Files:**
- Create: `lib/bubble-presets.ts`

- [ ] **Step 1: Create the shared presets definition file**

```typescript
export interface BubblePreset {
  key: string;
  name: string;
  type: 'solid' | 'gradient';
  light: {
    bg: string;
    border: string;
  };
  dark: {
    bg: string;
    border: string;
  };
}

export const BUBBLE_PRESETS: BubblePreset[] = [
  {
    key: 'default',
    name: 'Blue',
    type: 'solid',
    light: { bg: '#eff6ff', border: '#dbeafe' },
    dark: { bg: 'oklch(0.59 0.16 255 / 15%)', border: 'oklch(0.59 0.16 255 / 20%)' },
  },
  {
    key: 'emerald',
    name: 'Emerald',
    type: 'solid',
    light: { bg: '#ecfdf5', border: '#d1fae5' },
    dark: { bg: 'oklch(0.55 0.15 160 / 15%)', border: 'oklch(0.55 0.15 160 / 20%)' },
  },
  {
    key: 'violet',
    name: 'Violet',
    type: 'solid',
    light: { bg: '#f5f3ff', border: '#ede9fe' },
    dark: { bg: 'oklch(0.55 0.15 290 / 15%)', border: 'oklch(0.55 0.15 290 / 20%)' },
  },
  {
    key: 'rose',
    name: 'Rose',
    type: 'solid',
    light: { bg: '#fff1f2', border: '#ffe4e6' },
    dark: { bg: 'oklch(0.55 0.15 15 / 15%)', border: 'oklch(0.55 0.15 15 / 20%)' },
  },
  {
    key: 'amber',
    name: 'Amber',
    type: 'solid',
    light: { bg: '#fffbeb', border: '#fef3c7' },
    dark: { bg: 'oklch(0.55 0.15 75 / 15%)', border: 'oklch(0.55 0.15 75 / 20%)' },
  },
  {
    key: 'slate',
    name: 'Slate',
    type: 'solid',
    light: { bg: '#f8fafc', border: '#e2e8f0' },
    dark: { bg: 'oklch(0.40 0.02 260 / 25%)', border: 'oklch(0.40 0.02 260 / 35%)' },
  },
  {
    key: 'ocean',
    name: 'Ocean',
    type: 'gradient',
    light: { bg: 'linear-gradient(135deg, #e0f2fe, #ccfbf1)', border: '#bae6fd' },
    dark: { bg: 'linear-gradient(135deg, oklch(0.55 0.15 230 / 18%), oklch(0.55 0.15 175 / 18%))', border: 'oklch(0.55 0.15 230 / 25%)' },
  },
  {
    key: 'sunset',
    name: 'Sunset',
    type: 'gradient',
    light: { bg: 'linear-gradient(135deg, #fff7ed, #fff1f2)', border: '#fed7aa' },
    dark: { bg: 'linear-gradient(135deg, oklch(0.55 0.15 50 / 18%), oklch(0.55 0.15 10 / 18%))', border: 'oklch(0.55 0.15 50 / 25%)' },
  },
  {
    key: 'aurora',
    name: 'Aurora',
    type: 'gradient',
    light: { bg: 'linear-gradient(135deg, #ecfdf5, #f5f3ff)', border: '#bbf7d0' },
    dark: { bg: 'linear-gradient(135deg, oklch(0.55 0.15 155 / 18%), oklch(0.55 0.15 290 / 18%))', border: 'oklch(0.55 0.15 155 / 25%)' },
  },
  {
    key: 'lavender',
    name: 'Lavender',
    type: 'gradient',
    light: { bg: 'linear-gradient(135deg, #f5f3ff, #eff6ff)', border: '#ddd6fe' },
    dark: { bg: 'linear-gradient(135deg, oklch(0.55 0.15 290 / 18%), oklch(0.55 0.15 255 / 18%))', border: 'oklch(0.55 0.15 290 / 25%)' },
  },
];

export function getPreset(key: string): BubblePreset {
  return BUBBLE_PRESETS.find(p => p.key === key) || BUBBLE_PRESETS[0];
}

export function getBubbleStyle(presetKey: string, isDark: boolean): React.CSSProperties {
  const preset = getPreset(presetKey);
  const colors = isDark ? preset.dark : preset.light;

  const style: React.CSSProperties = {
    borderColor: colors.border,
  };

  if (preset.type === 'gradient') {
    style.background = colors.bg;
  } else {
    style.backgroundColor = colors.bg;
  }

  return style;
}
```

- [ ] **Step 2: Verify the change compiles**

Run: `cd /Users/jsonse/Documents/development/lgu-chat && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/bubble-presets.ts
git commit -m "feat: add bubble preset definitions with light/dark color configs"
```

---

### Task 5: Add ThemeProvider to app layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Wrap the app with next-themes ThemeProvider**

The project already has `next-themes` installed (used by `sonner.tsx`). Add the ThemeProvider to the root layout:

```typescript
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Use system fonts for better Docker build compatibility
const fontSans = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const fontMono = "Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export const metadata: Metadata = {
  title: "LGU-Chat - Secure Internal Messaging",
  description: "Secure, private messaging for the Local Government of Quezon Bukidnon requiring air-gapped communication.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        style={{
          fontFamily: fontSans,
          '--font-sans': fontSans,
          '--font-mono': fontMono,
        } as React.CSSProperties}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Key changes:
- Import `ThemeProvider` from `next-themes`
- Add `suppressHydrationWarning` to `<html>` (required by next-themes)
- Wrap children + Toaster in `<ThemeProvider>` with `attribute="class"` (matches Tailwind's `.dark` class strategy)

- [ ] **Step 2: Verify the app still starts**

Run: `cd /Users/jsonse/Documents/development/lgu-chat && npx next build 2>&1 | tail -20`
Expected: Build completes without errors

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add next-themes ThemeProvider to root layout for dark/light mode support"
```

---

### Task 6: Update UserSettingsDialog — Profile fixes + Appearance tab

**Files:**
- Modify: `components/chat/UserSettingsDialog.tsx`

This is the largest task. It makes three changes in one file:
1. Remove email field, remove username badge from Profile tab
2. Add Appearance tab with theme toggle
3. Add bubble style preset picker to Appearance tab

- [ ] **Step 1: Replace UserSettingsDialog.tsx with updated version**

Replace the full file content:

```typescript
'use client';

import { useState, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Settings, Camera, Upload, Trash2, Info, Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import { toast } from 'sonner';
import { User as UserType } from '@/lib/types';
import { BUBBLE_PRESETS, getPreset } from '@/lib/bubble-presets';
import { cn } from '@/lib/utils';

interface UserSettingsDialogProps {
  currentUser: UserType | null;
  onUserUpdate?: (user: UserType) => void;
  children?: React.ReactNode;
}

export function UserSettingsDialog({ currentUser, onUserUpdate, children }: UserSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'avatar' | 'appearance'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme: currentTheme, setTheme } = useTheme();

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const handleAvatarUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = localStorage.getItem('auth_token');

      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Avatar updated successfully');
        if (onUserUpdate && data.data) {
          onUserUpdate(data.data);
        }
      } else {
        toast.error(data.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onUserUpdate]);

  const handleAvatarDelete = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch('/api/users/avatar', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Avatar removed successfully');
        if (onUserUpdate && data.data) {
          onUserUpdate(data.data);
        }
      } else {
        toast.error(data.error || 'Failed to remove avatar');
      }
    } catch (error) {
      console.error('Avatar delete error:', error);
      toast.error('Failed to remove avatar');
    } finally {
      setIsLoading(false);
    }
  }, [onUserUpdate]);

  const savePreference = useCallback(async (key: string, value: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value }),
      });

      const data = await response.json();
      if (data.success && onUserUpdate && currentUser) {
        onUserUpdate({ ...currentUser, ...data.data });
      }
      return data.success;
    } catch (error) {
      console.error('Save preference error:', error);
      return false;
    }
  }, [currentUser, onUserUpdate]);

  const handleThemeChange = useCallback(async (newTheme: string) => {
    setTheme(newTheme);
    const saved = await savePreference('theme', newTheme);
    if (saved) {
      toast.success('Theme updated');
    } else {
      toast.error('Failed to save theme preference');
    }
  }, [setTheme, savePreference]);

  const handleBubbleStyleChange = useCallback(async (styleKey: string) => {
    const saved = await savePreference('bubble_style', styleKey);
    if (saved) {
      toast.success('Bubble style updated');
    } else {
      toast.error('Failed to save bubble style');
    }
  }, [savePreference]);

  const selectedBubbleStyle = currentUser?.bubble_style || 'default';

  const themeOptions = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Settings</span>
          </DialogTitle>
          <DialogDescription>
            View your profile information and manage your avatar
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg mb-6" role="tablist">
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('profile')}
            className="flex-1"
            role="tab"
            aria-selected={activeTab === 'profile'}
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </Button>
          <Button
            variant={activeTab === 'avatar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('avatar')}
            className="flex-1"
            role="tab"
            aria-selected={activeTab === 'avatar'}
          >
            <Camera className="h-4 w-4 mr-2" />
            Avatar
          </Button>
          <Button
            variant={activeTab === 'appearance' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('appearance')}
            className="flex-1"
            role="tab"
            aria-selected={activeTab === 'appearance'}
          >
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </Button>
        </div>

        {/* Profile Tab - Read-only SSO information */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your profile details from LGU Single Sign-On
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex items-center gap-2 rounded-lg bg-[var(--gradient-from)]/5 border border-[var(--gradient-from)]/20 p-3 text-sm text-[var(--gradient-from)] dark:text-[var(--gradient-to)]"
                role="status"
              >
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>This information is managed by LGU-SSO and cannot be edited here.</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <p className="text-sm font-medium">
                    {currentUser?.full_name || 'Not set'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Username</Label>
                    <p className="text-sm font-medium">{currentUser?.username}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Position</Label>
                    <p className="text-sm font-medium">
                      {currentUser?.position || 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Office</Label>
                  <p className="text-sm font-medium">
                    {currentUser?.office_name || 'Not set'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">
                  Role: {currentUser?.role}
                </Badge>
                {currentUser?.sso_role && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    SSO Role: {currentUser.sso_role}
                  </Badge>
                )}
              </div>

              {currentUser?.profile_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(currentUser.profile_synced_at).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Avatar Tab - Locally editable */}
        {activeTab === 'avatar' && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>
                Upload or change your profile picture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  {currentUser?.avatar_path ? (
                    <img
                      src={`/api/files/download/${currentUser.avatar_path}`}
                      alt={currentUser.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted flex items-center justify-center text-2xl font-semibold">
                      {currentUser?.full_name?.[0] || currentUser?.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{currentUser?.full_name || currentUser?.username}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentUser?.avatar_path ? 'Custom avatar' : 'Default avatar'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="avatar-upload" className="text-sm font-medium">
                    Upload New Avatar
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose a JPG, PNG, or GIF file (max 5MB)
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                    {currentUser?.avatar_path && (
                      <Button
                        onClick={handleAvatarDelete}
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                </div>

                {isLoading && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
                    <span>Processing avatar...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            {/* Theme Section */}
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>
                  Choose your preferred appearance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => handleThemeChange(key)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                        (currentUser?.theme || 'system') === key
                          ? "border-[var(--gradient-from)] bg-[var(--gradient-from)]/5"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{label}</span>
                      {(currentUser?.theme || 'system') === key && (
                        <Check className="h-4 w-4 text-[var(--gradient-from)]" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bubble Style Section */}
            <Card>
              <CardHeader>
                <CardTitle>Chat Bubble Style</CardTitle>
                <CardDescription>
                  Choose how your sent messages appear
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BUBBLE_PRESETS.map((preset) => {
                    const isSelected = selectedBubbleStyle === preset.key;
                    return (
                      <button
                        key={preset.key}
                        onClick={() => handleBubbleStyleChange(preset.key)}
                        className={cn(
                          "relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors",
                          isSelected
                            ? "border-[var(--gradient-from)] bg-[var(--gradient-from)]/5"
                            : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        {/* Preview bubble */}
                        <div
                          className="w-full rounded-[16px_4px_16px_16px] px-3 py-2 border text-xs"
                          style={{
                            ...(preset.type === 'gradient'
                              ? { background: preset.light.bg }
                              : { backgroundColor: preset.light.bg }),
                            borderColor: preset.light.border,
                          }}
                        >
                          <span className="text-foreground/70">Hello!</span>
                        </div>
                        <span className="text-xs font-medium">{preset.name}</span>
                        {isSelected && (
                          <Check className="absolute top-2 right-2 h-4 w-4 text-[var(--gradient-from)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

Key changes from original:
- **Profile tab:** Removed email field. Removed Username badge. Moved Position next to Username in the grid (2-col layout). Office gets its own row.
- **Avatar tab:** Removed email display line (`<p className="text-sm text-muted-foreground">{currentUser?.email}</p>`).
- **Appearance tab (new):** Theme toggle with 3 cards + bubble preset grid with preview bubbles.
- **New imports:** `useTheme` from `next-themes`, `Palette`, `Sun`, `Moon`, `Monitor`, `Check` from lucide-react, `BUBBLE_PRESETS`/`getPreset` from bubble-presets, `cn` from utils.
- **New handlers:** `savePreference`, `handleThemeChange`, `handleBubbleStyleChange`.

- [ ] **Step 2: Verify the change compiles**

Run: `cd /Users/jsonse/Documents/development/lgu-chat && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/chat/UserSettingsDialog.tsx
git commit -m "feat(settings): add Appearance tab with theme toggle and bubble style picker, remove email, fix profile layout"
```

---

### Task 7: Apply bubble preset to chat message bubbles

**Files:**
- Modify: `components/chat/ChatWindow.tsx:756-761`

- [ ] **Step 1: Import getBubbleStyle and useTheme**

At the top of `ChatWindow.tsx`, add these imports alongside the existing ones:

```typescript
import { getBubbleStyle } from '@/lib/bubble-presets';
import { useTheme } from 'next-themes';
```

- [ ] **Step 2: Add theme hook and compute bubble style**

Inside the `ChatWindow` component function (after the existing state declarations around line 74), add:

```typescript
const { resolvedTheme } = useTheme();
const isDark = resolvedTheme === 'dark';
const bubbleStyle = currentUser?.bubble_style || 'default';
```

- [ ] **Step 3: Replace hardcoded bubble className with dynamic styling**

Find the message bubble div (around line 756-761):

```typescript
{/* Message bubble */}
<div className={cn(
  "break-words",
  isCurrentUser
    ? "bg-[#eff6ff] dark:bg-[oklch(0.59_0.16_255_/_15%)] border border-[#dbeafe] dark:border-[oklch(0.59_0.16_255_/_20%)] rounded-[16px_4px_16px_16px] px-3.5 py-2.5"
    : "bg-[#f8fafc] dark:bg-white/5 border border-[#f1f5f9] dark:border-white/8 rounded-[4px_16px_16px_16px] px-3.5 py-2.5"
)}>
```

Replace with:

```typescript
{/* Message bubble */}
<div
  className={cn(
    "break-words border",
    isCurrentUser
      ? "rounded-[16px_4px_16px_16px] px-3.5 py-2.5"
      : "bg-[#f8fafc] dark:bg-white/5 border-[#f1f5f9] dark:border-white/8 rounded-[4px_16px_16px_16px] px-3.5 py-2.5"
  )}
  style={isCurrentUser ? getBubbleStyle(bubbleStyle, isDark) : undefined}
>
```

This applies the dynamic preset style only to the current user's messages. Other users' messages keep the existing hardcoded style.

- [ ] **Step 4: Verify the change compiles**

Run: `cd /Users/jsonse/Documents/development/lgu-chat && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/chat/ChatWindow.tsx
git commit -m "feat(chat): apply user's bubble style preset to sent message bubbles"
```

---

### Task 8: Sync theme preference on login

**Files:**
- Modify: `components/chat/ChatLayout.tsx`

When the user loads the app, the `/api/auth/me` response now includes `theme`. We need to apply it to `next-themes` on initial load so the user's saved preference takes effect.

- [ ] **Step 1: Add theme sync after user data is fetched**

Find where `setCurrentUser` is called after the API response (around line 485 in ChatLayout.tsx). After `setCurrentUser(userResponse.data)`, add the theme sync:

```typescript
setCurrentUser(userResponse.data);

// Sync theme preference from server
if (userResponse.data.theme) {
  const { setTheme } = await import('next-themes');
  // Theme is applied via localStorage by next-themes automatically,
  // but we also store the server preference for consistency
  localStorage.setItem('theme', userResponse.data.theme);
}
```

Actually, since `useTheme` is a hook and can't be called conditionally, we need a different approach. Instead, use a `useEffect` that watches `currentUser.theme`:

In `ChatLayout.tsx`, add the import at the top:

```typescript
import { useTheme } from 'next-themes';
```

Inside the component, add the hook and effect:

```typescript
const { setTheme } = useTheme();

// Sync saved theme preference when user data loads
useEffect(() => {
  if (currentUser?.theme) {
    setTheme(currentUser.theme);
  }
}, [currentUser?.theme, setTheme]);
```

- [ ] **Step 2: Verify the change compiles**

Run: `cd /Users/jsonse/Documents/development/lgu-chat && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/chat/ChatLayout.tsx
git commit -m "feat: sync user theme preference from server on app load"
```

---

### Task 9: Manual verification

- [ ] **Step 1: Start the dev server and test**

Run: `cd /Users/jsonse/Documents/development/lgu-chat && npm run dev`

Test checklist:
1. Log in via SSO — verify username field in the profile tab now shows the SSO login username (e.g., `j.doe`) instead of the full name
2. Verify email field is no longer shown in the Profile tab
3. Verify the Username badge is removed from the badges section
4. Open Appearance tab — verify Theme section shows Light/Dark/System cards
5. Click Dark — verify app switches to dark mode immediately
6. Click Light — verify app switches to light mode
7. Click System — verify app follows OS preference
8. In Appearance tab, click a bubble preset (e.g., Emerald) — verify toast confirms save
9. Go to a chat conversation — verify your sent messages use the selected bubble color
10. Verify other users' messages remain the default gray/white style
11. Switch between solid and gradient presets — verify gradients render correctly
12. Switch theme while a bubble preset is active — verify dark mode variant of the bubble color looks correct
13. Refresh the page — verify both theme and bubble style preferences persist

- [ ] **Step 2: Final commit if any fixes needed**

If any adjustments were needed during testing, commit them.
