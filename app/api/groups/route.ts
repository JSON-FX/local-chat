import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth';
import { GroupService } from '../../../lib/groups';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const user = await requireAuth(request);

    // Get user's groups
    const groups = await GroupService.getUserGroups(user.id);

    return NextResponse.json({
      success: true,
      data: groups,
      message: 'Groups retrieved successfully'
    });

  } catch (error: any) {
    console.error('Get groups error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get groups' 
      },
      { status: 500 }
    );
  }
} 