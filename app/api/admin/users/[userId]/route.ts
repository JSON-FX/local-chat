import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { auditLog } from '@/lib/auditLog';
import { AuthService } from '@/lib/auth';

// GET /api/admin/users/[userId] - Get specific user details
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const adminUser = await requireRole(['admin'])(request);
    const userId = parseInt(params.userId);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Get user details
    const user = await db.get(`
      SELECT 
        id, username, role, created_at, last_login, status,
        name, last_name, middle_name, position, department, 
        email, mobile_number, avatar_path, ban_reason, banned_until,
        failed_login_attempts, last_failed_login, profile_data
      FROM users 
      WHERE id = ?
    `, [userId]);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get user's active sessions
    const sessions = await db.all(`
      SELECT id, created_at, expires_at, ip_address, user_agent, last_activity
      FROM sessions 
      WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
      ORDER BY last_activity DESC
    `, [userId]);
    
    // Get user's recent activity from audit logs
    const recentActivity = await db.all(`
      SELECT action, entity_type, entity_id, timestamp, details
      FROM audit_logs 
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT 20
    `, [userId]);
    
    // Get user's group memberships
    const groupMemberships = await db.all(`
      SELECT g.id, g.name, g.description, gm.role, gm.joined_at
      FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      WHERE gm.user_id = ? AND gm.is_active = 1 AND g.is_active = 1
      ORDER BY gm.joined_at DESC
    `, [userId]);
    
    // Get user's message statistics
    const messageStats = await db.get(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN timestamp >= datetime('now', '-1 day') THEN 1 END) as messages_24h,
        COUNT(CASE WHEN timestamp >= datetime('now', '-7 days') THEN 1 END) as messages_7d,
        COUNT(CASE WHEN message_type = 'file' THEN 1 END) as files_sent
      FROM messages 
      WHERE sender_id = ? AND is_deleted = 0
    `, [userId]);
    
    // Log admin action
    await auditLog.userUpdated(adminUser.id, adminUser.username, userId, { 
      action: 'user_details_viewed',
      viewed_user: user.username 
    });
    
    return NextResponse.json({
      success: true,
      data: {
        user,
        sessions,
        recent_activity: recentActivity,
        group_memberships: groupMemberships,
        message_stats: messageStats
      }
    });
    
  } catch (error: any) {
    console.error('Admin user details error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get user details' },
      { status: error.status || 500 }
    );
  }
}

// PUT /api/admin/users/[userId] - Update user details
export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const adminUser = await requireRole(['admin'])(request);
    const userId = parseInt(params.userId);
    const body = await request.json();
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Get current user data
    const currentUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const { 
      username, role, status, name, last_name, middle_name, 
      position, department, email, mobile_number, ban_reason, banned_until 
    } = body;
    
    // Validate role if provided
    const validRoles = ['admin', 'moderator', 'user'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role specified' },
        { status: 400 }
      );
    }
    
    // Validate status if provided
    const validStatuses = ['active', 'inactive', 'banned'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status specified' },
        { status: 400 }
      );
    }
    
    // Prevent admin from demoting themselves
    if (adminUser.id === userId && role && role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot change your own admin role' },
        { status: 400 }
      );
    }
    
    // Build update query
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    const changes: any = {};
    
    if (username && username !== currentUser.username) {
      updateFields.push('username = ?');
      updateParams.push(username);
      changes.username = { from: currentUser.username, to: username };
    }
    
    if (role && role !== currentUser.role) {
      updateFields.push('role = ?');
      updateParams.push(role);
      changes.role = { from: currentUser.role, to: role };
    }
    
    if (status && status !== currentUser.status) {
      updateFields.push('status = ?');
      updateParams.push(status);
      changes.status = { from: currentUser.status, to: status };
    }
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateParams.push(name);
      changes.name = { from: currentUser.name, to: name };
    }
    
    if (last_name !== undefined) {
      updateFields.push('last_name = ?');
      updateParams.push(last_name);
      changes.last_name = { from: currentUser.last_name, to: last_name };
    }
    
    if (middle_name !== undefined) {
      updateFields.push('middle_name = ?');
      updateParams.push(middle_name);
      changes.middle_name = { from: currentUser.middle_name, to: middle_name };
    }
    
    if (position !== undefined) {
      updateFields.push('position = ?');
      updateParams.push(position);
      changes.position = { from: currentUser.position, to: position };
    }
    
    if (department !== undefined) {
      updateFields.push('department = ?');
      updateParams.push(department);
      changes.department = { from: currentUser.department, to: department };
    }
    
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateParams.push(email);
      changes.email = { from: currentUser.email, to: email };
    }
    
    if (mobile_number !== undefined) {
      updateFields.push('mobile_number = ?');
      updateParams.push(mobile_number);
      changes.mobile_number = { from: currentUser.mobile_number, to: mobile_number };
    }
    
    if (ban_reason !== undefined) {
      updateFields.push('ban_reason = ?');
      updateParams.push(ban_reason);
      changes.ban_reason = { from: currentUser.ban_reason, to: ban_reason };
    }
    
    if (banned_until !== undefined) {
      updateFields.push('banned_until = ?');
      updateParams.push(banned_until);
      changes.banned_until = { from: currentUser.banned_until, to: banned_until };
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No changes provided' },
        { status: 400 }
      );
    }
    
    // Update user
    updateParams.push(userId);
    await db.run(`
      UPDATE users SET ${updateFields.join(', ')} 
      WHERE id = ?
    `, updateParams);
    
    // If user was banned, invalidate their sessions
    if (status === 'banned' || status === 'inactive') {
      await db.run('UPDATE sessions SET is_active = 0 WHERE user_id = ?', [userId]);
    }
    
    // Log admin action
    await auditLog.userUpdated(adminUser.id, adminUser.username, userId, changes);
    
    // Get updated user
    const updatedUser = await db.get(`
      SELECT 
        id, username, role, created_at, last_login, status,
        name, last_name, middle_name, position, department, 
        email, mobile_number, avatar_path, ban_reason, banned_until,
        failed_login_attempts, last_failed_login
      FROM users 
      WHERE id = ?
    `, [userId]);
    
    return NextResponse.json({
      success: true,
      data: { user: updatedUser },
      message: 'User updated successfully'
    });
    
  } catch (error: any) {
    console.error('Admin user update error:', error);
    
    // Handle specific database errors
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/admin/users/[userId] - Delete user
export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const adminUser = await requireRole(['admin'])(request);
    const userId = parseInt(params.userId);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    // Prevent admin from deleting themselves
    if (adminUser.id === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Get user data before deletion
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Delete user (cascading deletes will handle sessions, group memberships, etc.)
    await db.run('DELETE FROM users WHERE id = ?', [userId]);
    
    // Log admin action
    await auditLog.userUpdated(adminUser.id, adminUser.username, userId, { 
      action: 'user_deleted',
      deleted_user: user.username,
      deleted_user_role: user.role 
    });
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Admin user deletion error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete user' },
      { status: error.status || 500 }
    );
  }
} 