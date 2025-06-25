// Frontend types for the LocalChat application

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface Message {
  id: number;
  sender_id: number;
  recipient_id?: number;
  group_id?: number;
  content: string;
  message_type: 'text' | 'file' | 'image';
  file_path?: string;
  file_name?: string;
  file_size?: number;
  timestamp: string;
  sender_username?: string;
  queued?: boolean;
  queuedAt?: number;
}

export interface Conversation {
  other_user_id: number;
  other_username: string;
  last_message: string;
  last_message_time: string;
  conversation_type: 'direct' | 'group';
  group_id?: number;
  group_name?: string;
  avatar_path?: string;
  unread_count?: number; // Optional for now since backend doesn't provide it
}

export interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    user: User;
  };
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface OnlineUser {
  userId: number;
  username: string;
  socketId: string;
}

export interface ChatState {
  currentUser: User | null;
  conversations: Conversation[];
  messages: Message[];
  selectedConversation: number | null;
  onlineUsers: OnlineUser[];
  isConnected: boolean;
  isTyping: { [userId: number]: boolean };
}

export interface SocketEvents {
  // Outgoing events
  authenticate: { token: string };
  send_message: {
    recipient_id?: number;
    group_id?: number;
    content: string;
    message_type?: string;
    file_path?: string;
    file_name?: string;
    file_size?: number;
  };
  typing_start: { recipient_id?: number; group_id?: number };
  typing_stop: { recipient_id?: number; group_id?: number };
  join_group: { group_id: number };
  leave_group: { group_id: number };

  // Incoming events
  authenticated: { userId: number; username: string; message: string };
  message_sent: Message;
  new_message: Message;
  user_online: { userId: number; username: string };
  user_offline: { userId: number; username: string };
  user_typing: { userId: number; username: string; isTyping: boolean };
  auth_error: { error: string };
  error: { error: string };
} 