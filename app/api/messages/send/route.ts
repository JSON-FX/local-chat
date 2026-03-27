import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { MessageService } from '../../../../lib/messages';
import { SocketService } from '../../../../lib/socket';
import { CreateMessageData } from '../../../../lib/models';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const user = await requireAuth(request);
    
    const body = await request.json();
    const { recipient_id, group_id, content, message_type, file_path, file_name, file_size, reply_to_id } = body;

    // Validate input
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Validate that either recipient_id or group_id is provided, but not both
    if ((!recipient_id && !group_id) || (recipient_id && group_id)) {
      return NextResponse.json(
        { success: false, error: 'Message must have either recipient_id or group_id, but not both' },
        { status: 400 }
      );
    }

    // Validate reply_to_id if provided
    if (reply_to_id) {
      const { getDatabase } = await import('../../../../lib/database');
      const db = await getDatabase();
      const originalMessage = await db.get('SELECT id, sender_id, recipient_id, group_id FROM messages WHERE id = ? AND is_deleted = 0', [reply_to_id]);

      if (!originalMessage) {
        return NextResponse.json(
          { success: false, error: 'Original message not found' },
          { status: 400 }
        );
      }

      // Validate same conversation: for DMs, the original must involve the same two users
      if (recipient_id) {
        const isDmMatch =
          (originalMessage.sender_id === user.id && originalMessage.recipient_id === recipient_id) ||
          (originalMessage.sender_id === recipient_id && originalMessage.recipient_id === user.id);
        if (!isDmMatch || originalMessage.group_id) {
          return NextResponse.json(
            { success: false, error: 'Cannot reply to a message from a different conversation' },
            { status: 400 }
          );
        }
      }

      // For group messages, the original must be in the same group
      if (group_id) {
        if (originalMessage.group_id !== group_id) {
          return NextResponse.json(
            { success: false, error: 'Cannot reply to a message from a different conversation' },
            { status: 400 }
          );
        }
      }
    }

    // Build message data with proper typing
    const messageData: CreateMessageData = {
      sender_id: user.id,
      recipient_id: recipient_id || undefined,
      group_id: group_id || undefined,
      content: content.trim(),
      message_type: message_type || 'text',
      file_path: file_path,
      file_name: file_name,
      file_size: file_size,
      reply_to_id: reply_to_id || undefined
    };

    // Send message
    const message = await MessageService.sendMessage(messageData);

    // Add sender username for real-time display
    const messageWithSender = {
      ...message,
      sender_username: user.username
    };

    // Broadcast message via socket for real-time delivery
    if (group_id) {
      // Group message - broadcast to all group members in the room
      const io = SocketService.getIO();
      if (io) {
        io.to(`group_${group_id}`).emit('new_message', messageWithSender);
        console.log(`📨 Message broadcast to group ${group_id} from ${user.username}`);
      }
    } else if (recipient_id) {
      // Direct message - send to specific user if online
      const success = SocketService.sendToUser(recipient_id, 'new_message', messageWithSender);
      console.log(`📨 Message sent to user ${recipient_id} from ${user.username} - Success: ${success}`);
    }

    return NextResponse.json({
      success: true,
      data: messageWithSender,
      message: 'Message sent successfully'
    });

  } catch (error: any) {
    console.error('Send message error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to send message' 
      },
      { status: 500 }
    );
  }
}
