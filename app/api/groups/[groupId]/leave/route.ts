import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { GroupService } from '../../../../../lib/groups';
import { SocketService } from '../../../../../lib/socket';

interface RouteContext {
  params: Promise<{ groupId: string }>;
}

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

    // Get group to check if user is a member
    const group = await GroupService.getGroupById(groupId, user.id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found or you are not a member' },
        { status: 404 }
      );
    }

    // Leave the group (handles ownership transfer automatically)
    const leaveResult = await GroupService.leaveGroup(groupId, user.id);
    
    // Notify other group members about the user leaving
    SocketService.broadcastToGroup(groupId, 'member_left_group', {
      group_id: groupId,
      user_id: user.id,
      username: user.username
    });
    
    // If ownership was transferred, notify group members
    if (leaveResult.ownershipTransferred && leaveResult.newOwnerId && leaveResult.newOwnerUsername) {
      SocketService.broadcastToGroup(groupId, 'ownership_transferred', {
        group_id: groupId,
        former_owner: {
          id: user.id,
          username: user.username
        },
        new_owner: {
          id: leaveResult.newOwnerId,
          username: leaveResult.newOwnerUsername
        }
      });
    }

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
      { 
        success: false, 
        error: error.message || 'Failed to leave group'
      },
      { status: 500 }
    );
  }
} 