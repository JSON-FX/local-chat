import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth';
import { getDatabase } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const currentUser = await requireAuth(request);
    const db = await getDatabase();

    // Get all active users except the current user
    const users = await db.all(
      'SELECT id, username, role, created_at, last_login FROM users WHERE status = ? AND id != ? ORDER BY username',
      ['active', currentUser.id]
    );

    return NextResponse.json({
      success: true,
      data: users,
      message: 'Users retrieved successfully'
    });

  } catch (error: any) {
    console.error('Get users error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get users' 
      },
      { status: 401 }
    );
  }
} 