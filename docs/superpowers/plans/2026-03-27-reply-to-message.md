# Reply to Message — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline reply-to-message functionality so users can reply to specific messages in both direct and group conversations, with an embedded quote preview (iMessage/Messenger style).

**Architecture:** Add a `reply_to_id` foreign key column to the existing `messages` table. Update message fetch queries with a LEFT JOIN to pull reply metadata. On the frontend, add reply state to ChatWindow, a hover reply button on message bubbles, a composer banner, and an embedded reply preview inside message bubbles with scroll-to-original on click.

**Tech Stack:** Next.js 15 / React 19, TypeScript, SQLite3, Socket.io, Tailwind CSS, shadcn/UI, Lucide icons, Sonner (toasts)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/schema.ts` | Modify | Add `reply_to_id` migration |
| `lib/models.ts` | Modify | Add `reply_to_id` to `CreateMessageData` |
| `lib/types.ts` | Modify | Add `ReplyTo` interface, update `Message` |
| `lib/messages.ts` | Modify | Add `reply_to_id` to INSERT, add LEFT JOIN to fetch queries |
| `app/api/messages/send/route.ts` | Modify | Accept and validate `reply_to_id` |
| `app/api/messages/direct/[userId]/route.ts` | No change | Already calls `MessageService.getDirectMessages` which we update |
| `app/api/messages/group/[groupId]/route.ts` | No change | Already calls `MessageService.getGroupMessages` which we update |
| `lib/api.ts` | Modify | Add `reply_to_id` param to `sendMessage` and `sendGroupMessage` |
| `lib/socket-client.ts` | Modify | Add `reply_to_id` param to `sendMessage` and `sendGroupMessage` |
| `lib/socket.ts` | Modify | Pass `reply_to_id` through socket send handler, include reply data in broadcast |
| `components/chat/ChatWindow.tsx` | Modify | Add reply state, hover button, composer banner, reply preview, scroll-to-original |
| `components/chat/ChatLayout.tsx` | Modify | Pass `reply_to_id` through `handleSendMessage` |
| `app/globals.css` | Modify | Add highlight animation keyframe |

---

### Task 1: Database Migration — Add `reply_to_id` Column

**Files:**
- Modify: `lib/schema.ts:214-293` (inside `runMigrations`)

- [ ] **Step 1: Add migration code to `runMigrations`**

At the end of the `runMigrations` function in `lib/schema.ts`, after the `last_activity` migration block (around line 289), add:

```typescript
    // Check and add reply_to_id column to messages table
    const messagesTableInfo = await db.all("PRAGMA table_info(messages)");
    const messagesColumns = messagesTableInfo.map((column: any) => column.name);

    if (!messagesColumns.includes('reply_to_id')) {
      console.log('Adding reply_to_id column to messages table...');
      await db.run('ALTER TABLE messages ADD COLUMN reply_to_id INTEGER REFERENCES messages(id)');
      await db.run('CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id)');
      console.log('reply_to_id column added to messages table');
    }
```

Note: This reuses the `messagesTableInfo` variable name. The existing code uses `messageTableInfo` (singular) earlier in the function for a different check. Use `messagesTableInfo` (plural) to avoid collision with the existing variable at line 263.

- [ ] **Step 2: Verify the migration runs without error**

Run: `npx tsx scripts/init-db.ts`
Expected: No errors. Console should show "reply_to_id column added to messages table" on first run.

- [ ] **Step 3: Verify column exists**

Run: `sqlite3 data/localchat.db "PRAGMA table_info(messages);" | grep reply_to_id`
Expected: Output contains `reply_to_id` with type `INTEGER`

- [ ] **Step 4: Commit**

```bash
git add lib/schema.ts
git commit -m "feat(reply): add reply_to_id column migration to messages table"
```

---

### Task 2: Backend Types — Update `CreateMessageData` and Frontend Types

**Files:**
- Modify: `lib/models.ts:41-49` (`CreateMessageData` interface)
- Modify: `lib/types.ts:19-41` (`Message` interface)

- [ ] **Step 1: Add `reply_to_id` to `CreateMessageData` in `lib/models.ts`**

In `lib/models.ts`, add `reply_to_id` to the `CreateMessageData` interface:

```typescript
export interface CreateMessageData {
  sender_id: number;
  recipient_id?: number;
  group_id?: number;
  content: string;
  message_type?: 'text' | 'file' | 'image' | 'system';
  file_path?: string;
  file_name?: string;
  file_size?: number;
  reply_to_id?: number;
}
```

- [ ] **Step 2: Add `ReplyTo` interface and update `Message` in `lib/types.ts`**

In `lib/types.ts`, add the `ReplyTo` interface before the `Message` interface, and add `reply_to` to `Message`:

```typescript
export interface ReplyTo {
  id: number;
  content: string;
  message_type: 'text' | 'file' | 'image' | 'system';
  file_name?: string;
  file_path?: string;
  file_type?: string;
  sender_id: number;
  sender_name: string;
  is_deleted: boolean;
}

