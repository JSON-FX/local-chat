import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { GroupService } from '../../../../lib/groups';
import { SocketService } from '../../../../lib/socket';

interface RouteContext {
  params: Promise<{
    groupId: string;
  }>;
}

// Get group details
export async function GET(request: NextRequest, { params }: RouteContext) {
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

    // Get group details
    const group = await GroupService.getGroupById(groupId, user.id);
    
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found or access denied' },
        { status: 404 }
      );
    }

    // Get group members
    const members = await GroupService.getGroupMembers(groupId, user.id);
    
    // Get user's role in the group
    const userRole = await GroupService.getUserRole(groupId, user.id);

    return NextResponse.json({
      success: true,
      data: {
        group,
        members,
        member_count: members.length,
        user_role: userRole
      },
      message: 'Group details retrieved successfully'
    });

  } catch (error: any) {
    console.error('Get group details error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get group details' 
      },
      { status: 500 }
    );
  }
}

// Update group settings
export async function PUT(request: NextRequest, { params }: RouteContext) {
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

    const body = await request.json();
    const { name, description } = body;

    // Validate input
    const updates: { name?: string; description?: string } = {};
    
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Group name cannot be empty' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Group name must be 100 characters or less' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || '';
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    // Update group
    const updatedGroup = await GroupService.updateGroup(groupId, updates, user.id);

    return NextResponse.json({
      success: true,
      data: updatedGroup,
      message: 'Group updated successfully'
    });

  } catch (error: any) {
    console.error('Update group error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update group' 
      },
      { status: error.message?.includes('Only admins') ? 403 : 500 }
    );
  }
}

// Delete a group (owner only)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuth(request);
    const resolvedParams = await params;
    const groupId = parseInt(resolvedParams.groupId);
    if (isNaN(groupId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID' },
        { status: 400 }
      );
    }
    // Only owner can delete
    const group = await GroupService.getGroupById(groupId, user.id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found or access denied' },
        { status: 404 }
      );
    }
    if (group.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Only the group owner can delete this group' },
        { status: 403 }
      );
    }
    await GroupService.deleteGroup(groupId);
    
    // Broadcast group deletion to all members
    SocketService.broadcastGroupDeleted(groupId, {
      id: user.id,
      username: user.username
    });
    
    return NextResponse.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete group error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete group' },
      { status: 500 }
    );
  }
}

// This POST handler is no longer needed as we have a dedicated /leave/route.ts
// Keeping it for backwards compatibility, but it now supports ownership transfer
export async function POST(request: NextRequest, { params }: RouteContext) {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/leave')) {
    try {
      const user = await requireAuth(request);
      const resolvedParams = await params;
      const groupId = parseInt(resolvedParams.groupId);
      if (isNaN(groupId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid group ID' },
          { status: 400 }
        );
      }
      
      // Get group to check if user is a member
      const group = await GroupService.getGroupById(groupId, user.id);
      if (!group) {
        return NextResponse.json(
          { success: false, error: 'Group not found or access denied' },
          { status: 404 }
        );
      }
      
      // Leave the group (handles ownership transfer automatically)
      const leaveResult = await GroupService.leaveGroup(groupId, user.id);
      
      let message = 'Left group successfully';
      if (leaveResult.ownershipTransferred) {
        message += `. Ownership transferred to ${leaveResult.newOwnerUsername}`;
      }
      
      return NextResponse.json({
        success: true,
        message,
        data: leaveResult
      });
    } catch (error: any) {
      console.error('Leave group error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to leave group' },
        { status: 500 }
      );
    }
  }
} 