import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { MessageService } from '../../../../../lib/messages';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Validate authentication
    const user = await requireAuth(request);
    
    // Await params before accessing properties
    const resolvedParams = await params;
    const otherUserId = parseInt(resolvedParams.userId);
    if (isNaN(otherUserId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get direct messages
    const messages = await MessageService.getDirectMessages(user.id, otherUserId, limit, offset);

    return NextResponse.json({
      success: true,
      data: messages,
      message: 'Direct messages retrieved successfully'
    });

  } catch (error: any) {
    console.error('Get direct messages error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get direct messages' 
      },
      { status: 500 }
    );
  }
} 