import { getDatabase } from './database';
import { MessageRead } from './types';

export class MessageReadService {
  private static markingInProgress = new Set<string>();

  // Mark messages as read by a user
  static async markMessagesAsRead(messageIds: number[], userId: number): Promise<void> {
    if (messageIds.length === 0) return;
    
    console.log(`📖 markMessagesAsRead called with messageIds: [${messageIds.slice(0, 5).join(', ')}${messageIds.length > 5 ? '...' : ''}] (${messageIds.length} total)`);
    
    // Create a unique key for this operation to prevent concurrent calls
    const operationKey = `${userId}-${messageIds.sort().join(',')}`;
    
    if (this.markingInProgress.has(operationKey)) {
      console.log(`📖 Already marking messages as read for user ${userId}, skipping`);
      return;
    }
    
    this.markingInProgress.add(operationKey);
    
    try {
      const db = await getDatabase();
      
      // Use a simpler approach without explicit transactions for concurrent safety
      for (const messageId of messageIds) {
        await db.run(
          `INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)`,
          [messageId, userId]
        );
      }
      
      console.log(`📖 User ${userId} marked ${messageIds.length} messages as read`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    } finally {
      this.markingInProgress.delete(operationKey);
    }
  }

  // Mark ALL unread messages in a conversation as read
  static async markAllUnreadAsRead(userId: number, conversationId: number, isGroup: boolean): Promise<number[]> {
    const db = await getDatabase();
    
    try {
      let query: string;
      let params: any[];
      
      if (isGroup) {
        // Get all unread messages in the group for this user
        query = `
          SELECT m.id
          FROM messages m
          WHERE m.group_id = ? 
          AND m.sender_id != ? 
          AND m.is_deleted = 0
          AND m.id NOT IN (
            SELECT message_id 
            FROM message_reads 
            WHERE user_id = ?
          )
          AND EXISTS (
            SELECT 1 FROM group_members gm 
            WHERE gm.group_id = ? AND gm.user_id = ? AND gm.is_active = 1
          )
        `;
        params = [conversationId, userId, userId, conversationId, userId];
      } else {
        // Get all unread messages in the direct conversation for this user
        query = `
          SELECT m.id
          FROM messages m
          WHERE ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
          AND m.sender_id != ?
          AND m.group_id IS NULL
          AND m.is_deleted = 0
          AND m.id NOT IN (
            SELECT message_id 
            FROM message_reads 
            WHERE user_id = ?
          )
        `;
        params = [conversationId, userId, userId, conversationId, userId, userId];
      }
      
      const unreadMessages = await db.all(query, params);
      const messageIds = unreadMessages.map(m => m.id);
      
      if (messageIds.length > 0) {
        console.log(`📖 markAllUnreadAsRead: Found ${messageIds.length} unread messages in ${isGroup ? 'group' : 'direct'}_${conversationId} for user ${userId}`);
        
        // Mark all unread messages as read
        for (const messageId of messageIds) {
          await db.run(
            `INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)`,
            [messageId, userId]
          );
        }
        
        console.log(`📖 User ${userId} marked ${messageIds.length} unread messages as read in ${isGroup ? 'group' : 'direct'}_${conversationId}`);
      } else {
        console.log(`📖 No unread messages found for user ${userId} in ${isGroup ? 'group' : 'direct'}_${conversationId}`);
      }
      
      return messageIds;
    } catch (error) {
      console.error('Error marking all unread messages as read:', error);
      throw error;
    }
  }

  // Get read status for messages (for group chats)
  static async getMessageReadStatus(messageIds: number[]): Promise<{ [messageId: number]: MessageRead[] }> {
    const db = await getDatabase();
    
    try {
      if (messageIds.length === 0) return {};
      
      const placeholders = messageIds.map(() => '?').join(',');
      const reads = await db.all(
        `SELECT mr.message_id, mr.user_id, mr.read_at, u.username, u.avatar_path 
         FROM message_reads mr
         JOIN users u ON mr.user_id = u.id
         WHERE mr.message_id IN (${placeholders})
         ORDER BY mr.read_at ASC`,
        messageIds
      );
      
      const result: { [messageId: number]: MessageRead[] } = {};
      
      for (const read of reads) {
        if (!result[read.message_id]) {
          result[read.message_id] = [];
        }
        result[read.message_id].push({
          user_id: read.user_id,
          username: read.username,
          read_at: read.read_at,
          avatar_path: read.avatar_path
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting message read status:', error);
      throw error;
    }
  }

  // Check if a direct message has been read by the recipient
  static async isDirectMessageRead(messageId: number, recipientId: number): Promise<boolean> {
    const db = await getDatabase();
    
    try {
      const read = await db.get(
        'SELECT id FROM message_reads WHERE message_id = ? AND user_id = ?',
        [messageId, recipientId]
      );
      
      return !!read;
    } catch (error) {
      console.error('Error checking direct message read status:', error);
      return false;
    }
  }

  // Get unread message count for a conversation
  static async getUnreadCount(userId: number, conversationId: number, isGroup: boolean): Promise<number> {
    const db = await getDatabase();
    
    try {
      let query: string;
      let params: any[];
      
      if (isGroup) {
        // For groups: count messages where user hasn't read them and user is a member
        query = `
          SELECT COUNT(*) as count
          FROM messages m
          WHERE m.group_id = ? 
          AND m.sender_id != ? 
          AND m.is_deleted = 0
          AND m.id NOT IN (
            SELECT message_id 
            FROM message_reads 
            WHERE user_id = ?
          )
          AND EXISTS (
            SELECT 1 FROM group_members gm 
            WHERE gm.group_id = ? AND gm.user_id = ? AND gm.is_active = 1
          )
        `;
        params = [conversationId, userId, userId, conversationId, userId];
      } else {
        // For direct messages: count messages from the other user that haven't been read
        query = `
          SELECT COUNT(*) as count
          FROM messages m
          WHERE ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
          AND m.sender_id != ?
          AND m.group_id IS NULL
          AND m.is_deleted = 0
          AND m.id NOT IN (
            SELECT message_id 
            FROM message_reads 
            WHERE user_id = ?
          )
        `;
        params = [conversationId, userId, userId, conversationId, userId, userId];
      }
      
      const result = await db.get(query, params);
      return result?.count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Get all unread counts for a user's conversations
  static async getAllUnreadCounts(userId: number): Promise<{ [conversationId: string]: number }> {
    const db = await getDatabase();
    
    try {
      // Get unread counts for direct conversations
      const directUnreads = await db.all(`
        SELECT 
          CASE 
            WHEN m.sender_id = ? THEN m.recipient_id 
            ELSE m.sender_id 
          END as conversation_id,
          COUNT(*) as unread_count
        FROM messages m
        WHERE (m.sender_id = ? OR m.recipient_id = ?)
        AND m.sender_id != ?
        AND m.group_id IS NULL
        AND m.is_deleted = 0
        AND m.id NOT IN (
          SELECT message_id 
          FROM message_reads 
          WHERE user_id = ?
        )
        GROUP BY conversation_id
      `, [userId, userId, userId, userId, userId]);

      // Get unread counts for group conversations
      const groupUnreads = await db.all(`
        SELECT 
          m.group_id as conversation_id,
          COUNT(*) as unread_count
        FROM messages m
        JOIN group_members gm ON m.group_id = gm.group_id
        WHERE gm.user_id = ? 
        AND gm.is_active = 1
        AND m.sender_id != ?
        AND m.is_deleted = 0
        AND m.id NOT IN (
          SELECT message_id 
          FROM message_reads 
          WHERE user_id = ?
        )
        GROUP BY m.group_id
      `, [userId, userId, userId]);

      const result: { [conversationId: string]: number } = {};
      
      // Add direct conversation unread counts
      for (const unread of directUnreads) {
        result[`direct_${unread.conversation_id}`] = unread.unread_count;
      }
      
      // Add group conversation unread counts
      for (const unread of groupUnreads) {
        result[`group_${unread.conversation_id}`] = unread.unread_count;
      }
      
      return result;
    } catch (error) {
      console.error('Error getting all unread counts:', error);
      return {};
    }
  }


} 