import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Attempt login
    const authResponse = await AuthService.login(username, password, ipAddress, userAgent);

    return NextResponse.json({
      success: true,
      data: authResponse,
      message: 'Login successful'
    });

  } catch (error: any) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Login failed' 
      },
      { status: 401 }
    );
  }
} 