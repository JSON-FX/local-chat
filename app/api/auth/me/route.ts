import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { getDatabase } from '../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const db = await getDatabase();
    const fullUser = await db.get(
      'SELECT id, sso_employee_uuid, username, role, sso_role, full_name, position, office_name, email, avatar_path, created_at, last_login, profile_synced_at FROM users WHERE id = ?',
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
      { success: false, error: error.message || 'Failed to get user profile' },
      { status: 401 }
    );
  }
}
