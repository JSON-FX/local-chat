import { Server as HttpServer } from 'http';
import { Socket, Server as SocketServer } from 'socket.io';
import { AuthService } from './auth';
import { MessageService } from './messages';
import { MessageQueueService } from './messageQueue';
import { networkInterfaces } from 'os';

// Make these variables truly global to persist across module imports
declare global {
  var __connectedUsers: Map<number, string> | undefined;
  var __socketSessions: Map<string, { userId: number; username: string }> | undefined;
  var __typingUsers: Map<string, Set<number>> | undefined;
}

// Initialize global Maps if they don't exist
if (!globalThis.__connectedUsers) {
  globalThis.__connectedUsers = new Map<number, string>();
}
if (!globalThis.__socketSessions) {
  globalThis.__socketSessions = new Map<string, { userId: number; username: string }>();
}
if (!globalThis.__typingUsers) {
  globalThis.__typingUsers = new Map<string, Set<number>>();
}

// Always use the global references
const connectedUsers = globalThis.__connectedUsers;
const socketSessions = globalThis.__socketSessions;
const typingUsers = globalThis.__typingUsers;

export interface SocketUser {
  userId: number;
  username: string;
  socketId: string;
}

// Global singleton to persist across module reloads in development
declare global {
  var __socketio__: SocketServer | undefined;
}

export class SocketService {
  private static io: SocketServer | null = null;

