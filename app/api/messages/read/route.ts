import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { MessageReadService } from '@/lib/messageReads';
import { SocketService } from '@/lib/socket';

// Mark messages as read
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const { message_ids, conversation_id, is_group, mark_all } = await request.json();

    if (conversation_id === undefined || is_group === undefined) {
      return NextResponse.json({ success: false, error: 'Conversation ID and type are required' }, { status: 400 });
    }

    let messageIds: number[];

    if (mark_all) {
      // Mark ALL unread messages in the conversation as read
      messageIds = await MessageReadService.markAllUnreadAsRead(user.id, conversation_id, is_group);
    } else {
      // Mark specific messages as read
      if (!message_ids || !Array.isArray(message_ids) || message_ids.length === 0) {
        return NextResponse.json({ success: false, error: 'Message IDs are required when mark_all is false' }, { status: 400 });
      }
      
      messageIds = message_ids;
      await MessageReadService.markMessagesAsRead(message_ids, user.id);
    }

    // Only broadcast if there were actually messages marked as read
    if (messageIds.length > 0) {
      // Broadcast read status to other participants
      if (is_group) {
        // For groups, broadcast to all group members
        SocketService.broadcastToGroup(conversation_id, 'messages_read', {
          message_ids: messageIds,
          reader_id: user.id,
          reader_username: user.username,
          reader_avatar: (user as any).avatar_path,
          conversation_id,
          is_group: true
        });
      } else {
        // For direct messages, broadcast to the other participant
        SocketService.broadcast('messages_read', {
          message_ids: messageIds,
          reader_id: user.id,
          reader_username: user.username,
          reader_avatar: (user as any).avatar_path,
          conversation_id,
          is_group: false
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        message: mark_all ? `All ${messageIds.length} unread messages marked as read` : 'Messages marked as read',
        marked_count: messageIds.length
      } 
    });

  } catch (error: any) {
    console.error('Mark messages as read error:', error);
    
    // Handle authentication errors
    if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Session invalid or expired') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to mark messages as read' 
    }, { status: 500 });
  }
}

// Get unread counts for all conversations
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const unreadCounts = await MessageReadService.getAllUnreadCounts(user.id);

    console.log(`📊 API: getAllUnreadCounts for user ${user.username} (${user.id}):`, unreadCounts);

    return NextResponse.json({ 
      success: true, 
      data: { unread_counts: unreadCounts } 
    });

  } catch (error: any) {
    console.error('Get unread counts error:', error);
    
    // Handle authentication errors
    if (error.message === 'No token provided' || error.message === 'Invalid token' || error.message === 'Session invalid or expired') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to get unread counts' 
    }, { status: 500 });
  }
} 