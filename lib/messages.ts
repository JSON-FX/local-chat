import { getDatabase } from './database';
import { Message, CreateMessageData } from './models';

export class MessageService {
  // Maximum allowed filename length (including extension)
  private static readonly MAX_FILENAME_LENGTH = 255;
  
  // Disallowed characters in filenames (regex pattern)
  private static readonly DISALLOWED_FILENAME_CHARS = /[\x00-\x1f\x7f-\x9f<>:"|?*\\]/;
  
  // Validate filename
  private static validateFilename(filename: string): { valid: boolean; error?: string } {
    if (!filename || filename.trim() === '') {
      return { valid: false, error: 'Filename cannot be empty' };
    }
    
    // Check filename length
    if (filename.length > this.MAX_FILENAME_LENGTH) {
      return { 
        valid: false, 
        error: `Filename too long. Maximum ${this.MAX_FILENAME_LENGTH} characters allowed` 
      };
    }
    
    // Check for disallowed characters
    if (this.DISALLOWED_FILENAME_CHARS.test(filename)) {
      return { 
        valid: false, 
        error: 'Filename contains invalid characters' 
      };
    }
    
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return { 
        valid: false, 
        error: 'Filename cannot contain path separators or ".."' 
      };
    }
    
    // Ensure filename has an extension
    if (!filename.includes('.') || filename.endsWith('.')) {
      return { 
        valid: false, 
        error: 'Filename must have a valid extension' 
      };
    }
    
    return { valid: true };
  }
  
  // Create a system message (for group membership changes)
  static async createSystemMessage(groupId: number, content: string): Promise<Message> {
    const db = await getDatabase();

    try {
      // Verify group exists
      const groupExists = await db.get('SELECT id FROM groups WHERE id = ?', [groupId]);
      
      if (!groupExists) {
        throw new Error(`Group with ID ${groupId} does not exist`);
      }
      
      // Create system message with sender_id 0 to indicate system message
      const result = await db.run(
        `INSERT INTO messages (sender_id, group_id, content, message_type) 
         VALUES (0, ?, ?, 'system')`,
        [groupId, content]
      );

      // Get the created message ID
      let messageId;
      if (result && typeof result === 'object') {
        messageId = (result as any).lastID || (result as any).lastId || (result as any).insertId;
      }
      
      if (!messageId) {
        // Fallback: get the last system message for this group
        const message = await db.get(
          'SELECT * FROM messages WHERE group_id = ? AND message_type = "system" ORDER BY id DESC LIMIT 1',
          [groupId]
        );
        return message;
      }
      
      const message = await db.get('SELECT * FROM messages WHERE id = ?', [messageId]);
      if (!message) {
        throw new Error('Failed to retrieve created system message');
      }
      
      return message;
    } catch (error) {
      throw error;
    }
  }