export interface Message {
  id: number;
  sender_id: number;
  recipient_id?: number;
  group_id?: number;
  content: string;
  message_type: 'text' | 'file' | 'image' | 'system';
  file_path?: string;
  file_name?: string;
  file_size?: number;
  timestamp: string;
  sender_username?: string;
  sender_name?: string;
  sender_last_name?: string;
  sender_middle_name?: string;
  sender_avatar?: string | null;
  queued?: boolean;
  queuedAt?: number;
  reply_to?: ReplyTo | null;
  // Read status information
  read_by?: MessageRead[]; // Users who have read this message
  is_read?: boolean; // For direct messages - if the recipient has read it
  read_at?: string; // When the message was read (for direct messages)
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors related to `ReplyTo` or `reply_to_id`.

- [ ] **Step 4: Commit**

```bash
git add lib/models.ts lib/types.ts
git commit -m "feat(reply): add ReplyTo type and reply_to_id to message data interfaces"
```

---

### Task 3: Message Service — Update INSERT and Fetch Queries

**Files:**
- Modify: `lib/messages.ts:97-200` (`sendMessage` method)
- Modify: `lib/messages.ts:203-234` (`getDirectMessages` method)
- Modify: `lib/messages.ts:237-297` (`getGroupMessages` method)

- [ ] **Step 1: Update `sendMessage` to include `reply_to_id` in INSERT**

In `lib/messages.ts`, in the `sendMessage` method, update the INSERT statement (around line 161) to include `reply_to_id`:

Change the INSERT SQL from:
```typescript
      const result = await db.run(
        `INSERT INTO messages (sender_id, recipient_id, group_id, content, message_type, file_path, original_filename, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageData.sender_id,
          messageData.recipient_id || null,
          messageData.group_id || null,
          messageData.content,
          messageData.message_type || 'text',
          hasValidAttachment ? messageData.file_path : null,
          hasValidAttachment ? messageData.file_name : null,
          hasValidAttachment ? messageData.file_size : null
        ]
      );
