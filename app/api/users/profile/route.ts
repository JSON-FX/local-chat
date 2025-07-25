import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { getDatabase } from '../../../../lib/database';

export async function PUT(request: NextRequest) {
  try {
    // Validate authentication and get user
    const user = await requireAuth(request);
    const body = await request.json();

    const { name, last_name, middle_name, position, department, email, mobile_number } = body;

    // Validate required fields
    if (!name || !last_name || !email) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if email is already taken by another user
    const existingUser = await db.get(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, user.id]
    );

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email is already taken by another user' },
        { status: 400 }
      );
    }

    // Update user profile
    await db.run(
      `UPDATE users SET 
        name = ?, 
        last_name = ?, 
        middle_name = ?, 
        position = ?, 
        department = ?, 
        email = ?, 
        mobile_number = ?
      WHERE id = ?`,
      [name, last_name, middle_name || null, position || null, department || null, email, mobile_number || null, user.id]
    );

    // Get updated user data
    const updatedUser = await db.get(
      'SELECT id, username, role, created_at, name, last_name, middle_name, position, department, email, mobile_number, avatar_path FROM users WHERE id = ?',
      [user.id]
    );

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('Update profile error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update profile' 
      },
      { status: 500 }
    );
  }
} 