  // Send a new message
  static async sendMessage(messageData: CreateMessageData): Promise<Message> {
    const db = await getDatabase();

    try {
      // Validate that message has either recipient_id or group_id, but not both
      if ((!messageData.recipient_id && !messageData.group_id) || 
          (messageData.recipient_id && messageData.group_id)) {
        throw new Error('Message must have either recipient_id or group_id, but not both');
      }

      // Validate file attachment data if present
      if (messageData.file_path || messageData.file_name || messageData.file_size) {
        // If any file property is provided, all must be provided
        if (!messageData.file_path || !messageData.file_name || !messageData.file_size) {
          throw new Error('When sending a file attachment, file_path, file_name, and file_size must all be provided');
        }
        
        // Validate filename
        const filenameValidation = MessageService.validateFilename(messageData.file_name);
        if (!filenameValidation.valid) {
          throw new Error(`Invalid filename: ${filenameValidation.error}`);
        }
        
        // Validate file size is a positive number
        if (typeof messageData.file_size !== 'number' || messageData.file_size <= 0) {
          throw new Error('File size must be a positive number');
        }
        
        // Validate file path format (should start with /uploads/)
        if (!messageData.file_path.startsWith('/uploads/')) {
          throw new Error('Invalid file path format');
        }
      }

      // For group messages, check if the group exists and user is a member (skip check for system messages)
      if (messageData.group_id) {
        const group = await db.get(
          'SELECT id FROM groups WHERE id = ? AND is_active = 1',
          [messageData.group_id]
        );
        
        if (!group) {
          throw new Error('Group not found or has been deleted');
        }
        
        // Skip membership check for system messages (sender_id = 0)
        if (messageData.sender_id !== 0) {
          const membership = await db.get(
            'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = 1',
            [messageData.group_id, messageData.sender_id]
          );
          
          if (!membership) {
            throw new Error('You are not a member of this group');
          }
        }
      }

      // Prepare values for insertion
      // Only include file properties if they're ALL present and valid
      const hasValidAttachment = messageData.file_path && messageData.file_name && messageData.file_size;
      
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
          hasValidAttachment ? messageData.file_path : null,
          hasValidAttachment ? messageData.file_name : null,
          hasValidAttachment ? messageData.file_size : null
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
        `SELECT m.*, u.username as sender_username, u.name as sender_name, u.last_name as sender_last_name, u.middle_name as sender_middle_name, u.avatar_path as sender_avatar,
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

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Get direct messages error:', error);
      throw error;
    }
  }

  // Get messages from a group chat
  static async getGroupMessages(groupId: number, userId?: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const db = await getDatabase();

    try {
      // First check if the group exists
      const group = await db.get('SELECT id FROM groups WHERE id = ? AND is_active = 1', [groupId]);
      
      if (!group) {
        console.warn(`Group not found or has been deleted: ${groupId}`);
        return []; // Return empty array instead of throwing error
      }
      
      const membership = await db.get(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = 1',
        [groupId, userId]
      );
      
      if (userId && !membership) {
        console.warn(`User ${userId} is not a member of group ${groupId}`);
        return []; // Return empty array instead of throwing error
      }

      // If userId is provided, exclude messages that were deleted by this user
      let query = `
        SELECT m.*, u.username as sender_username, u.name as sender_name, u.last_name as sender_last_name, u.middle_name as sender_middle_name, u.avatar_path as sender_avatar 
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.group_id = ? AND m.is_deleted = 0
      `;
      
      const params: any[] = [groupId];
      
      // Only filter by user_deleted_by if a userId is provided
      if (userId) {
        query += ` AND (m.user_deleted_by IS NULL OR m.user_deleted_by NOT LIKE ?)`;
        params.push(`%,${userId},%`);
      }
      
      query += ` ORDER BY m.timestamp DESC LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));
      
      const messages = await db.all(query, params);

      // Get read status for each message for group chats
      if (messages.length > 0) {
        const { MessageReadService } = await import('./messageReads');
        const messageIds = messages.map(m => m.id);
        const readStatus = await MessageReadService.getMessageReadStatus(messageIds);
        
        // Add read_by information to each message
        messages.forEach(message => {
          message.read_by = readStatus[message.id] || [];
        });
      }

