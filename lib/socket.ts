import { Server as HttpServer } from 'http';
import { Socket, Server as SocketServer } from 'socket.io';
import { AuthService } from './auth';
import { MessageService } from './messages';
import { MessageQueueService } from './messageQueue';

// Connected users map: userId -> socketId
const connectedUsers = new Map<number, string>();
// Socket sessions map: socketId -> user data
const socketSessions = new Map<string, { userId: number; username: string }>();
// Typing users per conversation: conversationKey -> Set of userIds
const typingUsers = new Map<string, Set<number>>();

export interface SocketUser {
  userId: number;
  username: string;
  socketId: string;
}

export class SocketService {
  private static io: SocketServer | null = null;

  static initialize(server: HttpServer): SocketServer {
    if (this.io) {
      return this.io;
    }

    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
        methods: ['GET', 'POST']
      },
      path: '/socket.io/'
    });

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
          console.log(`🔐 Authentication attempt from socket: ${socket.id}`);
          console.log(`🔐 Token received: ${data.token.substring(0, 50)}...`);
          
          const decoded = AuthService.verifyToken(data.token);
          if (!decoded) {
            console.log(`❌ Invalid token from socket: ${socket.id}`);
            socket.emit('auth_error', { error: 'Invalid token' });
            socket.disconnect();
            return;
          }

          const user = await AuthService.validateSession(decoded.sessionId);
          if (!user) {
            console.log(`❌ Invalid session from socket: ${socket.id}`);
            socket.emit('auth_error', { error: 'Session invalid or expired' });
            socket.disconnect();
            return;
          }

          // Store user session
          socketSessions.set(socket.id, { 
            userId: user.id, 
            username: user.username 
          });
          
          // Remove user from any previous socket
          const previousSocketId = connectedUsers.get(user.id);
          if (previousSocketId && previousSocketId !== socket.id) {
            const previousSocket = this.io?.sockets.sockets.get(previousSocketId);
            if (previousSocket) {
              previousSocket.disconnect();
            }
          }
          
          // Add user to connected users
          connectedUsers.set(user.id, socket.id);

          // Join user to their personal room
          socket.join(`user_${user.id}`);

          // Emit successful authentication
          socket.emit('authenticated', { 
            userId: user.id, 
            username: user.username,
            message: 'Successfully authenticated' 
          });

          // Deliver any pending messages
          await MessageQueueService.deliverPendingMessages(user.id);

          // Notify others that user is online
          socket.broadcast.emit('user_online', { 
            userId: user.id, 
            username: user.username 
          });

          console.log(`✅ User authenticated: ${user.username} (${socket.id})`);

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
          const message = await MessageService.sendMessage({
            sender_id: userSession.userId,
            recipient_id: data.recipient_id,
            group_id: data.group_id,
            content: data.content.trim(),
            message_type: (data.message_type as 'text' | 'file' | 'image') || 'text'
          });

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
            // Group message - emit to all group members (implementation needed when groups are added)
            socket.to(`group_${data.group_id}`).emit('new_message', messageWithSender);
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
        console.log(`👥 User ${userSession.username} joined group ${data.group_id}`);
      });

      socket.on('leave_group', (data: { group_id: number }) => {
        const userSession = socketSessions.get(socket.id);
        if (!userSession) return;

        socket.leave(`group_${data.group_id}`);
        console.log(`👥 User ${userSession.username} left group ${data.group_id}`);
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
    if (socketId && this.io) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Broadcast to all connected users
  static broadcast(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  static getIO(): SocketServer | null {
    return this.io;
  }
} 