```

To:
```typescript
      const result = await db.run(
        `INSERT INTO messages (sender_id, recipient_id, group_id, content, message_type, file_path, original_filename, file_size, reply_to_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageData.sender_id,
          messageData.recipient_id || null,
          messageData.group_id || null,
          messageData.content,
          messageData.message_type || 'text',
          hasValidAttachment ? messageData.file_path : null,
          hasValidAttachment ? messageData.file_name : null,
          hasValidAttachment ? messageData.file_size : null,
          messageData.reply_to_id || null
        ]
      );
```

- [ ] **Step 2: Update `sendMessage` to return reply data after insert**

After the message is saved, we need to return the full message with reply data. Update the final query in `sendMessage` (around line 191) that retrieves the created message. Change:

```typescript
      const message = await db.get('SELECT * FROM messages WHERE id = ?', [messageId]);
```

To:
```typescript
      const message = await db.get(
        `SELECT m.*,
          rm.id AS reply_to_message_id,
          rm.content AS reply_to_content,
          rm.message_type AS reply_to_message_type,
          rm.file_name AS reply_to_file_name,
          rm.file_path AS reply_to_file_path,
          rm.file_type AS reply_to_file_type,
          rm.sender_id AS reply_to_sender_id,
          rm.is_deleted AS reply_to_is_deleted,
          ru.username AS reply_to_sender_username,
          ru.name AS reply_to_sender_name,
          ru.last_name AS reply_to_sender_last_name
        FROM messages m
        LEFT JOIN messages rm ON m.reply_to_id = rm.id
        LEFT JOIN users ru ON rm.sender_id = ru.id
        WHERE m.id = ?`,
        [messageId]
      );
```

Also update the fallback query (around line 184) that fetches the last inserted message. Change:

```typescript
        const message = await db.get(
          'SELECT * FROM messages WHERE sender_id = ? ORDER BY id DESC LIMIT 1',
          [messageData.sender_id]
        );
```

To:
```typescript
        const message = await db.get(
          `SELECT m.*,
            rm.id AS reply_to_message_id,
            rm.content AS reply_to_content,
            rm.message_type AS reply_to_message_type,
            rm.file_name AS reply_to_file_name,
            rm.file_path AS reply_to_file_path,
            rm.file_type AS reply_to_file_type,
            rm.sender_id AS reply_to_sender_id,
            rm.is_deleted AS reply_to_is_deleted,
            ru.username AS reply_to_sender_username,
            ru.name AS reply_to_sender_name,
            ru.last_name AS reply_to_sender_last_name
          FROM messages m
          LEFT JOIN messages rm ON m.reply_to_id = rm.id
          LEFT JOIN users ru ON rm.sender_id = ru.id
          WHERE m.sender_id = ? ORDER BY m.id DESC LIMIT 1`,
          [messageData.sender_id]
        );
```

- [ ] **Step 3: Add a static helper method to format reply data from flat DB rows**

Add this method to `MessageService` class at the top (after the `validateFilename` method, around line 50):

```typescript
  // Format flat reply_to columns from a DB row into a nested reply_to object
  static formatReplyData(row: any): any {
    if (!row || !row.reply_to_message_id) {
      const { reply_to_message_id, reply_to_content, reply_to_message_type, reply_to_file_name, reply_to_file_path, reply_to_file_type, reply_to_sender_id, reply_to_is_deleted, reply_to_sender_username, reply_to_sender_name, reply_to_sender_last_name, ...rest } = row || {};
      return { ...rest, reply_to: null };
    }

    const { reply_to_message_id, reply_to_content, reply_to_message_type, reply_to_file_name, reply_to_file_path, reply_to_file_type, reply_to_sender_id, reply_to_is_deleted, reply_to_sender_username, reply_to_sender_name, reply_to_sender_last_name, ...rest } = row;

    // Build display name: "Name Last_name" format
    const senderName = [reply_to_sender_name, reply_to_sender_last_name]
      .filter(Boolean)
      .join(' ') || reply_to_sender_username || 'Unknown';

    return {
      ...rest,
      reply_to: {
        id: reply_to_message_id,
        content: reply_to_content,
        message_type: reply_to_message_type,
        file_name: reply_to_file_name,
        file_path: reply_to_file_path,
        file_type: reply_to_file_type,
        sender_id: reply_to_sender_id,
        sender_name: senderName,
        is_deleted: !!reply_to_is_deleted
      }
    };
  }
```

- [ ] **Step 4: Update `getDirectMessages` to include reply data**

In `lib/messages.ts`, update the `getDirectMessages` method. Change the SELECT query (around line 207) from:

```typescript
      const messages = await db.all(
        `SELECT m.*, u.username as sender_username, u.full_name as sender_name, u.avatar_path as sender_avatar,
         (
           SELECT COUNT(*) > 0
           FROM message_reads mr
           WHERE mr.message_id = m.id AND mr.user_id = ?
         ) as is_read,
         (
           SELECT mr.read_at
           FROM message_reads mr
           WHERE mr.message_id = m.id AND mr.user_id = ?
         ) as read_at
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.is_deleted = 0
         AND ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
         AND (m.user_deleted_by IS NULL OR m.user_deleted_by = '' OR NOT m.user_deleted_by LIKE '%,' || ? || ',%')
         ORDER BY m.timestamp DESC
         LIMIT ? OFFSET ?`,
        [userId2, userId2, userId1, userId2, userId2, userId1, userId1, limit, offset]
      );
```

To:

```typescript
      const messages = await db.all(
        `SELECT m.*, u.username as sender_username, u.full_name as sender_name, u.avatar_path as sender_avatar,
         u.name as sender_name, u.last_name as sender_last_name, u.middle_name as sender_middle_name,
         (
           SELECT COUNT(*) > 0
           FROM message_reads mr
           WHERE mr.message_id = m.id AND mr.user_id = ?
         ) as is_read,
         (
           SELECT mr.read_at
           FROM message_reads mr
           WHERE mr.message_id = m.id AND mr.user_id = ?
         ) as read_at,
         rm.id AS reply_to_message_id,
         rm.content AS reply_to_content,
         rm.message_type AS reply_to_message_type,
         rm.file_name AS reply_to_file_name,
         rm.file_path AS reply_to_file_path,
         rm.file_type AS reply_to_file_type,
         rm.sender_id AS reply_to_sender_id,
         rm.is_deleted AS reply_to_is_deleted,
         ru.username AS reply_to_sender_username,
         ru.name AS reply_to_sender_name,
         ru.last_name AS reply_to_sender_last_name
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         LEFT JOIN messages rm ON m.reply_to_id = rm.id
         LEFT JOIN users ru ON rm.sender_id = ru.id
         WHERE m.is_deleted = 0
         AND ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
         AND (m.user_deleted_by IS NULL OR m.user_deleted_by = '' OR NOT m.user_deleted_by LIKE '%,' || ? || ',%')
         ORDER BY m.timestamp DESC
         LIMIT ? OFFSET ?`,
        [userId2, userId2, userId1, userId2, userId2, userId1, userId1, limit, offset]
      );
```

Then format the reply data before returning. Change:

```typescript
      return messages.reverse();
```

To:

```typescript
      return messages.map(m => MessageService.formatReplyData(m)).reverse();
```

- [ ] **Step 5: Update `getGroupMessages` to include reply data**

In `lib/messages.ts`, update the `getGroupMessages` method. Change the SELECT query (around line 261) from:

```typescript
      let query = `
        SELECT m.*, u.username as sender_username, u.full_name as sender_name, u.avatar_path as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.group_id = ? AND m.is_deleted = 0
      `;
```

To:

```typescript
      let query = `
        SELECT m.*, u.username as sender_username, u.full_name as sender_name, u.avatar_path as sender_avatar,
        u.name as sender_name, u.last_name as sender_last_name, u.middle_name as sender_middle_name,
        rm.id AS reply_to_message_id,
        rm.content AS reply_to_content,
        rm.message_type AS reply_to_message_type,
        rm.file_name AS reply_to_file_name,
        rm.file_path AS reply_to_file_path,
        rm.file_type AS reply_to_file_type,
        rm.sender_id AS reply_to_sender_id,
        rm.is_deleted AS reply_to_is_deleted,
        ru.username AS reply_to_sender_username,
        ru.name AS reply_to_sender_name,
        ru.last_name AS reply_to_sender_last_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN messages rm ON m.reply_to_id = rm.id
        LEFT JOIN users ru ON rm.sender_id = ru.id
        WHERE m.group_id = ? AND m.is_deleted = 0
      `;
```

Then format the reply data before returning. Change the line (around line 292):

```typescript
      return messages.reverse();
```

To:

```typescript
      return messages.map(m => MessageService.formatReplyData(m)).reverse();
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors.

- [ ] **Step 7: Commit**

```bash
git add lib/messages.ts
git commit -m "feat(reply): add reply_to_id to INSERT and LEFT JOIN reply data in fetch queries"
```

---

### Task 4: Send API Route — Accept and Validate `reply_to_id`

**Files:**
- Modify: `app/api/messages/send/route.ts`

- [ ] **Step 1: Update the send route to accept `reply_to_id`**

In `app/api/messages/send/route.ts`, update the destructuring of the request body (line 13) to include `reply_to_id`:

Change:
```typescript
    const { recipient_id, group_id, content, message_type, file_path, file_name, file_size } = body;
```

To:
```typescript
    const { recipient_id, group_id, content, message_type, file_path, file_name, file_size, reply_to_id } = body;
```

- [ ] **Step 2: Add validation for `reply_to_id`**

After the existing validation checks (after line 29), add validation for `reply_to_id`:

```typescript
    // Validate reply_to_id if provided
    if (reply_to_id) {
      const { getDatabase } = await import('../../../../lib/database');
      const db = await getDatabase();
      const originalMessage = await db.get('SELECT id, sender_id, recipient_id, group_id FROM messages WHERE id = ? AND is_deleted = 0', [reply_to_id]);

      if (!originalMessage) {
        return NextResponse.json(
          { success: false, error: 'Original message not found' },
          { status: 400 }
        );
      }

      // Validate same conversation: for DMs, the original must involve the same two users
      if (recipient_id) {
        const isDmMatch =
          (originalMessage.sender_id === user.id && originalMessage.recipient_id === recipient_id) ||
          (originalMessage.sender_id === recipient_id && originalMessage.recipient_id === user.id);
        if (!isDmMatch || originalMessage.group_id) {
          return NextResponse.json(
            { success: false, error: 'Cannot reply to a message from a different conversation' },
            { status: 400 }
          );
        }
      }

      // For group messages, the original must be in the same group
      if (group_id) {
        if (originalMessage.group_id !== group_id) {
          return NextResponse.json(
            { success: false, error: 'Cannot reply to a message from a different conversation' },
            { status: 400 }
          );
        }
      }
    }
```

- [ ] **Step 3: Pass `reply_to_id` into the message data**

Update the `messageData` object (around line 32) to include `reply_to_id`:

Change:
```typescript
    const messageData: CreateMessageData = {
      sender_id: user.id,
      recipient_id: recipient_id || undefined,
      group_id: group_id || undefined,
      content: content.trim(),
      message_type: message_type || 'text',
      file_path: file_path,
      file_name: file_name,
      file_size: file_size
    };
```

To:
```typescript
    const messageData: CreateMessageData = {
      sender_id: user.id,
      recipient_id: recipient_id || undefined,
      group_id: group_id || undefined,
      content: content.trim(),
      message_type: message_type || 'text',
      file_path: file_path,
      file_name: file_name,
      file_size: file_size,
      reply_to_id: reply_to_id || undefined
    };
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/messages/send/route.ts
git commit -m "feat(reply): accept and validate reply_to_id in send message API"
```

---

### Task 5: Socket & API Client — Pass `reply_to_id` Through Real-time Path

**Files:**
- Modify: `lib/socket-client.ts:362-385` (`sendMessage` and `sendGroupMessage`)
- Modify: `lib/socket.ts:231-300` (socket `send_message` handler)
- Modify: `lib/api.ts:86-114` (`sendMessage` and `sendGroupMessage`)
- Modify: `components/chat/ChatLayout.tsx:1220-1248` (`handleSendMessage`)

- [ ] **Step 1: Update `socket-client.ts` to accept `reply_to_id`**

In `lib/socket-client.ts`, update both `sendMessage` and `sendGroupMessage`:

For `sendMessage` (around line 362), change:
```typescript
  sendMessage(recipientId: number, content: string, messageType: 'text' | 'file' | 'image' = 'text', fileData?: { file_path?: string; file_name?: string; file_size?: number }) {
```
To:
```typescript
  sendMessage(recipientId: number, content: string, messageType: 'text' | 'file' | 'image' = 'text', fileData?: { file_path?: string; file_name?: string; file_size?: number }, replyToId?: number) {
```

And update the `socket.emit` call to include `reply_to_id`:
```typescript
    this.socket.emit('send_message', {
      recipient_id: recipientId,
      content,
      message_type: messageType,
      ...fileData,
      ...(replyToId ? { reply_to_id: replyToId } : {})
    });
```

For `sendGroupMessage` (around line 376), change:
```typescript
  sendGroupMessage(groupId: number, content: string, messageType: 'text' | 'file' | 'image' = 'text', fileData?: { file_path?: string; file_name?: string; file_size?: number }) {
```
To:
```typescript
  sendGroupMessage(groupId: number, content: string, messageType: 'text' | 'file' | 'image' = 'text', fileData?: { file_path?: string; file_name?: string; file_size?: number }, replyToId?: number) {
```

And update the `socket.emit` call:
```typescript
    this.socket.emit('send_message', {
      group_id: groupId,
      content,
      message_type: messageType,
      ...fileData,
      ...(replyToId ? { reply_to_id: replyToId } : {})
    });
```

- [ ] **Step 2: Update `socket.ts` server handler to pass `reply_to_id`**

In `lib/socket.ts`, in the `send_message` handler (around line 231), update the data type to include `reply_to_id`:

Change:
```typescript
      socket.on('send_message', async (data: {
        recipient_id?: number;
        group_id?: number;
        content: string;
        message_type?: string;
      }) => {
```
To:
```typescript
      socket.on('send_message', async (data: {
        recipient_id?: number;
        group_id?: number;
        content: string;
        message_type?: string;
        reply_to_id?: number;
      }) => {
```

Then update the `messageData` object (around line 256) to include `reply_to_id`:

Change:
```typescript
          const messageData: any = {
            sender_id: userSession.userId,
            recipient_id: data.recipient_id,
            group_id: data.group_id,
            content: data.content.trim(),
            message_type: (data.message_type as 'text' | 'file' | 'image') || 'text'
          };
```
To:
```typescript
          const messageData: any = {
            sender_id: userSession.userId,
            recipient_id: data.recipient_id,
            group_id: data.group_id,
            content: data.content.trim(),
            message_type: (data.message_type as 'text' | 'file' | 'image') || 'text',
            reply_to_id: data.reply_to_id || undefined
          };
```

- [ ] **Step 3: Update `api.ts` client to accept `reply_to_id`**

In `lib/api.ts`, update both `sendMessage` and `sendGroupMessage`:

For `sendMessage` (around line 86), change:
```typescript
  async sendMessage(
    recipientId: number,
    content: string,
    messageType: 'text' | 'file' | 'image' = 'text'
  ): Promise<ApiResponse<Message>> {
    return this.fetchApi<Message>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: recipientId,
        content,
        message_type: messageType,
      }),
    });
  }
```
To:
```typescript
  async sendMessage(
    recipientId: number,
    content: string,
    messageType: 'text' | 'file' | 'image' = 'text',
    replyToId?: number
  ): Promise<ApiResponse<Message>> {
    return this.fetchApi<Message>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: recipientId,
        content,
        message_type: messageType,
        ...(replyToId ? { reply_to_id: replyToId } : {}),
      }),
    });
  }
```

For `sendGroupMessage` (around line 101), change:
```typescript
  async sendGroupMessage(
    groupId: number,
    content: string,
    messageType: 'text' | 'file' | 'image' = 'text'
  ): Promise<ApiResponse<Message>> {
    return this.fetchApi<Message>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        group_id: groupId,
        content,
        message_type: messageType,
      }),
    });
  }
