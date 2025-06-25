import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { GroupService } from '../../../../../lib/groups';
import { SocketService } from '../../../../../lib/socket';

interface RouteContext {
  params: Promise<{
    groupId: string;
  }>;
}

// Get group members
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

    // Get group members
    const members = await GroupService.getGroupMembers(groupId, user.id);

    return NextResponse.json({
      success: true,
      data: members,
      message: 'Group members retrieved successfully'
    });

  } catch (error: any) {
    console.error('Get group members error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get group members' 
      },
      { status: error.message?.includes('Access denied') ? 403 : 500 }
    );
  }
}

// Add member to group
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

    const body = await request.json();
    const { user_id, role } = body;

    // Validate input
    if (!user_id || isNaN(parseInt(user_id))) {
      return NextResponse.json(
        { success: false, error: 'Valid user ID is required' },
        { status: 400 }
      );
    }

    const memberRole = role || 'member';
    if (!['member', 'moderator'].includes(memberRole)) {
      return NextResponse.json(
        { success: false, error: 'Role must be either "member" or "moderator"' },
        { status: 400 }
      );
    }

    // Add member to group
    await GroupService.addMember(groupId, parseInt(user_id), user.id, memberRole);

    // Get group details for notification
    const group = await GroupService.getGroupById(groupId, user.id);
    
    // Notify the new member via socket
    if (group) {
      SocketService.sendToUser(parseInt(user_id), 'member_added_to_group', {
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          avatar_path: group.avatar_path
        },
        added_by: {
          id: user.id,
          username: user.username
        }
      });

      // Auto-join the user to the group room if they're online
      const io = SocketService.getIO();
      if (io) {
        for (const [socketId, socket] of io.sockets.sockets) {
          const socketSession = (global as any).socketSessions?.[socketId];
          if (socketSession?.userId === parseInt(user_id)) {
            socket.join(`group_${groupId}`);
            console.log(`👥 User ${socketSession.username} auto-joined group room ${groupId}`);
            break;
          }
        }
      }
    }

    // Get updated member list
    const members = await GroupService.getGroupMembers(groupId, user.id);

    return NextResponse.json({
      success: true,
      data: members,
      message: 'Member added successfully'
    });

  } catch (error: any) {
    console.error('Add group member error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to add member' 
      },
      { status: error.message?.includes('Only admins') ? 403 : 500 }
    );
  }
}

// Remove member from group
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

    const body = await request.json();
    const { user_id } = body;

    // Validate input
    if (!user_id || isNaN(parseInt(user_id))) {
      return NextResponse.json(
        { success: false, error: 'Valid user ID is required' },
        { status: 400 }
      );
    }

    // Remove member from group
    await GroupService.removeMember(groupId, parseInt(user_id), user.id);

    // Get updated member list
    const members = await GroupService.getGroupMembers(groupId, user.id);

    return NextResponse.json({
      success: true,
      data: members,
      message: 'Member removed successfully'
    });

  } catch (error: any) {
    console.error('Remove group member error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to remove member' 
      },
      { status: error.message?.includes('Only admins') ? 403 : 500 }
    );
  }
} 