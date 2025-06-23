import { NextRequest, NextResponse } from 'next/server';
import { AuthService, requireAuth } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    await requireAuth(request);

    // Get session ID from token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Logout user (invalidate session)
    await AuthService.logout(decoded.sessionId);

    return NextResponse.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Logout failed' 
      },
      { status: 401 }
    );
  }
} 