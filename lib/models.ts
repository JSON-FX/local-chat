// Core data models for LGU-Chat

export interface User {
  id: number;
  sso_employee_uuid: string;
  username: string;
  email?: string;
  role: 'admin' | 'moderator' | 'user' | 'system';
  sso_role?: string;
  full_name?: string;
  position?: string;
  office_name?: string;
  avatar_path?: string;
  status: 'active' | 'inactive' | 'banned';
  profile_synced_at?: string;
  created_at: string;
  last_login?: string;
  name?: string;
  middle_name?: string;
  last_name?: string;
  department?: string;
  mobile_number?: string;
  profile_data?: string; // JSON string for additional profile info
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

// Session model with SSO token hash
export interface Session {
  id: string;
  user_id: number;
  sso_token_hash?: string;
  created_at: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  last_activity?: string;
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
  session_id: string;
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

// Utility function to format user's full name
export function getFullName(user: User): string {
  if (!user) return 'Unknown User';

  const firstName = user.name?.trim() || '';
  const middleName = user.middle_name?.trim() || '';
  const lastName = user.last_name?.trim() || '';

  // If no name fields are available, fall back to username
  if (!firstName && !middleName && !lastName) {
    return user.username;
  }

  // Format: First Name Middle Initial. Last Name
  let fullName = firstName;

  if (middleName) {
    const middleInitial = middleName.charAt(0).toUpperCase() + '.';
    fullName += fullName ? ` ${middleInitial}` : middleInitial;
  }

  if (lastName) {
    fullName += fullName ? ` ${lastName}` : lastName;
  }

  return fullName || user.username;
}

// Get display name for UI (full name or username as fallback)
export function getDisplayName(user: User): string {
  return getFullName(user);
}