  static initialize(server: HttpServer): SocketServer {
    // Check global singleton first (persists across module reloads)
    if (global.__socketio__) {
      this.io = global.__socketio__;
      return this.io;
    }
    
    if (this.io) {
      return this.io;
    }

    // Get allowed origins for CORS
    const getAllowedOrigins = () => {
      const origins: (string | RegExp)[] = [];
      
      if (process.env.NODE_ENV === 'production') {
        // Production origins
        const allowedOrigins = process.env.ALLOWED_ORIGINS;
        if (allowedOrigins) {
          origins.push(...allowedOrigins.split(',').map(origin => origin.trim()));
        }
        
        // Add domain-based origins
        const domainName = process.env.DOMAIN_NAME;
        if (domainName) {
          origins.push(`http://${domainName}`);
          origins.push(`https://${domainName}`);
        }
        
        // Fallback production origins
        origins.push('https://chat.lgu.local');
        origins.push('https://chat.lgu.local');
        
      } else {
        // Development origins
        origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
        // Add auto-detected network IPs
        const networks = networkInterfaces();
        Object.keys(networks).forEach(name => {
          networks[name]?.forEach(net => {
            if (!net.internal && net.family === 'IPv4') {
              origins.push(`http://${net.address}:3000`);
            }
          });
        });
        
        // Add custom IPs from environment variable
        const customIPs = process.env.CUSTOM_ALLOWED_IPS;
        if (customIPs) {
          const additionalOrigins = customIPs.split(',').map(ip => `http://${ip.trim()}:3000`);
          origins.push(...additionalOrigins);
        }
        
        // Allow any local network IP patterns for development
        origins.push(
          /^http:\/\/192\.168\.\d+\.\d+:3000$/,
          /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
          /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:3000$/
        );
      }
      
      console.log(`🌐 [CORS] Allowed origins:`, origins);
      return origins;
    };

    this.io = new SocketServer(server, {
      cors: {
        origin: getAllowedOrigins(),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
      },
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    // Store in global singleton
    global.__socketio__ = this.io;

    this.setupSocketHandlers();
    console.log('✅ Socket.io server initialized');
    
    return this.io;
  }

  private static setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          console.log(`🔐 [DEBUG] Authentication attempt from socket: ${socket.id}`);
          console.log(`🔐 [DEBUG] Client IP: ${socket.handshake.address}`);
          console.log(`🔐 [DEBUG] Token received: ${data.token ? data.token.substring(0, 50) + '...' : 'missing'}`);
          console.log(`🔐 [DEBUG] Token length: ${data.token ? data.token.length : 0}`);
          console.log(`🔐 [DEBUG] Full authentication data keys:`, Object.keys(data));
          
          if (!data.token) {
            console.error(`❌ [DEBUG] No token provided from socket: ${socket.id}`);
            socket.emit('auth_error', { error: 'No token provided' });
            socket.disconnect();
            return;
          }
          
          console.log(`🔍 [DEBUG] Attempting to verify JWT token...`);
          const decoded = AuthService.verifyToken(data.token);
          if (!decoded) {
            console.error(`❌ [DEBUG] Invalid token from socket: ${socket.id}`);
            console.error(`❌ [DEBUG] Token verification failed`);
            socket.emit('auth_error', { error: 'Invalid token' });
            socket.disconnect();
            return;
          }
          console.log(`🔐 [DEBUG] Token decoded successfully:`, { userId: decoded.userId, sessionId: decoded.sessionId });

          console.log(`🔍 [DEBUG] Validating session: ${decoded.sessionId}`);
          const user = await AuthService.validateSession(decoded.sessionId);
          if (!user) {
            console.log(`❌ [DEBUG] Invalid session from socket: ${socket.id}`);
            console.log(`❌ [DEBUG] Session ID: ${decoded.sessionId}`);
            socket.emit('auth_error', { error: 'Session invalid or expired' });
            socket.disconnect();
            return;
          }

          console.log(`✅ [DEBUG] Session validated for user: ${user.username} (ID: ${user.id})`);

          // Store user session
          socketSessions.set(socket.id, { 
            userId: user.id, 
            username: user.username 
          });
          
          console.log(`🔍 [DEBUG] Checking for existing connections for user ${user.id}...`);
          // Remove user from any previous socket
          const previousSocketId = connectedUsers.get(user.id);
          if (previousSocketId && previousSocketId !== socket.id) {
            console.log(`🔄 [DEBUG] Found previous connection ${previousSocketId}, disconnecting...`);
            const previousSocket = this.io?.sockets.sockets.get(previousSocketId);
            if (previousSocket) {
              previousSocket.disconnect();
              console.log(`🔄 [DEBUG] Previous socket disconnected`);
            }
          }
          
          // Add user to connected users
          connectedUsers.set(user.id, socket.id);
          console.log(`✅ [DEBUG] User ${user.username} mapped to socket ${socket.id}`);

          // Join user to their personal room
          socket.join(`user_${user.id}`);
          console.log(`🏠 [DEBUG] User joined personal room: user_${user.id}`);

          // Join user's group rooms
          try {
            console.log(`🔍 [DEBUG] Loading user groups for auto-join...`);
            const { getDatabase } = await import('./database');
            const db = await getDatabase();
            const userGroups = await db.all(
              'SELECT group_id FROM group_members WHERE user_id = ? AND is_active = 1',
              [user.id]
            );
            
            console.log(`🔍 [DEBUG] Found ${userGroups.length} groups for user ${user.username}`);
            for (const group of userGroups) {
              socket.join(`group_${group.group_id}`);
              console.log(`👥 [DEBUG] User ${user.username} auto-joined group room ${group.group_id}`);
            }
          } catch (error) {
            console.error('❌ [DEBUG] Failed to join user groups:', error);
          }

          // Emit successful authentication
          console.log(`✅ [DEBUG] Emitting authenticated event for ${user.username}`);
          socket.emit('authenticated', { 
            userId: user.id, 
            username: user.username,
            message: 'Successfully authenticated' 
          });

          // Deliver any pending messages
          console.log(`📨 [DEBUG] Delivering pending messages for user ${user.id}...`);
          await MessageQueueService.deliverPendingMessages(user.id);

          // Notify others that user is online
          socket.broadcast.emit('user_online', { 
            userId: user.id, 
            username: user.username 
          });

          console.log(`✅ [DEBUG] User authenticated successfully: ${user.username} (${socket.id})`);
          console.log(`📊 [DEBUG] Connected users now:`, Array.from(connectedUsers.entries()));

        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('auth_error', { error: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Handle sending messages
      socket.on('send_message', async (data: {
        recipient_id?: number;
        group_id?: number;
        content: string;
        message_type?: string;
      }) => {
        try {
          const userSession = socketSessions.get(socket.id);
          if (!userSession) {
            socket.emit('error', { error: 'Not authenticated' });
            return;
          }

          // Validate input
          if (!data.content || data.content.trim() === '') {
            socket.emit('error', { error: 'Message content is required' });
            return;
          }

          if ((!data.recipient_id && !data.group_id) || (data.recipient_id && data.group_id)) {
            socket.emit('error', { error: 'Message must have either recipient_id or group_id' });
            return;
          }

          // Save message to database
          const messageData: any = {
            sender_id: userSession.userId,
            recipient_id: data.recipient_id,
            group_id: data.group_id,
            content: data.content.trim(),
            message_type: (data.message_type as 'text' | 'file' | 'image') || 'text'
          };

          // Add file properties if they exist (for file uploads via socket)
          // Only add file properties if ALL required fields are present
          if ("file_path" in data && "file_name" in data && "file_size" in data) {
            if (data.file_path && data.file_name && data.file_size) {
              messageData.file_path = data.file_path;
              messageData.file_name = data.file_name;
              messageData.file_size = data.file_size;
            }
          }

          const message = await MessageService.sendMessage(messageData);

          // Add sender username for real-time display
          const messageWithSender = {
            ...message,
            sender_username: userSession.username
          };

          // Emit to sender (confirmation)
          socket.emit('message_sent', messageWithSender);

          // Emit to recipient(s)
          if (data.recipient_id) {
            // Direct message - use message queue for offline handling
            await MessageQueueService.notifyNewMessage(data.recipient_id, messageWithSender);
          } else if (data.group_id) {
            // Group message - emit to all group members as group_message
            socket.to(`group_${data.group_id}`).emit('group_message', messageWithSender);
          }

          console.log(`📨 Message sent from ${userSession.username} to ${data.recipient_id ? `user ${data.recipient_id}` : `group ${data.group_id}`}`);

        } catch (error) {
          console.error('Send message error:', error);
          socket.emit('error', { error: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data: { recipient_id?: number; group_id?: number }) => {
        const userSession = socketSessions.get(socket.id);
        if (!userSession) return;

        const conversationKey = data.recipient_id ? `direct_${data.recipient_id}` : `group_${data.group_id}`;
        
        if (!typingUsers.has(conversationKey)) {
          typingUsers.set(conversationKey, new Set());
        }
        typingUsers.get(conversationKey)!.add(userSession.userId);

        // Notify other participants
        if (data.recipient_id) {
          const recipientSocketId = connectedUsers.get(data.recipient_id);
          if (recipientSocketId) {
            this.io?.to(recipientSocketId).emit('user_typing', {
              userId: userSession.userId,
              username: userSession.username,
              isTyping: true
            });
          }
        } else if (data.group_id) {
          socket.to(`group_${data.group_id}`).emit('user_typing', {
            userId: userSession.userId,
            username: userSession.username,
            isTyping: true
          });
        }
      });

      socket.on('typing_stop', (data: { recipient_id?: number; group_id?: number }) => {
        const userSession = socketSessions.get(socket.id);
        if (!userSession) return;

        const conversationKey = data.recipient_id ? `direct_${data.recipient_id}` : `group_${data.group_id}`;
        
        if (typingUsers.has(conversationKey)) {
          typingUsers.get(conversationKey)!.delete(userSession.userId);
          if (typingUsers.get(conversationKey)!.size === 0) {
            typingUsers.delete(conversationKey);
          }
        }

        // Notify other participants
        if (data.recipient_id) {
          const recipientSocketId = connectedUsers.get(data.recipient_id);
          if (recipientSocketId) {
            this.io?.to(recipientSocketId).emit('user_typing', {
              userId: userSession.userId,
              username: userSession.username,
              isTyping: false
            });
          }
        } else if (data.group_id) {
          socket.to(`group_${data.group_id}`).emit('user_typing', {
            userId: userSession.userId,
            username: userSession.username,
            isTyping: false
          });
        }
      });

      // Handle join group room (for future group functionality)
      socket.on('join_group', (data: { group_id: number }) => {
        const userSession = socketSessions.get(socket.id);
        if (!userSession) return;

        socket.join(`group_${data.group_id}`);
        console.log(`👥 User ${userSession.username} joined group room ${data.group_id}`);
      });

      // Handle join any room
      socket.on('join_room', (data: { room: string }) => {
        const userSession = socketSessions.get(socket.id);
        if (!userSession) return;

        socket.join(data.room);
        console.log(`🏠 User ${userSession.username} joined room ${data.room}`);
      });

      socket.on('leave_group', (data: { group_id: number }) => {
        const userSession = socketSessions.get(socket.id);
        if (!userSession) return;

        socket.leave(`group_${data.group_id}`);
        console.log(`👥 User ${userSession.username} left group ${data.group_id}`);
      });

      // Handle marking messages as read
      socket.on('mark_messages_read', async (data: { message_ids: number[]; conversation_id: number; is_group: boolean }) => {
        const userSession = socketSessions.get(socket.id);
        if (!userSession) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }
        
        console.log(`📖 DEBUG: Socket mark_messages_read event from user ${userSession.userId}:`, data);
        
        try {
          const { MessageReadService } = await import('./messageReads');
          await MessageReadService.markMessagesAsRead(data.message_ids, userSession.userId);
          console.log(`📖 DEBUG: Socket - User ${userSession.userId} marked ${data.message_ids.length} messages as read`);
          
          // Broadcast to other clients
          const broadcastData = {
            message_ids: data.message_ids,
            reader_id: userSession.userId,
            reader_username: userSession.username,
            reader_avatar: null, // TODO: Get user avatar
            conversation_id: data.conversation_id,
            is_group: data.is_group
          };
          
          console.log(`📖 DEBUG: Socket - Broadcasting messages_read event:`, broadcastData);
          
          if (data.is_group) {
            this.io?.to(`group_${data.conversation_id}`).emit('messages_read', broadcastData);
          } else {
            // For direct messages, emit to both participants
            this.io?.emit('messages_read', broadcastData);
          }
          
          console.log(`📖 DEBUG: Socket - messages_read broadcast completed`);
          
        } catch (error) {
          console.error('📖 DEBUG: Socket - Error in mark_messages_read:', error);
          socket.emit('error', { error: 'Failed to mark messages as read' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const userSession = socketSessions.get(socket.id);
        if (userSession) {
          // Remove from connected users
          connectedUsers.delete(userSession.userId);
          socketSessions.delete(socket.id);

          // Clear typing indicators
          for (const [conversationKey, typingSet] of typingUsers.entries()) {
            if (typingSet.has(userSession.userId)) {
              typingSet.delete(userSession.userId);
              if (typingSet.size === 0) {
                typingUsers.delete(conversationKey);
              }
              
              // Notify others user stopped typing
              if (conversationKey.startsWith('direct_')) {
                const recipientId = parseInt(conversationKey.replace('direct_', ''));
                const recipientSocketId = connectedUsers.get(recipientId);
                if (recipientSocketId) {
                  this.io?.to(recipientSocketId).emit('user_typing', {
                    userId: userSession.userId,
                    username: userSession.username,
                    isTyping: false
                  });
                }
              }
            }
          }

          // Notify others that user is offline
          socket.broadcast.emit('user_offline', { 
            userId: userSession.userId, 
            username: userSession.username 
          });

          console.log(`❌ User disconnected: ${userSession.username} (${socket.id})`);
        } else {
          console.log(`❌ Socket disconnected: ${socket.id}`);
        }
      });
    });
  }

  // Get online users
  static getOnlineUsers(): SocketUser[] {
    const users: SocketUser[] = [];
    for (const [userId, socketId] of connectedUsers.entries()) {
      const session = socketSessions.get(socketId);
      if (session) {
        users.push({
          userId,
          username: session.username,
          socketId
        });
      }
    }
    return users;
  }

  // Check if user is online
  static isUserOnline(userId: number): boolean {
    return connectedUsers.has(userId);
  }

  // Send message to specific user (for system notifications)
  static sendToUser(userId: number, event: string, data: any): boolean {
    const socketId = connectedUsers.get(userId);
    
    // Ensure we have the Socket.io instance (force retrieval from global)
    const io = this.getIO();
    
    if (socketId && io) {
      // Check if socket still exists
      const socket = io.sockets.sockets.get(socketId);
      
      if (socket && socket.connected) {
        io.to(socketId).emit(event, data);
        console.log(`✅ Message sent to user ${userId} via socket ${socketId}`);
        return true;
      } else {
        console.log(`❌ Socket ${socketId} for user ${userId} is not connected or doesn't exist`);
        // Clean up stale connection
        connectedUsers.delete(userId);
        if (socketId) {
          socketSessions.delete(socketId);
        }
        return false;
      }
    }
    console.log(`❌ Failed to send to user ${userId} - socketId: ${socketId}, io: ${!!io}`);
    return false;
  }

  // Broadcast to all connected users
  static broadcast(event: string, data: any, room?: string): void {
    const io = this.getIO();
    if (io) {
      if (room) {
        io.to(room).emit(event, data);
      } else {
        io.emit(event, data);
      }
    }
  }

  // Broadcast to all members of a group
  static broadcastToGroup(groupId: number, event: string, data: any): void {
    const io = this.getIO();
    if (io) {
      io.to(`group_${groupId}`).emit(event, data);
      console.log(`📢 Broadcasting to group ${groupId}: ${event}`);
    }
  }

  // Broadcast system message to group members
  static broadcastSystemMessage(groupId: number, message: any): void {
    const io = this.getIO();
    if (io) {
      const roomName = `group_${groupId}`;
      console.log(`📢 Broadcasting system message to room "${roomName}"`);
      console.log(`📢 Message details:`, { id: message.id, content: message.content, type: message.message_type });
      
      // Get the room info to see who's in it
      const room = io.sockets.adapter.rooms.get(roomName);
      console.log(`📢 Room "${roomName}" has ${room ? room.size : 0} members:`, room ? Array.from(room) : []);
      
      io.to(roomName).emit('new_message', message);
      console.log(`📢 Broadcast sent to room "${roomName}"`);
    } else {
      console.error('❌ Socket.io instance not available for broadcast');
    }
  }

  // Notify all members when a group is deleted
  static broadcastGroupDeleted(groupId: number, deletedBy: { id: number; username: string }): void {
    const io = this.getIO();
    if (io) {
      // Broadcast to all connected users instead of just the group room
      // This ensures everyone receives the event even if they're not in the room
      // or if the room is no longer accessible
      io.emit('group_deleted', { 
        group_id: groupId,
        deleted_by: deletedBy
      });
      console.log(`📢 Broadcasting group deletion: ${groupId} deleted by ${deletedBy.username}`);
    }
  }

  static getIO(): SocketServer | null {
    // If local instance is null, try to get from global singleton
    if (!this.io && global.__socketio__) {
      this.io = global.__socketio__;
    }
    
    return this.io;
  }
} 
