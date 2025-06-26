import { getDatabase } from './database';
import { Group, CreateGroupData, GroupMember } from './models';
import { MessageService } from './messages';
import { SocketService } from './socket';

export class GroupService {
  
  // Create a new group
  static async createGroup(groupData: CreateGroupData, initialMemberIds: number[] = []): Promise<Group> {
    console.log(`DEBUG: Creating group with data:`, JSON.stringify(groupData));
    console.log(`DEBUG: Initial member IDs:`, JSON.stringify(initialMemberIds));
    
    const db = await getDatabase();

    try {
      // Verify the user exists
      const userExists = await db.get('SELECT id, username FROM users WHERE id = ?', [groupData.created_by]);
      
      if (!userExists) {
        throw new Error(`User with ID ${groupData.created_by} does not exist`);
      }

      // Verify that all initial members exist before proceeding
      if (initialMemberIds.length > 0) {
        // Use a single query to check all member IDs at once
        const placeholders = initialMemberIds.map(() => '?').join(',');
        const members = await db.all(`SELECT id FROM users WHERE id IN (${placeholders})`, initialMemberIds);
        
        console.log(`DEBUG: Found ${members.length} valid members out of ${initialMemberIds.length} requested`);
        
        // Filter to only include existing user IDs
        initialMemberIds = members.map(m => m.id);
      }

      // Insert group
      const result = await db.run(
        'INSERT INTO groups (name, description, created_by) VALUES (?, ?, ?)',
        [groupData.name, groupData.description || null, groupData.created_by]
      );

      // Get the inserted ID
      let groupId;
      if (result && typeof result === 'object') {
        groupId = (result as any).lastID || (result as any).lastId || (result as any).insertId;
      }
      
      if (!groupId) {
        // Fallback: get the most recently created group by this user
        const group = await db.get(
          'SELECT * FROM groups WHERE created_by = ? ORDER BY id DESC LIMIT 1', 
          [groupData.created_by]
        );
        if (!group) {
          throw new Error('Failed to retrieve created group');
        }
        groupId = group.id;
      }

      console.log(`DEBUG: Successfully created group with ID ${groupId}`);

      // Add creator as admin
      try {
        await db.run(
          'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
          [groupId, groupData.created_by, 'admin']
        );
        console.log(`DEBUG: Added creator (${groupData.created_by}) as admin`);
      } catch (error: any) {
        console.error(`ERROR: Failed to add creator as admin:`, error);
        throw new Error(`Failed to add creator as admin: ${error.message}`);
      }

      // Add initial members and create system messages
      for (const userId of initialMemberIds) {
        if (userId !== groupData.created_by) { // Don't add creator twice
          try {
            await db.run(
              'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
              [groupId, userId, 'member']
            );
            console.log(`DEBUG: Added member ${userId} to group ${groupId}`);

            // Get username for system message
            const member = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
            if (member) {
              const systemMessage = `${member.username} joined the group`;
              const message = await MessageService.createSystemMessage(groupId, systemMessage);
              
              // Broadcast system message to group members
              SocketService.broadcastSystemMessage(groupId, message);
            }
          } catch (error: any) {
            console.error(`ERROR: Failed to add member ${userId}:`, error);
            // Continue with other members instead of failing completely
          }
        }
      }

      // Get the created group
      const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
      return group;
    } catch (error) {
      console.error('ERROR in createGroup:', error);
      throw error;
    }
  }

  // Get group by ID with member check
  static async getGroupById(groupId: number, userId: number): Promise<Group | null> {
    const db = await getDatabase();

    try {
      // Check if user is a member of the group
      const membership = await db.get(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = 1',
        [groupId, userId]
      );

      if (!membership) {
        return null; // User is not a member
      }

      const group = await db.get(
        'SELECT * FROM groups WHERE id = ? AND is_active = 1',
        [groupId]
      );

      return group || null;
    } catch (error) {
      throw error;
    }
  }

  // Get all groups for a user
  static async getUserGroups(userId: number): Promise<Group[]> {
    const db = await getDatabase();

    try {
      const groups = await db.all(
        `SELECT g.*, gm.role as user_role 
         FROM groups g
         JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ? AND gm.is_active = 1 AND g.is_active = 1
         ORDER BY g.name`,
        [userId]
      );

      return groups;
    } catch (error) {
      throw error;
    }
  }

