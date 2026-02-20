import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../../lib/auth';

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const state = searchParams.get('state');

    if (!token || !state) {
      return NextResponse.redirect(new URL('/?error=missing_params', baseUrl));
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Authenticate with SSO
    await AuthService.authenticateWithSso(token, ipAddress, userAgent);

    // Redirect to client-side callback page which will store the token
    const callbackUrl = new URL('/auth/callback', baseUrl);
    callbackUrl.searchParams.set('token', token);
    callbackUrl.searchParams.set('state', state);

    return NextResponse.redirect(callbackUrl);
  } catch (error: any) {
    console.error('SSO callback error:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', baseUrl));
  }
}
