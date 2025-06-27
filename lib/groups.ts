import { getDatabase } from './database';
import { Group, CreateGroupData, GroupMember } from './models';
import { MessageService } from './messages';
import { SocketService } from './socket';

export class GroupService {
  
  // Create a new group
  static async createGroup(name: string, description: string, createdBy: number, initialMembers: number[] = []): Promise<Group> {
    const db = await getDatabase();
    
    try {
      console.log('DEBUG: Group creation request:', { name, description, createdBy, initialMembers });
      
      // Validate initial members exist in database
      const memberIds = [...new Set([...initialMembers])]; // Remove duplicates
      console.log('DEBUG: Initial member IDs:', memberIds);
      
      const validMembers = await db.all(
        'SELECT id FROM users WHERE id IN (' + memberIds.map(() => '?').join(',') + ')',
        memberIds
      );
      const validMemberIds = validMembers.map(m => m.id);
      console.log('DEBUG: Valid member IDs from database:', validMemberIds);

      // Start transaction
      await db.run('BEGIN TRANSACTION');

      // Create group
      const result = await db.run(
        'INSERT INTO groups (name, description, created_by, created_at) VALUES (?, ?, ?, datetime("now"))',
        [name, description, createdBy]
      );
      const groupId = result.lastID;
      console.log('DEBUG: Created group with ID:', groupId);

      // Add creator as admin
      await db.run(
        'INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, datetime("now"))',
        [groupId, createdBy, 'admin']
      );
      console.log('DEBUG: Added creator as admin');

      // Add initial members
      for (const memberId of validMemberIds) {
        try {
          if (memberId !== createdBy) {
            await db.run(
              'INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, datetime("now"))',
              [groupId, memberId, 'member']
            );
            console.log(`DEBUG: Added member ${memberId} to group ${groupId}`);
          }
        } catch (error) {
          console.error(`ERROR: Failed to add member ${memberId}:`, error);
        }
      }

      // Commit transaction
      await db.run('COMMIT');

      // Return created group
      const group = await db.get(
        'SELECT * FROM groups WHERE id = ?',
        [groupId]
      ) as Group;

      console.log('DEBUG: Group creation successful:', group);
      return group;

    } catch (error) {
      console.error('ERROR: Group creation failed:', error);
      await db.run('ROLLBACK');
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