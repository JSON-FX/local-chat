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