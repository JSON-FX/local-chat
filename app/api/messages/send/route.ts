import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { MessageService } from '../../../../lib/messages';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const user = await requireAuth(request);
    
    const body = await request.json();
    const { recipient_id, group_id, content, message_type } = body;

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

    // Send message
    const message = await MessageService.sendMessage({
      sender_id: user.id,
      recipient_id: recipient_id || null,
      group_id: group_id || null,
      content: content.trim(),
      message_type: message_type || 'text'
    });

    return NextResponse.json({
      success: true,
      data: message,
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