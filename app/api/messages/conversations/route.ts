import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { MessageService } from '../../../../lib/messages';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const user = await requireAuth(request);

    // Get recent conversations
    const conversations = await MessageService.getRecentConversations(user.id);

    return NextResponse.json({
      success: true,
      data: conversations,
      message: 'Conversations retrieved successfully'
    });

  } catch (error: any) {
    console.error('Get conversations error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get conversations' 
      },
      { status: 500 }
    );
  }
}

// Delete (hide) a direct conversation for the current user
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { other_user_id } = await request.json();
    if (!other_user_id || isNaN(parseInt(other_user_id))) {
      return NextResponse.json(
        { success: false, error: 'Valid other_user_id is required' },
        { status: 400 }
      );
    }
    await MessageService.deleteConversation(user.id, parseInt(other_user_id));
    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete conversation' },
      { status: 500 }
    );
  }
} 