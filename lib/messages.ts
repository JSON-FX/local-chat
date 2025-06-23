import { getDatabase } from './database';
import { Message, CreateMessageData } from './models';

export class MessageService {
  
  // Send a new message
  static async sendMessage(messageData: CreateMessageData): Promise<Message> {
    const db = await getDatabase();

    try {
      // Validate that message has either recipient_id or group_id, but not both
      if ((!messageData.recipient_id && !messageData.group_id) || 
          (messageData.recipient_id && messageData.group_id)) {
        throw new Error('Message must have either recipient_id or group_id, but not both');
      }

      // Insert message
      const result = await db.run(
        `INSERT INTO messages (sender_id, recipient_id, group_id, content, message_type, file_path, file_name, file_size) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageData.sender_id,
          messageData.recipient_id || null,
          messageData.group_id || null,
          messageData.content,
          messageData.message_type || 'text',
          messageData.file_path || null,
          messageData.file_name || null,
          messageData.file_size || null
        ]
      );

      // Get the created message - try different ways to get the ID
      let messageId;
      if (result && typeof result === 'object') {
        messageId = (result as any).lastID || (result as any).lastId || (result as any).insertId;
      }
      
      if (!messageId) {
        // Fallback: get the last inserted message for this user
        const message = await db.get(
          'SELECT * FROM messages WHERE sender_id = ? ORDER BY id DESC LIMIT 1',
          [messageData.sender_id]
        );
        return message;
      }
      
      const message = await db.get('SELECT * FROM messages WHERE id = ?', [messageId]);
      if (!message) {
        throw new Error('Failed to retrieve created message');
      }
      
      return message;
    } catch (error) {
      throw error;
    }
  }

  // Get direct messages between two users
  static async getDirectMessages(userId1: number, userId2: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const db = await getDatabase();

    try {
      const messages = await db.all(
        `SELECT m.*, u.username as sender_username 
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.is_deleted = 0 
         AND ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
         ORDER BY m.timestamp DESC
         LIMIT ? OFFSET ?`,
        [userId1, userId2, userId2, userId1, limit, offset]
      );

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      throw error;
    }
  }

  // Get group messages
  static async getGroupMessages(groupId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const db = await getDatabase();

    try {
      const messages = await db.all(
        `SELECT m.*, u.username as sender_username 
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.group_id = ? AND m.is_deleted = 0
         ORDER BY m.timestamp DESC
         LIMIT ? OFFSET ?`,
        [groupId, limit, offset]
      );

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      throw error;
    }
  }

  // Get user's recent conversations
  static async getRecentConversations(userId: number): Promise<any[]> {
    const db = await getDatabase();

    try {
      // Get recent direct messages
      const directConversations = await db.all(
        `SELECT 
           CASE 
             WHEN m.sender_id = ? THEN m.recipient_id 
             ELSE m.sender_id 
           END as other_user_id,
           u.username as other_username,
           m.content as last_message,
           m.timestamp as last_message_time,
           'direct' as conversation_type,
           NULL as group_id,
           NULL as group_name
         FROM messages m
         JOIN users u ON (
           CASE 
             WHEN m.sender_id = ? THEN m.recipient_id = u.id 
             ELSE m.sender_id = u.id 
           END
         )
         WHERE (m.sender_id = ? OR m.recipient_id = ?) 
         AND m.group_id IS NULL 
         AND m.is_deleted = 0
         AND m.id IN (
           SELECT MAX(id) 
           FROM messages 
           WHERE (sender_id = ? OR recipient_id = ?) 
           AND group_id IS NULL 
           AND is_deleted = 0
           GROUP BY 
             CASE 
               WHEN sender_id = ? THEN recipient_id 
               ELSE sender_id 
             END
         )
         ORDER BY m.timestamp DESC`,
        [userId, userId, userId, userId, userId, userId, userId]
      );

      // Get recent group messages
      const groupConversations = await db.all(
        `SELECT 
           NULL as other_user_id,
           NULL as other_username,
           m.content as last_message,
           m.timestamp as last_message_time,
           'group' as conversation_type,
           g.id as group_id,
           g.name as group_name
         FROM messages m
         JOIN groups g ON m.group_id = g.id
         JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ? 
         AND gm.is_active = 1
         AND m.is_deleted = 0
         AND m.id IN (
           SELECT MAX(id) 
           FROM messages 
           WHERE group_id IN (
             SELECT group_id 
             FROM group_members 
             WHERE user_id = ? AND is_active = 1
           )
           AND is_deleted = 0
           GROUP BY group_id
         )
         ORDER BY m.timestamp DESC`,
        [userId, userId]
      );

      // Combine and sort by timestamp
      const allConversations = [...directConversations, ...groupConversations];
      allConversations.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

      return allConversations;
    } catch (error) {
      throw error;
    }
  }

  // Mark message as deleted (soft delete)
  static async deleteMessage(messageId: number, userId: number): Promise<void> {
    const db = await getDatabase();

    try {
      // Check if user is the sender
      const message = await db.get('SELECT sender_id FROM messages WHERE id = ?', [messageId]);
      if (!message) {
        throw new Error('Message not found');
      }

      if (message.sender_id !== userId) {
        throw new Error('Only the sender can delete this message');
      }

      // Soft delete the message
      await db.run('UPDATE messages SET is_deleted = 1 WHERE id = ?', [messageId]);
    } catch (error) {
      throw error;
    }
  }

  // Search messages
  static async searchMessages(userId: number, query: string, limit: number = 20): Promise<Message[]> {
    const db = await getDatabase();

    try {
      const messages = await db.all(
        `SELECT m.*, u.username as sender_username,
                CASE 
                  WHEN m.group_id IS NOT NULL THEN g.name 
                  ELSE NULL 
                END as group_name,
                CASE 
                  WHEN m.group_id IS NULL THEN u2.username 
                  ELSE NULL 
                END as other_username
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         LEFT JOIN groups g ON m.group_id = g.id
         LEFT JOIN users u2 ON (m.recipient_id = u2.id AND m.group_id IS NULL)
         WHERE m.is_deleted = 0 
         AND m.content LIKE ?
         AND (
           m.sender_id = ? OR 
           m.recipient_id = ? OR 
           m.group_id IN (
             SELECT group_id 
             FROM group_members 
             WHERE user_id = ? AND is_active = 1
           )
         )
         ORDER BY m.timestamp DESC
         LIMIT ?`,
        [`%${query}%`, userId, userId, userId, limit]
      );

      return messages;
    } catch (error) {
      throw error;
    }
  }

  // Get message by ID (with permission check)
  static async getMessageById(messageId: number, userId: number): Promise<Message | null> {
    const db = await getDatabase();

    try {
      const message = await db.get(
        `SELECT m.*, u.username as sender_username 
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.id = ? AND m.is_deleted = 0
         AND (
           m.sender_id = ? OR 
           m.recipient_id = ? OR 
           m.group_id IN (
             SELECT group_id 
             FROM group_members 
             WHERE user_id = ? AND is_active = 1
           )
         )`,
        [messageId, userId, userId, userId]
      );

      return message || null;
    } catch (error) {
      throw error;
    }
  }
} 