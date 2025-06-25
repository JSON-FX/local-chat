import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { MessageService } from '../../../../../lib/messages';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    // Validate authentication
    const user = await requireAuth(request);
    const resolvedParams = await params;
    const otherUserId = parseInt(resolvedParams.userId);
    
    if (isNaN(otherUserId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Delete the conversation (mark messages as deleted for this user)
    await MessageService.deleteConversation(user.id, otherUserId);

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete conversation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete conversation'
      },
      { status: 500 }
    );
  }
} 