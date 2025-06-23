import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, confirmPassword } = body;

    // Validate input
    if (!username || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    // Create user
    const user = await AuthService.createUser({
      username: username.trim().toLowerCase(),
      password,
      role: 'user' // Default role for new registrations
    });

    // Auto-login after registration
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const authResponse = await AuthService.login(user.username, password, ipAddress, userAgent);

    return NextResponse.json({
      success: true,
      data: {
        user: authResponse.user,
        token: authResponse.token,
        expires_at: authResponse.expires_at
      },
      message: 'Registration successful'
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Registration failed' 
      },
      { status: 500 }
    );
  }
} 