  // Add member to group
  static async addMember(groupId: number, userId: number, addedBy: number, role: 'member' | 'moderator' = 'member'): Promise<void> {
    const db = await getDatabase();

    try {
      // Check if the person adding is an admin or moderator
      const addedByMember = await db.get(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = 1',
        [groupId, addedBy]
      );

      if (!addedByMember || (addedByMember.role !== 'admin' && addedByMember.role !== 'moderator')) {
        throw new Error('Only admins and moderators can add members');
      }

      // Get username of the new member
      const newMember = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
      if (!newMember) {
        throw new Error('User not found');
      }

      // Check if user is already a member
      const existingMember = await db.get(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
        [groupId, userId]
      );

      let isRejoining = false;
      if (existingMember) {
        // Reactivate if they were previously removed
        await db.run(
          'UPDATE group_members SET is_active = 1, role = ? WHERE group_id = ? AND user_id = ?',
          [role, groupId, userId]
        );
        isRejoining = true;
      } else {
        // Add as new member
        await db.run(
          'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
          [groupId, userId, role]
        );
      }

      // Create system message
      const systemMessage = isRejoining 
        ? `${newMember.username} rejoined the group`
        : `${newMember.username} joined the group`;
      
      console.log(`📢 Creating system message for group ${groupId}: ${systemMessage}`);
      const message = await MessageService.createSystemMessage(groupId, systemMessage);
      console.log(`📢 System message created:`, message);
      
      // Broadcast system message to group members
      SocketService.broadcastSystemMessage(groupId, message);
      console.log(`📢 System message broadcasted to group ${groupId}`);
    } catch (error) {
      throw error;
    }
  }

  // Remove member from group
  static async removeMember(groupId: number, userId: number, removedBy: number): Promise<void> {
    const db = await getDatabase();

    try {
      // Check if the person removing is an admin
      const removedByMember = await db.get(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = 1',
        [groupId, removedBy]
      );

      if (!removedByMember || removedByMember.role !== 'admin') {
        throw new Error('Only admins can remove members');
      }

      // Cannot remove the group creator
      const group = await db.get('SELECT created_by FROM groups WHERE id = ?', [groupId]);
      if (group && group.created_by === userId) {
        throw new Error('Cannot remove the group creator');
      }

      // Get username of the removed member
      const removedMember = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
      if (!removedMember) {
        throw new Error('User not found');
      }

      // Remove member (soft delete)
      await db.run(
        'UPDATE group_members SET is_active = 0 WHERE group_id = ? AND user_id = ?',
        [groupId, userId]
      );

      // Create system message
      const systemMessage = `${removedMember.username} was removed from the group`;
      const message = await MessageService.createSystemMessage(groupId, systemMessage);
      
      // Broadcast system message to group members
      SocketService.broadcastSystemMessage(groupId, message);
    } catch (error) {
      throw error;
    }
  }

  // Get group members
  static async getGroupMembers(groupId: number, requestingUserId: number): Promise<any[]> {
    const db = await getDatabase();

    try {
      // Check if requesting user is a member
      const membership = await db.get(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = 1',
        [groupId, requestingUserId]
      );

      if (!membership) {
        throw new Error('Access denied: Not a member of this group');
      }

      const members = await db.all(
        `SELECT u.id, u.username, u.role as user_role, u.last_login,
                gm.role as group_role, gm.joined_at
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = ? AND gm.is_active = 1 AND u.status = 'active'
         ORDER BY gm.role, u.username`,
        [groupId]
      );

      return members;
    } catch (error) {
      throw error;
    }
  }

  // Update group settings
  static async updateGroup(groupId: number, updates: { name?: string; description?: string; avatar_path?: string | null }, updatedBy: number): Promise<Group> {
    const db = await getDatabase();

    try {
      // Check if user is admin for avatar changes, admin/moderator for other changes
      const membership = await db.get(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = 1',
        [groupId, updatedBy]
      );

      if (!membership) {
        throw new Error('Not a member of this group');
      }

      // Avatar changes require admin role
      if (updates.avatar_path !== undefined && membership.role !== 'admin') {
        throw new Error('Only group admins can change the group avatar');
      }

      // Other changes allow admin or moderator
      if ((updates.name !== undefined || updates.description !== undefined) && 
          (membership.role !== 'admin' && membership.role !== 'moderator')) {
        throw new Error('Only admins and moderators can update group settings');
      }

      // Build update query
      const setClause = [];
      const params = [];

      if (updates.name !== undefined) {
        setClause.push('name = ?');
        params.push(updates.name);
      }

      if (updates.description !== undefined) {
        setClause.push('description = ?');
        params.push(updates.description);
      }

      if (updates.avatar_path !== undefined) {
        setClause.push('avatar_path = ?');
        params.push(updates.avatar_path);
      }

      if (setClause.length === 0) {
        throw new Error('No updates provided');
      }

      params.push(groupId);

      await db.run(
        `UPDATE groups SET ${setClause.join(', ')} WHERE id = ?`,
        params
      );

      // Return updated group
      const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
      return group;
    } catch (error) {
      throw error;
    }
  }

