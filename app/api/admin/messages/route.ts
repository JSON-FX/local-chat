import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { auditLog } from '@/lib/auditLog';

// GET /api/admin/messages - Monitor all messages with advanced filtering
export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireRole(['admin'])(request);
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const sender_id = searchParams.get('sender_id') || '';
    const recipient_id = searchParams.get('recipient_id') || '';
    const group_id = searchParams.get('group_id') || '';
    const message_type = searchParams.get('message_type') || '';
    const start_date = searchParams.get('start_date') || '';
    const end_date = searchParams.get('end_date') || '';
    const include_deleted = searchParams.get('include_deleted') === 'true';
    const sortBy = searchParams.get('sortBy') || 'timestamp';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const offset = (page - 1) * limit;
    const db = await getDatabase();
    
    // Build query conditions
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (search) {
      conditions.push('m.content LIKE ?');
      params.push(`%${search}%`);
    }
    
    if (sender_id) {
      conditions.push('m.sender_id = ?');
      params.push(parseInt(sender_id));
    }
    
    if (recipient_id) {
      conditions.push('m.recipient_id = ?');
      params.push(parseInt(recipient_id));
    }
    
    if (group_id) {
      conditions.push('m.group_id = ?');
      params.push(parseInt(group_id));
    }
    
    if (message_type) {
      conditions.push('m.message_type = ?');
      params.push(message_type);
    }
    
    if (start_date) {
      conditions.push('m.timestamp >= ?');
      params.push(start_date);
    }
    
    if (end_date) {
      conditions.push('m.timestamp <= ?');
      params.push(end_date);
    }
    
    if (!include_deleted) {
      conditions.push('m.is_deleted = 0');
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM messages m
      ${whereClause}
    `;
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;
    
    // Get messages with user and group info
    const messagesQuery = `
      SELECT 
        m.id, m.content, m.message_type, m.timestamp, m.is_deleted, m.is_read,
        m.file_path, m.file_size, m.file_type, m.original_filename,
        m.sender_id, m.recipient_id, m.group_id, m.user_deleted_by,
        sender.username as sender_username,
        sender.name as sender_name,
        recipient.username as recipient_username,
        recipient.name as recipient_name,
        g.name as group_name,
        (
          SELECT COUNT(*) 
          FROM message_reads mr 
          WHERE mr.message_id = m.id
        ) as read_count
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users recipient ON m.recipient_id = recipient.id
      LEFT JOIN groups g ON m.group_id = g.id
      ${whereClause}
      ORDER BY m.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;
    
    const messages = await db.all(messagesQuery, [...params, limit, offset]);
    
    // Get message statistics for this filter
    const statsQuery = `
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN m.message_type = 'text' THEN 1 END) as text_messages,
        COUNT(CASE WHEN m.message_type = 'file' THEN 1 END) as file_messages,
        COUNT(CASE WHEN m.message_type = 'image' THEN 1 END) as image_messages,
        COUNT(CASE WHEN m.is_deleted = 1 THEN 1 END) as deleted_messages,
        COUNT(DISTINCT m.sender_id) as unique_senders,
        COUNT(DISTINCT m.group_id) as unique_groups
      FROM messages m
      ${whereClause}
    `;
    
    const stats = await db.get(statsQuery, params);
    
    // Log admin action
    await auditLog.userUpdated(adminUser.id, adminUser.username, 0, { 
      action: 'messages_monitored',
      filters: { 
        search, sender_id, recipient_id, group_id, message_type, 
        start_date, end_date, include_deleted 
      },
      result_count: messages.length
    });
    
    return NextResponse.json({
      success: true,
      data: {
        messages,
        stats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error: any) {
    console.error('Admin messages monitoring error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get messages' },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/admin/messages - Bulk delete messages
export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await requireRole(['admin'])(request);
    const body = await request.json();
    
    const { message_ids, reason } = body;
    
    if (!message_ids || !Array.isArray(message_ids) || message_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message IDs array is required' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Get message details before deletion for audit
    const messagePlaceholders = message_ids.map(() => '?').join(',');
    const messages = await db.all(`
      SELECT id, sender_id, content, message_type, group_id, recipient_id
      FROM messages 
      WHERE id IN (${messagePlaceholders})
    `, message_ids);
    
    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No messages found' },
        { status: 404 }
      );
    }
    
    // Mark messages as deleted (soft delete)
    await db.run(`
      UPDATE messages 
      SET is_deleted = 1, user_deleted_by = ?
      WHERE id IN (${messagePlaceholders})
    `, [JSON.stringify({ admin_id: adminUser.id, admin_username: adminUser.username, reason: reason || 'Admin deletion' }), ...message_ids]);
    
    // Log each message deletion
    for (const message of messages) {
      await auditLog.messageDeleted(
        adminUser.id, 
        adminUser.username, 
        message.id, 
        `admin_bulk_delete: ${reason || 'No reason provided'}`
      );
    }
    
    return NextResponse.json({
      success: true,
      data: { 
        deleted_count: messages.length,
        deleted_message_ids: message_ids 
      },
      message: `Successfully deleted ${messages.length} messages`
    });
    
  } catch (error: any) {
    console.error('Admin bulk message deletion error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete messages' },
      { status: error.status || 500 }
    );
  }
} 