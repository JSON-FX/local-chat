// Core data models for LGU-Chat

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
  message_type: 'text' | 'file' | 'image' | 'system';
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
  message_type?: 'text' | 'file' | 'image' | 'system';
  file_path?: string;
  file_name?: string;
  file_size?: number;
}

// Audit Log for comprehensive activity tracking
export interface AuditLog {
  id: number;
  user_id?: number;
  username?: string;
  action: string;
  entity_type: 'user' | 'message' | 'group' | 'file' | 'session' | 'system';
  entity_id?: number;
  details?: string; // JSON string for additional details
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface CreateAuditLogData {
  user_id?: number;
  username?: string;
  action: string;
  entity_type: 'user' | 'message' | 'group' | 'file' | 'session' | 'system';
  entity_id?: number;
  details?: any; // Will be JSON stringified
  ip_address?: string;
  user_agent?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

// System Metrics for performance monitoring
export interface SystemMetrics {
  id: number;
  metric_name: string;
  metric_value: number;
  metric_type: 'counter' | 'gauge' | 'histogram';
  labels?: string; // JSON string for metric labels
  timestamp: string;
}

export interface CreateSystemMetricsData {
  metric_name: string;
  metric_value: number;
  metric_type: 'counter' | 'gauge' | 'histogram';
  labels?: any; // Will be JSON stringified
}

// Enhanced Session model
export interface Session {
  id: string;
  user_id: number;
  created_at: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  last_activity?: string;
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
  avatar_path?: string;
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
  user: User;
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