  // Update group avatar
  static async updateGroupAvatar(groupId: number, avatarPath: string, updatedBy: number): Promise<Group> {
    return this.updateGroup(groupId, { avatar_path: avatarPath }, updatedBy);
  }

  // Remove group avatar
  static async removeGroupAvatar(groupId: number, updatedBy: number): Promise<Group> {
    return this.updateGroup(groupId, { avatar_path: null }, updatedBy);
  }

  // Check if user is member of group
  static async isUserMember(groupId: number, userId: number): Promise<boolean> {
    const db = await getDatabase();

    try {
      const membership = await db.get(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = 1',
        [groupId, userId]
      );

      return !!membership;
    } catch (error) {
      return false;
    }
  }

  // Get user's role in group
  static async getUserRole(groupId: number, userId: number): Promise<string | null> {
    const db = await getDatabase();

    try {
      const membership = await db.get(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND is_active = 1',
        [groupId, userId]
      );

      return membership ? membership.role : null;
    } catch (error) {
      return null;
    }
  }

  // Soft-delete a group (owner only)
  static async deleteGroup(groupId: number): Promise<void> {
    const db = await getDatabase();
    // Soft-delete group
    await db.run('UPDATE groups SET is_active = 0 WHERE id = ?', [groupId]);
    // Soft-delete all group messages
    await db.run('UPDATE messages SET is_deleted = 1 WHERE group_id = ?', [groupId]);
    // Remove all members
    await db.run('UPDATE group_members SET is_active = 0 WHERE group_id = ?', [groupId]);
  }

  // Leave a group with ownership transfer if owner leaves
  static async leaveGroup(groupId: number, userId: number): Promise<{ ownershipTransferred?: boolean; newOwnerId?: number; newOwnerUsername?: string }> {
    const db = await getDatabase();
    
    try {
      // Get username of the leaving user
      const leavingUser = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
      if (!leavingUser) {
        throw new Error('User not found');
      }

      // Check if user is the group owner
      const group = await db.get('SELECT created_by FROM groups WHERE id = ? AND is_active = 1', [groupId]);
      if (!group) {
        throw new Error('Group not found');
      }
      
      const isOwner = group.created_by === userId;
      let result: { ownershipTransferred?: boolean; newOwnerId?: number; newOwnerUsername?: string } = {};
      
      if (isOwner) {
        // Find the first member (by joined_at) who is not the owner to transfer ownership to
        const firstMember = await db.get(
          `SELECT gm.user_id, u.username 
           FROM group_members gm
           JOIN users u ON gm.user_id = u.id
           WHERE gm.group_id = ? 
             AND gm.user_id != ? 
             AND gm.is_active = 1 
             AND u.status = 'active'
           ORDER BY gm.joined_at ASC 
           LIMIT 1`,
          [groupId, userId]
        );
        
        if (firstMember) {
          // Transfer ownership to the first member
          await db.run(
            'UPDATE groups SET created_by = ? WHERE id = ?',
            [firstMember.user_id, groupId]
          );
          
          // Make the new owner an admin if they aren't already
          await db.run(
            'UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?',
            ['admin', groupId, firstMember.user_id]
          );
          
          result.ownershipTransferred = true;
          result.newOwnerId = firstMember.user_id;
          result.newOwnerUsername = firstMember.username;

          // Create system message for ownership transfer
          const ownershipMessage = `${leavingUser.username} left the group. ${firstMember.username} is now the group owner.`;
          const message = await MessageService.createSystemMessage(groupId, ownershipMessage);
          
          // Broadcast system message to group members
          SocketService.broadcastSystemMessage(groupId, message);
        } else {
          // No members left to transfer ownership to, delete the group
          await this.deleteGroup(groupId);
          return result; // Don't create system message if group is deleted
        }
      } else {
        // Create system message for regular member leaving
        const systemMessage = `${leavingUser.username} left the group`;
        const message = await MessageService.createSystemMessage(groupId, systemMessage);
        
        // Broadcast system message to group members
        SocketService.broadcastSystemMessage(groupId, message);
      }
      
      // Remove the user from the group
      await db.run('UPDATE group_members SET is_active = 0 WHERE group_id = ? AND user_id = ?', [groupId, userId]);
      
      return result;
    } catch (error) {
      throw error;
    }
  }
} 