import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { MessageReadService } from '@/lib/messageReads';
import { SocketService } from '@/lib/socket';

// Mark messages as read
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.text();
    console.log(`📖 DEBUG: /api/messages/read - Raw body:`, body);
    
    if (!body.trim()) {
      console.log(`📖 DEBUG: /api/messages/read - Empty body received`);
      return NextResponse.json({ success: false, error: 'Empty request body' }, { status: 400 });
    }

    let data;
    try {
      data = JSON.parse(body);
      console.log(`📖 DEBUG: /api/messages/read - Parsed data:`, data);
    } catch (parseError) {
      console.error(`📖 DEBUG: /api/messages/read - JSON parse error:`, parseError);
      return NextResponse.json({ success: false, error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { message_ids, conversation_id, is_group, mark_all } = data;
    
    console.log(`📖 DEBUG: /api/messages/read - Processing request:`, {
      userId: user.id,
      username: user.username,
      messageIds: message_ids,
      conversationId: conversation_id,
      isGroup: is_group,
      markAll: mark_all,
      messageCount: message_ids?.length || 0
    });

    let messageIds: number[];

    if (mark_all) {
      // Mark ALL unread messages in the conversation as read
      console.log(`📖 DEBUG: /api/messages/read - Marking all unread messages in conversation`);
      messageIds = await MessageReadService.markAllUnreadAsRead(user.id, conversation_id, is_group);
      console.log(`📖 DEBUG: /api/messages/read - Found ${messageIds.length} unread messages to mark`);
    } else {
      // Mark specific messages as read
      if (!message_ids || !Array.isArray(message_ids) || message_ids.length === 0) {
        console.log(`📖 DEBUG: /api/messages/read - Invalid message_ids:`, message_ids);
        return NextResponse.json({ success: false, error: 'Message IDs are required when mark_all is false' }, { status: 400 });
      }
      messageIds = message_ids;
      await MessageReadService.markMessagesAsRead(message_ids, user.id);
    }

    if (conversation_id === undefined || conversation_id === null) {
      console.log(`📖 DEBUG: /api/messages/read - Invalid conversation_id:`, conversation_id);
      return NextResponse.json({ success: false, error: 'Conversation ID is required' }, { status: 400 });
    }

    console.log(`📖 DEBUG: /api/messages/read - Successfully marked ${messageIds.length} messages as read for user ${user.id}`);

    // Only broadcast if there were actually messages marked as read
    if (messageIds.length === 0) {
      console.log(`📖 DEBUG: /api/messages/read - No messages to broadcast`);
      return NextResponse.json({ 
        success: true, 
        message: `No unread messages found` 
      });
    }

    // Broadcast the read event via socket
    const socketData = {
      message_ids: messageIds,
      reader_id: user.id,
      reader_username: user.username,
      reader_avatar: (user as any).avatar_path,
      conversation_id,
      is_group
    };
    
    console.log(`📖 DEBUG: /api/messages/read - Broadcasting socket event:`, socketData);
    
    try {
      SocketService.broadcast('messages_read', socketData);
      console.log(`📖 DEBUG: /api/messages/read - Socket broadcast successful`);
    } catch (socketError) {
      console.error(`📖 DEBUG: /api/messages/read - Socket broadcast error:`, socketError);
    }

    return NextResponse.json({ 
      success: true, 
      message: mark_all ? `All ${messageIds.length} unread messages marked as read` : `Marked ${messageIds.length} messages as read`,
      data: { marked_count: messageIds.length }
    });

  } catch (error) {
    console.error('📖 DEBUG: /api/messages/read - Server error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
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