      return messages.reverse();
    } catch (error) {
      console.error('Get group messages error:', error);
      return []; // Return empty array on error
    }
  }

  // Send message to group (enhanced version with membership verification)
  static async sendGroupMessage(groupId: number, senderId: number, content: string, messageType: 'text' | 'file' | 'image' = 'text', fileData?: { file_path?: string; file_name?: string; file_size?: number }): Promise<Message> {
    const db = await getDatabase();

    try {
      // Verify user is a member of the group
      const membership = await db.get(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = 1',
        [groupId, senderId]
      );

      if (!membership) {
        throw new Error('You are not a member of this group');
      }

      // Create message data
      const messageData: CreateMessageData = {
        sender_id: senderId,
        group_id: groupId,
        content,
        message_type: messageType,
        ...fileData
      };

      // Send the message
      return this.sendMessage(messageData);
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
           u.name as other_user_name,
           u.last_name as other_user_last_name,
           u.middle_name as other_user_middle_name,
           m.content as last_message,
           m.timestamp as last_message_time,
           'direct' as conversation_type,
           NULL as group_id,
           NULL as group_name,
           u.avatar_path as avatar_path
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
         AND (m.user_deleted_by IS NULL OR m.user_deleted_by = '' OR NOT m.user_deleted_by LIKE '%,' || ? || ',%')
         AND m.id IN (
           SELECT MAX(id) 
           FROM messages 
           WHERE (sender_id = ? OR recipient_id = ?) 
           AND group_id IS NULL 
           AND is_deleted = 0
           AND (user_deleted_by IS NULL OR user_deleted_by = '' OR NOT user_deleted_by LIKE '%,' || ? || ',%')
           GROUP BY 
             CASE 
               WHEN sender_id = ? THEN recipient_id 
               ELSE sender_id 
             END
         )
         ORDER BY m.timestamp DESC`,
        [userId, userId, userId, userId, userId, userId, userId, userId, userId]
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
           g.name as group_name,
           g.avatar_path
         FROM messages m
         JOIN groups g ON m.group_id = g.id
         JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ? 
         AND gm.is_active = 1
         AND g.is_active = 1
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

      // Get all user's groups (including those without messages)
      const allUserGroups = await db.all(
        `SELECT 
           NULL as other_user_id,
           NULL as other_username,
           NULL as last_message,
           g.created_at as last_message_time,
           'group' as conversation_type,
           g.id as group_id,
           g.name as group_name,
           g.avatar_path
         FROM groups g
         JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ? 
         AND gm.is_active = 1
         AND g.is_active = 1`,
        [userId]
      );

      // Merge group conversations (prioritize those with messages)
      const groupsWithMessages = new Set(groupConversations.map(g => g.group_id));
      const groupsWithoutMessages = allUserGroups.filter(g => !groupsWithMessages.has(g.group_id));
      
      const allGroupConversations = [...groupConversations, ...groupsWithoutMessages];

      // Combine and sort by timestamp
      const allConversations = [...directConversations, ...allGroupConversations];
      allConversations.sort((a, b) => {
        const aTime = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
        const bTime = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
        return bTime - aTime;
      });

      return allConversations;
    } catch (error) {
      console.error('Get conversations error:', error);
      return [];
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

  // Soft-delete a direct conversation for a user
  static async deleteConversation(userId: number, otherUserId: number): Promise<void> {
    const db = await getDatabase();
    
    try {
      // Get all messages between the two users
      const messages = await db.all(
        `SELECT id, user_deleted_by 
         FROM messages 
         WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
         AND is_deleted = 0`,
        [userId, otherUserId, otherUserId, userId]
      );

      // Update each message to mark as deleted for this user
      for (const message of messages) {
        let deletedBy = message.user_deleted_by || '';
        
        // Only add the user if not already in the list
        if (!deletedBy.includes(`,${userId},`)) {
          // Format: ,1,2,3, (with commas at start and end for easier searching)
          deletedBy = deletedBy ? 
            (deletedBy.startsWith(',') ? deletedBy : ',' + deletedBy) : 
            ',';
          
          if (!deletedBy.endsWith(',')) {
            deletedBy += ',';
          }
          
          deletedBy += `${userId},`;
          
          await db.run(
            'UPDATE messages SET user_deleted_by = ? WHERE id = ?',
            [deletedBy, message.id]
          );
        }
      }
    } catch (error) {
      console.error('Delete conversation error:', error);
      throw error;
    }
  }

  // Leave a group - this method is deprecated, use GroupService.leaveGroup instead
  static async leaveGroup(groupId: number, userId: number): Promise<void> {
    console.warn('MessageService.leaveGroup is deprecated, use GroupService.leaveGroup instead');
    const { GroupService } = await import('./groups');
    // Call the new method but don't return the result to maintain interface compatibility
    await GroupService.leaveGroup(groupId, userId);
  }

  // Clear group conversation for a user (mark messages as deleted for this user only)
  static async clearGroupConversation(userId: number, groupId: number): Promise<void> {
    const db = await getDatabase();
    
    try {
      // First check if the user is a member of the group
      const membership = await db.get(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = 1',
        [groupId, userId]
      );
      
      if (!membership) {
        throw new Error('You are not a member of this group');
      }
      
      // Get all messages in this group
      const messages = await db.all(
        `SELECT id, user_deleted_by FROM messages WHERE group_id = ? AND is_deleted = 0`,
        [groupId]
      );
      
      // Update each message to mark as deleted for this user
      for (const message of messages) {
        let deletedBy = message.user_deleted_by || '';
        
        // Only add the user if not already in the list
        if (!deletedBy.includes(`,${userId},`)) {
          // Format: ,1,2,3, (with commas at start and end for easier searching)
          deletedBy = deletedBy ? 
            (deletedBy.startsWith(',') ? deletedBy : ',' + deletedBy) : 
            ',';
          
          if (!deletedBy.endsWith(',')) {
            deletedBy += ',';
          }
          
          deletedBy += `${userId},`;
          
          await db.run(
            'UPDATE messages SET user_deleted_by = ? WHERE id = ?',
            [deletedBy, message.id]
          );
        }
      }
      
      return;
    } catch (error) {
      console.error('Clear group conversation error:', error);
      throw error;
    }
  }
} 