// Core data models for LocalChat

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'moderator' | 'user';
  created_at: string;
  last_login?: string;
  status: 'active' | 'inactive' | 'banned';
  profile_data?: string; // JSON string for additional profile info
}

export interface CreateUserData {
  username: string;
  password: string;
  role?: 'admin' | 'moderator' | 'user';
  profile_data?: any;
}

export interface Message {
  id: number;
  sender_id: number;
  recipient_id?: number; // For direct messages
  group_id?: number; // For group messages
  content: string;
  message_type: 'text' | 'file' | 'image';
  file_path?: string;
  file_name?: string;
  file_size?: number;
  timestamp: string;
  edited_at?: string;
  is_deleted: boolean;
}

export interface CreateMessageData {
  sender_id: number;
  recipient_id?: number;
  group_id?: number;
  content: string;
  message_type?: 'text' | 'file' | 'image';
  file_path?: string;
  file_name?: string;
  file_size?: number;
}

export interface Session {
  id: string;
  user_id: number;
  created_at: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
}

export interface CreateSessionData {
  id: string;
  user_id: number;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
  is_active: boolean;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  created_by: number;
}

export interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  is_active: boolean;
}

// Response types for API
export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  token: string;
  expires_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Utility types
export type UserRole = User['role'];
export type MessageType = Message['message_type'];
export type UserStatus = User['status']; 