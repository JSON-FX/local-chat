import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../lib/auth';
import { ssoService } from '../../../../lib/sso';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const tokenHash = AuthService.hashToken(token);

    // Revoke JWT on SSO backend (best-effort — don't fail logout if SSO is unreachable)
    try {
      await ssoService.logout(token);
    } catch (error) {
      console.error('SSO logout failed (best-effort):', error);
    }

    // Invalidate local session
    await AuthService.logoutByTokenHash(tokenHash);

    return NextResponse.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Logout failed' },
      { status: 500 }
    );
  }
}
