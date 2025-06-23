import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { SocketService } from '../../../../lib/socket';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    await requireAuth(request);

    // Get online users
    const onlineUsers = SocketService.getOnlineUsers();

    return NextResponse.json({
      success: true,
      data: onlineUsers,
      message: 'Online users retrieved successfully'
    });

  } catch (error: any) {
    console.error('Get online users error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get online users' 
      },
      { status: 401 }
    );
  }
} 