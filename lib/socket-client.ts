// Socket.io client service for LocalChat

import { io, Socket } from 'socket.io-client';
import { Message, OnlineUser } from './types';

export interface SocketClientEvents {
  onConnected: () => void;
  onDisconnected: () => void;
  onAuthenticated: (data: { userId: number; username: string; message: string }) => void;
  onNewMessage: (message: Message) => void;
  onMessageSent: (message: Message) => void;
  onUserOnline: (user: { userId: number; username: string }) => void;
  onUserOffline: (user: { userId: number; username: string }) => void;
  onUserTyping: (data: { userId: number; username: string; isTyping: boolean }) => void;
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
      if (token) {
        this.token = token;
      }

      if (!this.token) {
        reject(new Error('No authentication token provided'));
        return;
      }

      // If already connected with the same token, resolve immediately
      if (this.socket?.connected) {
        console.log('✅ Socket already connected, reusing connection');
        resolve();
        return;
      }

      // If connecting, wait for it to complete
      if (this.isConnecting) {
        console.log('⏳ Connection already in progress, waiting...');
        const checkConnection = () => {
          if (this.socket?.connected) {
            resolve();
          } else if (!this.isConnecting) {
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
        console.log('🔄 Cleaning up old socket connection');
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      this.isConnecting = true;

      try {
        this.socket = io('http://localhost:3000', {
          transports: ['websocket', 'polling'],
          timeout: 20000,
        });

        this.setupEventHandlers();

        // Wait for connection
        this.socket.on('connect', () => {
          console.log('✅ Socket connected:', this.socket?.id);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.handlers.onConnected?.();
          
          // Authenticate immediately after connection
          if (this.token) {
            console.log('🔐 Sending authentication with token:', this.token.substring(0, 50) + '...');
            this.socket?.emit('authenticate', { token: this.token });
            
            // Set authentication timeout
            const authTimeout = setTimeout(() => {
              console.error('❌ Authentication timeout');
              this.disconnect();
              reject(new Error('Authentication timeout'));
            }, 5000);

            // Clear timeout on successful auth
            this.socket?.once('authenticated', (data) => {
              clearTimeout(authTimeout);
              console.log('✅ Socket authenticated:', data.username);
              this.handlers.onAuthenticated?.(data);
              resolve();
            });

            // Clear timeout on auth error
            this.socket?.once('auth_error', (error) => {
              clearTimeout(authTimeout);
            });
          } else {
            console.error('❌ No token available for authentication');
            reject(new Error('No authentication token'));
          }
        });

        this.socket.on('auth_error', (error) => {
          console.error('❌ Socket auth error:', error);
          this.handlers.onAuthError?.(error);
          this.disconnect();
          reject(new Error(error.error));
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error);
          this.isConnecting = false;
          this.handleReconnect();
          reject(error);
        });

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // Setup all socket event handlers
  private setupEventHandlers() {
    if (!this.socket) return;

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
      console.log('📨 New message received:', message);
      this.handlers.onNewMessage?.(message);
    });

    this.socket.on('message_sent', (message: Message) => {
      console.log('✅ Message sent confirmation:', message);
      this.handlers.onMessageSent?.(message);
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

  // Start typing indicator
  startTyping(recipientId: number) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_start', { recipient_id: recipientId });
  }

  // Stop typing indicator
  stopTyping(recipientId: number) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_stop', { recipient_id: recipientId });
  }

  // Join a group (for future group functionality)
  joinGroup(groupId: number) {
    if (!this.socket?.connected) return;
    this.socket.emit('join_group', { group_id: groupId });
  }

  // Leave a group
  leaveGroup(groupId: number) {
    if (!this.socket?.connected) return;
    this.socket.emit('leave_group', { group_id: groupId });
  }

  // Disconnect from socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
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