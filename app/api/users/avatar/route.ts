import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { getDatabase } from '../../../../lib/database';
import { SocketService } from '../../../../lib/socket';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication and get user
    const user = await requireAuth(request);
    
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No avatar file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size too large. Maximum 5MB allowed' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const avatarsDir = path.join(uploadsDir, 'avatars');
    
    try {
      await fs.access(avatarsDir);
    } catch {
      await fs.mkdir(avatarsDir, { recursive: true });
    }

    const db = await getDatabase();

    // Get current user to check for existing avatar
    const currentUser = await db.get(
      'SELECT avatar_path FROM users WHERE id = ?',
      [user.id]
    );

    // Delete old avatar if exists
    if (currentUser?.avatar_path) {
      try {
        const oldFilepath = path.join(process.cwd(), 'uploads', currentUser.avatar_path);
        await fs.unlink(oldFilepath);
      } catch (error) {
        console.warn('Failed to delete old avatar:', error);
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.name) || '.jpg';
    const filename = `user_${user.id}_${timestamp}${extension}`;
    const filepath = path.join(avatarsDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filepath, buffer);

    // Update user avatar path in database
    const avatarPath = `avatars/${filename}`;
    await db.run(
      'UPDATE users SET avatar_path = ? WHERE id = ?',
      [avatarPath, user.id]
    );

    // Get updated user data
    const updatedUser = await db.get(
      'SELECT id, username, role, created_at, name, middle_name, position, department, email, avatar_path FROM users WHERE id = ?',
      [user.id]
    );

    // Broadcast avatar update to all connected users
    console.log('📢 Broadcasting user avatar update:', user.username, avatarPath);
    SocketService.broadcast('user_avatar_updated', {
      user_id: user.id,
      username: user.username,
      avatar_path: avatarPath,
      avatar_url: `/api/files/download/${avatarPath}`
    });
    console.log('📢 User avatar broadcast sent');

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Avatar updated successfully'
    });

  } catch (error: any) {
    console.error('Update avatar error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update avatar' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Validate authentication and get user
    const user = await requireAuth(request);

    const db = await getDatabase();

    // Get current user to check for existing avatar
    const currentUser = await db.get(
      'SELECT avatar_path FROM users WHERE id = ?',
      [user.id]
    );

    // Delete avatar file if exists
    if (currentUser?.avatar_path) {
      try {
        const filepath = path.join(process.cwd(), 'uploads', currentUser.avatar_path);
        await fs.unlink(filepath);
      } catch (error) {
        console.warn('Failed to delete avatar file:', error);
        // Continue anyway as we still want to remove from database
      }
    }

    // Remove avatar path from database
    await db.run(
      'UPDATE users SET avatar_path = NULL WHERE id = ?',
      [user.id]
    );

    // Get updated user data
    const updatedUser = await db.get(
      'SELECT id, username, role, created_at, name, middle_name, position, department, email, avatar_path FROM users WHERE id = ?',
      [user.id]
    );

    // Broadcast avatar removal to all connected users
    console.log('📢 Broadcasting user avatar removal:', user.username);
    SocketService.broadcast('user_avatar_updated', {
      user_id: user.id,
      username: user.username,
      avatar_path: null,
      avatar_url: null
    });
    console.log('📢 User avatar removal broadcast sent');

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Avatar removed successfully'
    });

  } catch (error: any) {
    console.error('Remove avatar error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to remove avatar' 
      },
      { status: 500 }
    );
  }
} 