```
To:
```typescript
  async sendGroupMessage(
    groupId: number,
    content: string,
    messageType: 'text' | 'file' | 'image' = 'text',
    replyToId?: number
  ): Promise<ApiResponse<Message>> {
    return this.fetchApi<Message>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        group_id: groupId,
        content,
        message_type: messageType,
        ...(replyToId ? { reply_to_id: replyToId } : {}),
      }),
    });
  }
```

- [ ] **Step 4: Update `ChatLayout.tsx` `handleSendMessage` to accept `reply_to_id`**

In `components/chat/ChatLayout.tsx`, update `handleSendMessage` (around line 1220):

Change:
```typescript
  const handleSendMessage = async (content: string) => {
```
To:
```typescript
  const handleSendMessage = async (content: string, replyToId?: number) => {
```

Update the socket calls to pass `replyToId`:

Change:
```typescript
        if (selectedConversationType === 'group') {
          socketClient.sendGroupMessage(selectedConversation.group_id || 0, content.trim());
        } else {
          socketClient.sendMessage(selectedConversation.other_user_id, content.trim());
        }
```
To:
```typescript
        if (selectedConversationType === 'group') {
          socketClient.sendGroupMessage(selectedConversation.group_id || 0, content.trim(), 'text', undefined, replyToId);
        } else {
          socketClient.sendMessage(selectedConversation.other_user_id, content.trim(), 'text', undefined, replyToId);
        }
```

Update the API fallback calls:

Change:
```typescript
        const response = selectedConversationType === 'group'
          ? await apiService.sendGroupMessage(selectedConversation.group_id || 0, content.trim())
          : await apiService.sendMessage(selectedConversation.other_user_id, content.trim());
```
To:
```typescript
        const response = selectedConversationType === 'group'
          ? await apiService.sendGroupMessage(selectedConversation.group_id || 0, content.trim(), 'text', replyToId)
          : await apiService.sendMessage(selectedConversation.other_user_id, content.trim(), 'text', replyToId);
```

- [ ] **Step 5: Update `ChatWindowProps` and `onSendMessage` prop type**

In `components/chat/ChatWindow.tsx`, update the `ChatWindowProps` interface (around line 29):

Change:
```typescript
  onSendMessage: (content: string) => void;
```
To:
```typescript
  onSendMessage: (content: string, replyToId?: number) => void;
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors.

- [ ] **Step 7: Commit**

```bash
git add lib/socket-client.ts lib/socket.ts lib/api.ts components/chat/ChatLayout.tsx components/chat/ChatWindow.tsx
git commit -m "feat(reply): pass reply_to_id through socket, API client, and layout"
```

---

### Task 6: Frontend UI — Reply State, Hover Button, Composer Banner

**Files:**
- Modify: `components/chat/ChatWindow.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add highlight animation to globals.css**

In `app/globals.css`, add at the end of the file:

```css
@keyframes reply-highlight {
  0% { background-color: oklch(0.75 0.15 255 / 30%); }
  100% { background-color: transparent; }
}

.reply-highlight {
  animation: reply-highlight 1.5s ease-out;
}
```

- [ ] **Step 2: Add reply state and imports to ChatWindow**

In `components/chat/ChatWindow.tsx`, update the lucide import (line 11) to add the `Reply` and `X` icons:

Change:
```typescript
import { Send, Circle, Paperclip, Download, Image as ImageIcon, ArrowDown, Users, Settings, Trash2, LogOut, MessageSquare, MoreVertical, UserMinus, File, FileText, FileSpreadsheet, FileBox, FileJson } from 'lucide-react';
```
To:
```typescript
import { Send, Circle, Paperclip, Download, Image as ImageIcon, ArrowDown, Users, Settings, Trash2, LogOut, MessageSquare, MoreVertical, UserMinus, File, FileText, FileSpreadsheet, FileBox, FileJson, Reply, X } from 'lucide-react';
```

Add the `ReplyTo` import from types:

```typescript
import { Message, User, Conversation, ReplyTo } from '@/lib/types';
```

Add reply state after the existing state declarations (after line 73):

```typescript
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
```

- [ ] **Step 3: Add reply handler functions**

After the `handleStopTyping` function (around line 301), add:

```typescript
  // Reply handlers
  const handleReply = (message: Message) => {
    setReplyingTo(message);
    // Focus the input field
    const inputEl = document.querySelector('input[placeholder="Type a message..."]') as HTMLInputElement;
    if (inputEl) inputEl.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const scrollToMessage = (messageId: number) => {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageEl.classList.add('reply-highlight');
      setTimeout(() => messageEl.classList.remove('reply-highlight'), 1500);
    } else {
      toast('Original message is not in view');
    }
  };

  // Truncate text for reply preview
  const truncateText = (text: string, maxLength: number = 60) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Get reply preview display text
  const getReplyPreviewText = (message: Message | ReplyTo) => {
    if ('is_deleted' in message && message.is_deleted) {
      return 'Original message was deleted';
    }
    if (message.message_type === 'image') {
      return message.file_name || 'Photo';
    }
    if (message.message_type === 'file') {
      return message.file_name || 'File';
    }
    return truncateText(message.content);
  };

  // Get reply sender name
  const getReplySenderName = (message: Message) => {
    return formatSenderName(message);
  };
```

- [ ] **Step 4: Update `handleSubmit` to pass `reply_to_id`**

Update the `handleSubmit` function (around line 253):

Change:
```typescript
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && currentUser) {
      onSendMessage(inputValue);
      setInputValue('');
      handleStopTyping();

      // Scroll to bottom after sending a message
      setTimeout(() => {
        scrollToBottom('auto');
      }, 100);
    }
  };
