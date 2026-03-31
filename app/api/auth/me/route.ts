import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { getDatabase } from '../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const db = await getDatabase();
    const fullUser = await db.get(
      'SELECT id, sso_employee_uuid, username, role, sso_role, full_name, name, middle_name, last_name, position, office_name, email, avatar_path, created_at, last_login, profile_synced_at, profile_data FROM users WHERE id = ?',
      [user.id]
    );

    if (!fullUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse profile_data JSON and merge preferences into response
    let preferences: Record<string, any> = {};
    if (fullUser.profile_data) {
      try {
        preferences = JSON.parse(fullUser.profile_data);
      } catch {
        // Ignore malformed JSON
      }
    }

    const { profile_data, ...userData } = fullUser;

    return NextResponse.json({
      success: true,
      data: {
        ...userData,
        bubble_style: preferences.bubble_style || 'default',
        theme: preferences.theme || 'light',
      },
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
