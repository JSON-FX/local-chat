import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { getDatabase } from '../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication and get user
    const user = await requireAuth(request);

    // Get full user profile data from database
    const db = await getDatabase();
    const fullUser = await db.get(
      'SELECT id, username, role, created_at, name, last_name, middle_name, position, department, email, mobile_number, avatar_path FROM users WHERE id = ?',
      [user.id]
    );

    if (!fullUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: fullUser,
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