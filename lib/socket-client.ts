// Socket.io client service for LGU-Chat

import { io, Socket } from 'socket.io-client';
import { Message, OnlineUser } from './types';
import { toast } from 'sonner';

export interface SocketClientEvents {
  onConnected: () => void;
  onDisconnected: () => void;
  onAuthenticated: (data: { userId: number; username: string; message: string }) => void;
  onNewMessage: (message: Message) => void;
  onMessageSent: (message: Message) => void;
  onUserOnline: (user: { userId: number; username: string }) => void;
  onUserOffline: (user: { userId: number; username: string }) => void;
  onUserTyping: (data: { userId: number; username: string; isTyping: boolean }) => void;
  onGroupCreated: (data: { group: any; created_by: { id: number; username: string } }) => void;
  onMemberAddedToGroup: (data: { group: any; added_by: { id: number; username: string } }) => void;
  onGroupMessage: (message: Message) => void;
  onGroupDeleted: (data: { group_id: number; deleted_by: { id: number; username: string } }) => void;
  onMemberLeftGroup: (data: { group_id: number; user_id: number; username: string }) => void;
  onOwnershipTransferred: (data: { group_id: number; former_owner: { id: number; username: string }; new_owner: { id: number; username: string } }) => void;
  onGroupAvatarUpdated: (data: { group_id: number; avatar_path: string | null; avatar_url: string | null; updated_by: { id: number; username: string } }) => void;
  onUserAvatarUpdated: (data: { user_id: number; username: string; avatar_path: string | null; avatar_url: string | null }) => void;
  onMessagesRead: (data: { message_ids: number[]; reader_id: number; reader_username: string; reader_avatar?: string | null; conversation_id: number; is_group: boolean }) => void;
  onError: (error: { error: string }) => void;
  onAuthError: (error: { error: string }) => void;
}

class SocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private joinedRooms = new Set<string>();

  // Event handlers
  private handlers: Partial<SocketClientEvents> = {};

  constructor() {
    // Don't auto-load token from localStorage to prevent stale tokens
    // Token will be set explicitly via setToken() or connect(token)
  }

  // Set event handlers
  on<K extends keyof SocketClientEvents>(event: K, handler: SocketClientEvents[K]) {
    this.handlers[event] = handler;
  }

  // Remove event handlers
  off<K extends keyof SocketClientEvents>(event: K) {
    delete this.handlers[event];
  }

  // Connect to Socket.io server
  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔍 [DEBUG] Socket connect() called with token:', token ? 'present' : 'missing');
      
      if (token) {
        this.token = token;
        console.log('🔍 [DEBUG] Token set on socket client');
      }

      if (!this.token) {
        console.error('❌ [DEBUG] No authentication token provided');
        reject(new Error('No authentication token provided'));
        return;
      }

      // If already connected with the same token, resolve immediately
      if (this.socket?.connected) {
        console.log('✅ [DEBUG] Socket already connected, reusing connection');
        resolve();
        return;
      }

      // If connecting, wait for it to complete
      if (this.isConnecting) {
        console.log('⏳ [DEBUG] Connection already in progress, waiting...');
        const checkConnection = () => {
          if (this.socket?.connected) {
            console.log('✅ [DEBUG] Connection completed while waiting');
            resolve();
          } else if (!this.isConnecting) {
            console.error('❌ [DEBUG] Connection failed while waiting');
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
        return;
      }

      // Disconnect existing socket if it exists but is not connected
      if (this.socket && !this.socket.connected) {
        console.log('🔄 [DEBUG] Cleaning up old socket connection');
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      this.isConnecting = true;
      console.log('🔍 [DEBUG] Starting new socket connection process');

      try {
        // Use environment variable for production, otherwise use current host
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
          (typeof window !== 'undefined' 
            ? `${window.location.protocol}//${window.location.host}`
            : 'http://localhost:3000');
          
        console.log(`🔌 [DEBUG] Attempting to connect to socket server at: ${socketUrl}`);
        console.log(`🔍 [DEBUG] Browser protocol: ${typeof window !== 'undefined' ? window.location.protocol : 'N/A'}`);
        console.log(`🔍 [DEBUG] Browser host: ${typeof window !== 'undefined' ? window.location.host : 'N/A'}`);
        
        this.socket = io(socketUrl, {
          transports: ['polling', 'websocket'], // Try polling first for compatibility
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5,
          forceNew: false,
          path: '/socket.io/',
          autoConnect: false, // We'll call connect() manually
          withCredentials: true,
          upgrade: true,
          rememberUpgrade: true
        });

        console.log('🔍 [DEBUG] Socket.io client instance created');

        // Log transport changes (safely)
        try {
          if (this.socket && (this.socket as any).io && (this.socket as any).io.engine) {
            (this.socket as any).io.engine.on('transport', (transport: { name: string }) => {
              console.log(`🔌 [DEBUG] Client transport changed to: ${transport.name}`);
            });
          }
        } catch (error) {
          console.log('🔍 [DEBUG] Transport logging not available (this is normal)');
        }

        // Setup all event handlers first
        this.setupEventHandlers();
        
        // Handle ping/pong events for connection monitoring
        this.socket.on('connect', () => {
          console.log('✅ [DEBUG] Socket connected successfully:', this.socket?.id);
          console.log('🔍 [DEBUG] Socket state:', this.socket?.connected ? 'connected' : 'disconnected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.handlers.onConnected?.();
          
          // Monitor connection health
          setInterval(() => {
            if (this.socket?.connected) {
              const start = Date.now();
              this.socket.emit('ping');
              this.socket.once('pong', () => {
                const latency = Date.now() - start;
                console.log(`🏓 [DEBUG] Connection health check - Latency: ${latency}ms`);
              });
            }
          }, 30000); // Check every 30 seconds
          
          // Authenticate immediately after connection
          if (this.token) {
            console.log('🔐 [DEBUG] Sending authentication event with token.');
            console.log('🔍 [DEBUG] Token length:', this.token.length);
            console.log('🔍 [DEBUG] Token preview:', this.token.substring(0, 50) + '...');
            this.socket?.emit('authenticate', { token: this.token });
            
            // Set authentication timeout
            const authTimeout = setTimeout(() => {
              console.error('❌ [DEBUG] Authentication timeout after 10 seconds');
              this.disconnect();
              reject(new Error('Authentication timeout'));
            }, 10000); // Increase timeout to 10 seconds

            // Clear timeout on successful auth
            this.socket?.once('authenticated', (data) => {
              clearTimeout(authTimeout);
              console.log('✅ [DEBUG] Socket authenticated successfully:', data.username);
              this.handlers.onAuthenticated?.(data);
              resolve();
            });

            // Clear timeout on auth error
            this.socket?.once('auth_error', (error) => {
              console.error('❌ [DEBUG] Authentication error received:', error);
              clearTimeout(authTimeout);
            });
          } else {
            console.error('❌ [DEBUG] No token available for authentication');
            reject(new Error('No authentication token'));
          }
        });

        this.socket.on('auth_error', (error) => {
          console.error('❌ [DEBUG] Socket auth error:', error);
          this.handlers.onAuthError?.(error);
          this.disconnect();
          reject(new Error(error.error));
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ [DEBUG] Socket connection error:', error);
          console.error('❌ [DEBUG] Error details:', {
            message: error.message,
            description: (error as any).description,
            type: (error as any).type,
            transport: (error as any).transport
          });
          this.isConnecting = false;
          this.handleReconnect();
          reject(error);
        });

        // Manually initiate connection since autoConnect is false
        console.log('🔌 [DEBUG] Manually connecting socket...');
        this.socket.connect();

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // Setup all socket event handlers
  private setupEventHandlers() {
    if (!this.socket) return;

    // Log all incoming events for debugging
    this.socket.onAny((eventName, ...args) => {
      console.log(`🔍 Socket received event: ${eventName}`, args);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.handlers.onDisconnected?.();
      
      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Server or client initiated disconnect, don't reconnect
        console.log('🚫 Not reconnecting due to:', reason);
        return;
      }
      
      // Add a small delay before reconnecting to prevent immediate loops
      setTimeout(() => {
        this.handleReconnect();
      }, 1000);
    });

    this.socket.on('new_message', (message: Message) => {
      console.log('📨 Socket client received new_message:', message);
      console.log('📨 Message type:', message.message_type, 'Sender ID:', message.sender_id, 'Group ID:', message.group_id);
      this.handlers.onNewMessage?.(message);
    });

    this.socket.on('message_sent', (message: Message) => {
      console.log('✅ Message sent confirmation:', message);
      this.handlers.onMessageSent?.(message);
    });

    this.socket.on('group_message', (message: Message) => {
      console.log('👥 Group message received:', message);
      this.handlers.onGroupMessage?.(message);
    });

    this.socket.on('user_online', (data) => {
      console.log('🟢 User online:', data.username);
      this.handlers.onUserOnline?.(data);
    });

    this.socket.on('user_offline', (data) => {
      console.log('🔴 User offline:', data.username);
      this.handlers.onUserOffline?.(data);
    });

    this.socket.on('user_typing', (data) => {
      this.handlers.onUserTyping?.(data);
    });

    this.socket.on('messages_read', (data: { message_ids: number[]; reader_id: number; reader_username: string; reader_avatar?: string | null; conversation_id: number; is_group: boolean }) => {
      console.log('📖 Messages read status received:', data);
      this.handlers.onMessagesRead?.(data);
    });

    this.socket.on('group_created', (data) => {
      console.log('👥 Group created:', data.group.name);
      this.handlers.onGroupCreated?.(data);
    });

    this.socket.on('member_added_to_group', (data) => {
      console.log('👥 Member added to group:', data.group.name);
      this.handlers.onMemberAddedToGroup?.(data);
    });

    this.socket.on('group_deleted', (data) => {
      console.log('👥 Group deleted:', data.group_id);
      this.handlers.onGroupDeleted?.(data);
    });

    this.socket.on('member_left_group', (data) => {
      console.log('👥 Member left group:', data.username);
      this.handlers.onMemberLeftGroup?.(data);
    });

    this.socket.on('ownership_transferred', (data) => {
      console.log('👑 Ownership transferred:', `${data.former_owner.username} → ${data.new_owner.username}`);
      this.handlers.onOwnershipTransferred?.(data);
    });

    this.socket.on('group_avatar_updated', (data) => {
      console.log('🖼️ Group avatar updated:', data.group_id, data.avatar_path ? 'updated' : 'removed');
      this.handlers.onGroupAvatarUpdated?.(data);
    });

    this.socket.on('user_avatar_updated', (data) => {
      console.log('👤 User avatar updated:', data.username, data.avatar_path ? 'updated' : 'removed');
      this.handlers.onUserAvatarUpdated?.(data);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.handlers.onError?.(error);
    });
  }

  // Handle reconnection logic
  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnect attempts reached');
      return;
    }

    // Don't reconnect if already connected or connecting
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.token && !this.socket?.connected && !this.isConnecting) {
        this.connect().catch(console.error);
      }
    }, delay);
  }

  // Send a message
  sendMessage(recipientId: number, content: string, messageType: 'text' | 'file' | 'image' = 'text', fileData?: { file_path?: string; file_name?: string; file_size?: number }) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('send_message', {
      recipient_id: recipientId,
      content,
      message_type: messageType,
      ...fileData
    });
  }

  // Send a group message
  sendGroupMessage(groupId: number, content: string, messageType: 'text' | 'file' | 'image' = 'text', fileData?: { file_path?: string; file_name?: string; file_size?: number }) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('send_message', {
      group_id: groupId,
      content,
      message_type: messageType,
      ...fileData
    });
  }

  // Start typing indicator
  startTyping(recipientId?: number, groupId?: number) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_start', { 
      recipient_id: recipientId,
      group_id: groupId 
    });
  }

  // Stop typing indicator
  stopTyping(recipientId?: number, groupId?: number) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_stop', { 
      recipient_id: recipientId,
      group_id: groupId 
    });
  }

  // Join a group (for future group functionality)
  joinGroup(groupId: number) {
    if (!this.socket?.connected) return;
    this.socket.emit('join_group', { group_id: groupId });
  }

  // Join a specific room
  joinRoom(roomName: string) {
    if (!this.socket?.connected) return;
    if (this.joinedRooms.has(roomName)) {
      console.log(`🏠 Already in room: ${roomName}, skipping join`);
      return;
    }
    console.log(`🏠 Joining room: ${roomName}`);
    this.socket.emit('join_room', { room: roomName });
    this.joinedRooms.add(roomName);
  }

  // Leave a group
  leaveGroup(groupId: number) {
    if (!this.socket?.connected) return;
    this.socket.emit('leave_group', { group_id: groupId });
  }

  // Mark messages as read
  markMessagesAsRead(messageIds: number[], conversationId: number, isGroup: boolean) {
    if (!this.socket?.connected) return;
    this.socket.emit('mark_messages_read', { 
      message_ids: messageIds,
      conversation_id: conversationId,
      is_group: isGroup
    });
  }

  // Disconnect from socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.joinedRooms.clear();
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Get socket ID
  getSocketId(): string | null {
    return this.socket?.id ?? null;
  }

  // Update token
  setToken(token: string | null) {
    this.token = token;
    
    // Keep localStorage in sync
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
    
    if (!token) {
      this.disconnect();
    }
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
export default socketClient; 