```
To:
```typescript
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && currentUser) {
      onSendMessage(inputValue, replyingTo?.id);
      setInputValue('');
      setReplyingTo(null);
      handleStopTyping();

      // Scroll to bottom after sending a message
      setTimeout(() => {
        scrollToBottom('auto');
      }, 100);
    }
  };
```

- [ ] **Step 5: Add Escape key handler to cancel reply**

After the `handleInputChange` function (around line 286), add a keyboard handler:

```typescript
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && replyingTo) {
      cancelReply();
    }
  };
```

- [ ] **Step 6: Clear reply state on conversation change**

In the `useEffect` that resets scroll behavior on conversation change (around line 120), add `setReplyingTo(null)`:

Change:
```typescript
  useEffect(() => {
    setUserHasScrolled(false);
```
To:
```typescript
  useEffect(() => {
    setUserHasScrolled(false);
    setReplyingTo(null);
```

- [ ] **Step 7: Add hover reply button to message bubbles**

In the message rendering JSX, wrap each message bubble `div` (the one with `max-w-[85%]`) in a container that tracks hover. Find the message bubble div (around line 685):

```typescript
                  <div
                    className={cn(
                      "max-w-[85%] sm:max-w-[75%] break-words",
```

Wrap the entire message bubble and add a hover button. Change the outer message container div (around line 652) from:

```typescript
                <div
                  ref={(el) => {
                    if (el && selectedConversationType === 'group') {
                      messageRefs.current.set(message.id, el);
                      console.log(`🔍 DEBUG: Set ref for message ${message.id}`);
                    }
                  }}
                  data-message-id={message.id}
                  data-sender-id={message.sender_id}
                  className={cn(
                    "flex items-end space-x-2 mb-2 w-full",
                    isCurrentUser ? "justify-end" : "justify-start"
                  )}
                >
```

To:

```typescript
                <div
                  ref={(el) => {
                    if (el && selectedConversationType === 'group') {
                      messageRefs.current.set(message.id, el);
                    }
                  }}
                  data-message-id={message.id}
                  data-sender-id={message.sender_id}
                  className={cn(
                    "flex items-end space-x-2 mb-2 w-full group/message",
                    isCurrentUser ? "justify-end" : "justify-start"
                  )}
                  onMouseEnter={() => setHoveredMessageId(message.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
```

Then, inside the message bubble div (the one with `max-w-[85%]`), add the reply button. The button goes inside a relative wrapper. Change the message bubble div from just the bubble to include a relative container with the hover button:

Right before the message bubble `<div className={cn("max-w-[85%]...` (around line 685), wrap it:

```typescript
                  <div className="relative max-w-[85%] sm:max-w-[75%]">
                    {/* Hover reply button */}
                    {hoveredMessageId === message.id && message.message_type !== 'system' && (
                      <button
                        onClick={() => handleReply(message)}
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-muted/80 hover:bg-muted border border-border/50 flex items-center justify-center transition-opacity opacity-0 group-hover/message:opacity-100",
                          isCurrentUser ? "-left-9" : "-right-9"
                        )}
                        title="Reply"
                      >
                        <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
```

And update the message bubble div inside to remove `max-w` (since the wrapper now handles it):

Change:
```typescript
                    className={cn(
                      "max-w-[85%] sm:max-w-[75%] break-words",
```
To:
```typescript
                    className={cn(
                      "break-words",
```

Close the relative wrapper after the message bubble's closing `</div>`:

```typescript
                  </div>  {/* close relative wrapper */}
```

- [ ] **Step 8: Add reply preview inside message bubbles**

Inside the message bubble (after the sender name display, around line 693, but before the message content), add the reply preview when the message has `reply_to` data:

After the sender name block:
```typescript
                    {!isCurrentUser && showAvatar && (
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {formatSenderName(message)}
                      </p>
                    )}
```

Add the reply preview:

```typescript
                    {/* Reply preview */}
                    {message.reply_to && (
                      <div
                        onClick={() => scrollToMessage(message.reply_to!.id)}
                        className={cn(
                          "rounded-lg p-2 mb-2 cursor-pointer transition-colors text-xs",
                          isCurrentUser
                            ? "bg-white/15 hover:bg-white/20"
                            : "bg-black/5 hover:bg-black/8 dark:bg-white/8 dark:hover:bg-white/12"
                        )}
                      >
                        <p className={cn(
                          "font-semibold mb-0.5",
                          isCurrentUser ? "opacity-90" : "text-primary"
                        )}>
                          {message.reply_to.sender_name}
                        </p>
                        <div className={cn(
                          "flex items-center gap-2",
                          isCurrentUser ? "opacity-75" : "opacity-60"
                        )}>
                          {message.reply_to.message_type === 'image' && message.reply_to.file_path && (
                            <img
                              src={`/api/files/download/${message.reply_to.file_path.split('/').pop()}`}
                              alt=""
                              className="w-9 h-9 rounded object-cover shrink-0"
                            />
                          )}
                          {message.reply_to.message_type === 'file' && (
                            <div className="w-9 h-9 rounded bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
                              {getFileIcon(message.reply_to.file_name || '')}
                            </div>
                          )}
                          <span className={cn(
                            "truncate",
                            message.reply_to.is_deleted && "italic opacity-60"
                          )}>
                            {getReplyPreviewText(message.reply_to)}
                          </span>
                        </div>
                      </div>
                    )}
```

- [ ] **Step 9: Add composer reply banner**

In the input area section (around line 878), add the reply banner above the form. Find the input container:

```typescript
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit}
```

Change to:

```typescript
      <div className="p-4 border-t border-border">
        {/* Reply banner */}
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 mb-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-primary">
                Replying to {getReplySenderName(replyingTo)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {getReplyPreviewText(replyingTo)}
              </p>
            </div>
            <button
              onClick={cancelReply}
              className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit}
```

- [ ] **Step 10: Add `onKeyDown` to the input**

Update the `<Input>` element (around line 890) to include the Escape key handler:

Change:
```typescript
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={!isConnected}
          />
```
To:
```typescript
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={!isConnected}
          />
```

- [ ] **Step 11: Verify the app builds**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds with no errors.

- [ ] **Step 12: Commit**

```bash
git add components/chat/ChatWindow.tsx app/globals.css
git commit -m "feat(reply): add reply UI - hover button, composer banner, inline preview, scroll-to-original"
```

---

### Task 7: Manual Testing & Polish

- [ ] **Step 1: Start the development server**

Run: `npm run dev`

- [ ] **Step 2: Test basic reply flow**

1. Open the app in browser, navigate to a conversation with existing messages
2. Hover over a message — verify the reply button appears (left side for own messages, right side for others)
3. Click the reply button — verify the composer banner appears above the input
4. Type a reply and send — verify the message appears with an embedded quote preview
5. Click the quote preview — verify it scrolls to the original message with a highlight animation

- [ ] **Step 3: Test edge cases**

1. Reply to an image message — verify thumbnail appears in the preview
2. Reply to a file message — verify file icon and name appear in the preview
3. Press Escape while replying — verify the reply is cancelled
4. Click X on the composer banner — verify the reply is cancelled
5. Switch conversations while replying — verify the reply state clears
6. Send a reply in a group chat — verify other members see the reply preview

- [ ] **Step 4: Final commit if any polish fixes were needed**

```bash
git add -A
git commit -m "fix(reply): polish and bug fixes for reply-to-message feature"
```
