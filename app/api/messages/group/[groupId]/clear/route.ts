import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../../lib/auth';
import { MessageService } from '../../../../../../lib/messages';

interface RouteContext {
  params: Promise<{
    groupId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    // Validate authentication
    const user = await requireAuth(request);
    
    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.groupId);
    if (isNaN(groupId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID' },
        { status: 400 }
      );
    }

    // Clear group conversation for this user (mark messages as deleted for this user only)
    await MessageService.clearGroupConversation(user.id, groupId);

    return NextResponse.json({
      success: true,
      message: 'Group conversation cleared successfully'
    });

  } catch (error: any) {
    console.error('Clear group conversation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to clear group conversation' 
      },
      { status: 500 }
    );
  }
} 