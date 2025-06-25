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

    // Get group to check if user is the owner
    const group = await GroupService.getGroupById(groupId, user.id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found or you are not a member' },
        { status: 404 }
      );
    }

    // Cannot leave if you're the owner
    if (group.created_by === user.id) {
      return NextResponse.json(
        { success: false, error: 'Group owner cannot leave. Transfer ownership or delete the group instead.' },
        { status: 400 }
      );
    }

    // Leave the group
    await GroupService.leaveGroup(groupId, user.id);
    
    // Notify other group members
    SocketService.broadcast(`group_${groupId}`, 'member_left_group', {
      group_id: groupId,
      user_id: user.id,
      username: user.username
    });

    return NextResponse.json({
      success: true,
      message: 'Left group successfully'
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