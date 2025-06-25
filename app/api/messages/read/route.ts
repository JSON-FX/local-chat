import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { MessageReadService } from '@/lib/messageReads';
import { SocketService } from '@/lib/socket';

// Mark messages as read
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const { message_ids, conversation_id, is_group } = await request.json();

    if (!message_ids || !Array.isArray(message_ids) || message_ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Message IDs are required' }, { status: 400 });
    }

    if (conversation_id === undefined || is_group === undefined) {
      return NextResponse.json({ success: false, error: 'Conversation ID and type are required' }, { status: 400 });
    }

    // Mark messages as read
    await MessageReadService.markMessagesAsRead(message_ids, user.id);

    // Broadcast read status to other participants
    if (is_group) {
      // For groups, broadcast to all group members
      SocketService.broadcastToGroup(conversation_id, 'messages_read', {
        message_ids,
        reader_id: user.id,
        reader_username: user.username,
        conversation_id,
        is_group: true
      });
    } else {
      // For direct messages, broadcast to the other participant
      SocketService.broadcast('messages_read', {
        message_ids,
        reader_id: user.id,
        reader_username: user.username,
        conversation_id,
        is_group: false
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: { message: 'Messages marked as read' } 
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