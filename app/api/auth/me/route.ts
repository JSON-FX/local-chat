import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication and get user
    const user = await requireAuth(request);

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User profile retrieved successfully'
    });

  } catch (error: any) {
    console.error('Get profile error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get user profile' 
      },
      { status: 401 }
    );
  }
} 