import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { FileService } from '../../../../lib/files';
import { MessageService } from '../../../../lib/messages';
import { MessageQueueService } from '../../../../lib/messageQueue';
import { SocketService } from '../../../../lib/socket';
import { GroupService } from '../../../../lib/groups';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const user = await requireAuth(request);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const recipientId = formData.get('recipient_id') as string;
    const groupId = formData.get('group_id') as string;
    const caption = formData.get('caption') as string || '';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate that either recipient_id or group_id is provided, but not both
    if ((!recipientId && !groupId) || (recipientId && groupId)) {
      return NextResponse.json(
        { success: false, error: 'Must specify either recipient_id or group_id, but not both' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = FileService.validateFile({
      size: file.size,
      type: file.type,
      name: file.name
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // If sending to a group, verify the user is a member
    if (groupId) {
      const groupIdNum = parseInt(groupId);
      const isMember = await GroupService.isUserMember(groupIdNum, user.id);
      if (!isMember) {
        return NextResponse.json(
          { success: false, error: 'You are not a member of this group' },
          { status: 403 }
        );
      }
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Save file
    const uploadResult = await FileService.saveFile(buffer, file.name, file.type);

    // Determine message type
    const messageType = FileService.isImageFile(file.type) ? 'image' : 'file';

    // Create message with file attachment
    const message = await MessageService.sendMessage({
      sender_id: user.id,
      recipient_id: recipientId ? parseInt(recipientId) : undefined,
      group_id: groupId ? parseInt(groupId) : undefined,
      content: caption || `Shared ${messageType}: ${file.name}`,
      message_type: messageType,
      file_path: `/uploads/${uploadResult.filename}`,
      file_name: file.name,
      file_size: file.size
    });

    // Add sender username for real-time display
    const messageWithSender = {
      ...message,
      sender_username: user.username
    };

    // Broadcast the message to recipient via Socket.io
    if (recipientId) {
      const recipientIdNum = parseInt(recipientId);
      
      // Send confirmation to sender
      SocketService.sendToUser(user.id, 'message_sent', messageWithSender);
      
      // Send to recipient using MessageQueue (handles online/offline)
      await MessageQueueService.notifyNewMessage(recipientIdNum, messageWithSender);
      
      console.log(`📎 File uploaded by ${user.username} for user ${recipientIdNum}`);
      
    } else if (groupId) {
      const groupIdNum = parseInt(groupId);
      
      // Send confirmation to sender
      SocketService.sendToUser(user.id, 'message_sent', messageWithSender);
      
      // Broadcast to all group members
      SocketService.broadcastToGroup(groupIdNum, 'group_message', messageWithSender);
      
      console.log(`📎 File uploaded by ${user.username} for group ${groupId}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        message,
        file: {
          filename: uploadResult.filename,
          originalName: uploadResult.originalName,
          size: uploadResult.size,
          type: uploadResult.mimeType,
          url: `/api/files/download/${uploadResult.filename}`
        }
      },
      message: 'File uploaded successfully'
    });

  } catch (error: any) {
    console.error('File upload error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to upload file' 
      },
      { status: 500 }
    );
  }
} 