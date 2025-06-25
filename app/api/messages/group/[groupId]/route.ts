import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { MessageService } from '../../../../../lib/messages';

interface RouteContext {
  params: Promise<{
    groupId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
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

    // Get group messages (this will check if user is a member)
    const messages = await MessageService.getGroupMessages(groupId, user.id);

    return NextResponse.json({
      success: true,
      data: messages,
      message: 'Group messages retrieved successfully'
    });

  } catch (error: any) {
    console.error('Get group messages error:', error);
    
    // Check if it's a permission error
    if (error.message?.includes('not a member')) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You are not a member of this group' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get group messages' 
      },
      { status: 500 }
    );
  }
} 