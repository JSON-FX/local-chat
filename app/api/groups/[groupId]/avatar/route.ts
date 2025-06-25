import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { GroupService } from '../../../../../lib/groups';
import { promises as fs } from 'fs';
import path from 'path';

interface RouteContext {
  params: Promise<{
    groupId: string;
  }>;
}

// Upload group avatar
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    // Validate authentication
    const user = await requireAuth(request);
    
    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.groupId);
    if (isNaN(groupId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID' },
        { status: 400 }
      );
    }

    // Check if user has permission to change avatar (must be admin)
    const userRole = await GroupService.getUserRole(groupId, user.id);
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only group admins can change the group avatar' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Avatar file is required' },
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

    // Validate file size (5MB max)
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

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.name) || '.jpg';
    const filename = `group_${groupId}_${timestamp}${extension}`;
    const filepath = path.join(avatarsDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filepath, buffer);

    // Update group avatar path in database
    const avatarPath = `avatars/${filename}`;
    const updatedGroup = await GroupService.updateGroupAvatar(groupId, avatarPath, user.id);

    return NextResponse.json({
      success: true,
      data: {
        group: updatedGroup,
        avatar_url: `/api/files/download/${filename}`
      },
      message: 'Group avatar updated successfully'
    });

  } catch (error: any) {
    console.error('Upload group avatar error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to upload group avatar' 
      },
      { status: 500 }
    );
  }
}

// Remove group avatar
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    // Validate authentication
    const user = await requireAuth(request);
    
    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.groupId);
    if (isNaN(groupId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID' },
        { status: 400 }
      );
    }

    // Check if user has permission to change avatar (must be admin)
    const userRole = await GroupService.getUserRole(groupId, user.id);
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only group admins can change the group avatar' },
        { status: 403 }
      );
    }

    // Get current group to check if it has an avatar
    const group = await GroupService.getGroupById(groupId, user.id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Delete avatar file if it exists
    if (group.avatar_path) {
      try {
        const filepath = path.join(process.cwd(), 'uploads', group.avatar_path);
        await fs.unlink(filepath);
      } catch (error) {
        console.warn('Failed to delete avatar file:', error);
        // Continue anyway as we still want to remove from database
      }
    }

    // Remove avatar path from database
    const updatedGroup = await GroupService.removeGroupAvatar(groupId, user.id);

    return NextResponse.json({
      success: true,
      data: { group: updatedGroup },
      message: 'Group avatar removed successfully'
    });

  } catch (error: any) {
    console.error('Remove group avatar error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to remove group avatar' 
      },
      { status: 500 }
    );
  }
} 