# Reply to Message — Design Spec

## Overview

Add inline reply-to-message functionality, allowing users to reply to a specific message in both direct and group conversations. Replies appear in the main chat flow with an embedded preview of the original message (iMessage/Messenger style). No separate thread view — single-level replies only.

## User Experience

### Initiating a Reply
- A **hover reply button** (circular, with lucide `Reply` icon) appears when the user hovers over any message bubble
- Button positioned to the **left** of own messages, to the **right** of others' messages
- Fades in/out with a subtle transition

### Composer Banner
- When reply is initiated, a **banner appears above the text input** inside the input container
- Shows: "Replying to {sender name}" in accent color, truncated excerpt of original message below
- **X button** on the right to dismiss and cancel the reply
- **Escape key** also cancels the reply

### Reply Bubble in Chat
- Uses the **iMessage/Messenger embedded quote style**: a frosted/translucent block (`rgba(255,255,255,0.15)`) sits inside the top of the message bubble
- Clickable — scrolls to the original message

**Reply preview content by message type:**

| Original Type | Preview Content |
|---|---|
| Text | Sender name + first ~60 characters, truncated with ellipsis |
| Image | 36px thumbnail + sender name + filename with image icon |
| File | 36px file type icon + sender name + filename |
| Deleted | Sender name + italic "Original message was deleted" |

### Scroll-to-Original
- Clicking the reply preview scrolls to the original message: `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- Original message gets a **temporary highlight animation** (accent flash fading out over ~1.5s)
- Messages are identified by DOM id `message-{id}`
- If original message is not in the currently loaded messages, show a toast: "Original message is not in view"

### Sender Name Display
- Always show the original sender's full name in the reply preview, even when the original message is from the current user (no "You" substitution)
- Format as "{name} {last_name}" to match the existing display name format used throughout the app

## Database Schema

### Migration

```sql
ALTER TABLE messages ADD COLUMN reply_to_id INTEGER REFERENCES messages(id);
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);
```

- `reply_to_id` is nullable (most messages are not replies)
- Self-referential foreign key to `messages(id)`
- Indexed for efficient lookups

### Query Pattern

Message fetch queries add a LEFT JOIN to retrieve reply metadata:

```sql
SELECT m.*,
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
WHERE ...
```

## API Changes

### `POST /api/messages/send`

- Accept optional `reply_to_id` field in request body
- **Validation:** Verify that `reply_to_id` message exists and belongs to the same conversation (same recipient pair for DMs, same group_id for groups) — reject cross-conversation replies
- Pass `reply_to_id` to `MessageService.sendMessage()` for DB insert

### Message Fetch Endpoints

Updated to include reply data via LEFT JOIN:
- `GET /api/messages/direct/[userId]`
- `GET /api/messages/group/[groupId]`

Response shape — each message includes a `reply_to` object:

```typescript
{
  id: 123,
  content: "Sure, 3pm works for me!",
  reply_to: {            // null if not a reply
    id: 45,
    content: "Can we push the meeting to 3pm? I have a confli...",
    message_type: "text",
    file_name: null,
    file_path: null,
    file_type: null,
    sender_id: 7,
    sender_name: "John Doe",
    is_deleted: false
  },
  // ... rest of existing message fields
}
```

No new endpoints are needed.

## Socket.io / Real-time

No new socket events. The existing `new_message` event carries the complete message object including the `reply_to` nested object when the message is a reply.

Flow:
1. Client sends `POST /api/messages/send` with `reply_to_id`
2. Server saves to DB, queries back the full message with reply data via JOIN
3. Server broadcasts `new_message` with the complete payload
4. Receiving clients render the reply preview inline — no extra API call needed

## Frontend Types

### New Type: `ReplyTo`

```typescript
interface ReplyTo {
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
```

### Updated Type: `Message`

Add to existing `Message` interface:

```typescript
interface Message {
  // ... existing fields
  reply_to?: ReplyTo | null;
}
```

## Frontend State

### ChatWindow

New state:

```typescript
const [replyingTo, setReplyingTo] = useState<Message | null>(null);
```

- Hover reply button click → `setReplyingTo(message)`
- Composer banner X or Escape → `setReplyingTo(null)`
- On send → include `replyingTo.id` as `reply_to_id`, then `setReplyingTo(null)`

## Frontend UI Components

### 1. Hover Reply Button
- Appears on `mouseenter` of any message bubble
- Circular button with lucide `Reply` icon
- Left of own messages, right of others' messages
- Fade in/out transition

### 2. Composer Reply Banner
- Inside the input container, directly above the text input
- Accent-tinted background
- Shows sender name + truncated excerpt
- X dismiss button

### 3. Reply Preview (inside message bubble)
- Frosted translucent block at top of bubble interior
- Content varies by message type (see table above)
- Clickable → scroll-to-original with highlight

### 4. Highlight Animation
- CSS class applied temporarily to the original message on scroll
- Accent/yellow flash that fades out over ~1.5s
- Applied via `message-{id}` DOM element

## Edge Cases

- **Deleted original message:** Reply preview shows sender name + "Original message was deleted" in italic muted text
- **Original message not loaded:** Toast notification "Original message is not in view" when clicking reply preview
- **Reply to a reply:** Supported — the preview shows the direct parent message only, no nesting
- **Cross-conversation reply prevention:** Server validates `reply_to_id` belongs to the same conversation
- **File/image original with text content:** Show the file/image indicator, not the text content field
