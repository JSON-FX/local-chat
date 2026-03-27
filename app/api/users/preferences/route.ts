import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { getDatabase } from '../../../../lib/database';

const VALID_THEMES = ['light', 'dark', 'system'];
const VALID_BUBBLE_STYLES = [
  'default', 'emerald', 'violet', 'rose', 'amber', 'slate',
  'ocean', 'sunset', 'aurora', 'lavender'
];

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { bubble_style, theme } = body;

    // Validate inputs
    if (bubble_style !== undefined && !VALID_BUBBLE_STYLES.includes(bubble_style)) {
      return NextResponse.json(
        { success: false, error: `Invalid bubble_style. Must be one of: ${VALID_BUBBLE_STYLES.join(', ')}` },
        { status: 400 }
      );
    }

    if (theme !== undefined && !VALID_THEMES.includes(theme)) {
      return NextResponse.json(
        { success: false, error: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}` },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get current profile_data
    const row = await db.get('SELECT profile_data FROM users WHERE id = ?', [user.id]);
    let profileData: Record<string, any> = {};
    if (row?.profile_data) {
      try {
        profileData = JSON.parse(row.profile_data);
      } catch {
        // Reset if malformed
      }
    }

    // Merge updates
    if (bubble_style !== undefined) profileData.bubble_style = bubble_style;
    if (theme !== undefined) profileData.theme = theme;

    // Save
    await db.run(
      'UPDATE users SET profile_data = ? WHERE id = ?',
      [JSON.stringify(profileData), user.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        bubble_style: profileData.bubble_style || 'default',
        theme: profileData.theme || 'system',
      },
      message: 'Preferences updated successfully'
    });
  } catch (error: any) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update preferences' },
      { status: 401 }
    );
  }
}
