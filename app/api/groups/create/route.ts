import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { GroupService } from '../../../../lib/groups';
import { SocketService } from '../../../../lib/socket';
import { getDatabase } from '../../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const user = await requireAuth(request);
    
    const body = await request.json();
    const { name, description, initial_members } = body;

    console.log('DEBUG: Group creation request body:', JSON.stringify(body));
    console.log('DEBUG: Initial members before processing:', JSON.stringify(initial_members));

    // Validate input
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Group name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Group name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Validate initial members if provided
    let initialMemberIds: number[] = [];
    if (initial_members && Array.isArray(initial_members)) {
      // Filter out invalid IDs and convert to numbers
      initialMemberIds = initial_members
        .filter(id => typeof id === 'number' || (typeof id === 'string' && !isNaN(parseInt(id))))
        .map(id => typeof id === 'number' ? id : parseInt(id))
        .filter(id => id > 0 && id !== user.id); // Exclude invalid IDs and creator

      console.log('DEBUG: Initial member IDs after processing:', JSON.stringify(initialMemberIds));

      // Validate that all member IDs exist in the database
      if (initialMemberIds.length > 0) {
        const db = await getDatabase();
        const placeholders = initialMemberIds.map(() => '?').join(',');
        const validMembers = await db.all(`SELECT id FROM users WHERE id IN (${placeholders})`, initialMemberIds);
        const validMemberIds = validMembers.map(m => m.id);
        
        console.log(`DEBUG: Valid member IDs from database:`, JSON.stringify(validMemberIds));
        
        // Keep only valid member IDs
        initialMemberIds = validMemberIds;
      }

      // Limit to reasonable number of initial members
      if (initialMemberIds.length > 50) {
        return NextResponse.json(
          { success: false, error: 'Cannot add more than 50 initial members' },
          { status: 400 }
        );
      }
    }

    // Create group
    const group = await GroupService.createGroup({
      name: name.trim(),
      description: description?.trim() || undefined,
      created_by: user.id
    }, initialMemberIds);

    // Get group members to return complete info
    const members = await GroupService.getGroupMembers(group.id, user.id);

    // Notify all group members via socket about the new group
    const allMemberIds = [user.id, ...initialMemberIds]; // Include creator
    for (const memberId of allMemberIds) {
      SocketService.sendToUser(memberId, 'group_created', {
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          avatar_path: group.avatar_path
        },
        created_by: {
          id: user.id,
          username: user.username
        }
      });
      
      // Also join the user to the group room if they're online
      const io = SocketService.getIO();
      if (io) {
        // Find the user's socket and join them to the group room
        for (const [socketId, socket] of io.sockets.sockets) {
          const socketSession = (global as any).socketSessions?.get(socketId);
          if (socketSession && socketSession.userId === memberId) {
            socket.join(`group_${group.id}`);
            console.log(`👥 User ${socketSession.username} joined group room ${group.id}`);
            break;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        group,
        members,
        member_count: members.length
      },
      message: 'Group created successfully'
    });

  } catch (error: any) {
    console.error('Create group error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create group' 
      },
      { status: 500 }
    );
  }
} 