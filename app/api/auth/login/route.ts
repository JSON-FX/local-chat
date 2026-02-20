import { NextRequest, NextResponse } from 'next/server';
import { ssoService } from '../../../../lib/sso';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Generate a state parameter for CSRF protection
    const state = randomBytes(16).toString('hex');
    const loginUrl = ssoService.getLoginUrl(state);

    return NextResponse.json({
      success: true,
      data: {
        login_url: loginUrl,
        state
      },
      message: 'Redirect to SSO login'
    });
  } catch (error: any) {
    console.error('Login redirect error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate login URL' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const state = randomBytes(16).toString('hex');
    const loginUrl = ssoService.getLoginUrl(state);

    return NextResponse.json({
      success: true,
      data: {
        login_url: loginUrl,
        state
      },
      message: 'Redirect to SSO login'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate login URL' },
      { status: 500 }
    );
  }
}
