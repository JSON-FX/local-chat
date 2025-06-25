// Client-side API service for LocalChat

import { AuthResponse, ApiResponse, User, Message, Conversation, OnlineUser } from './types';

const API_BASE = '';

class ApiService {
  private token: string | null = null;

  constructor() {
    // Try to get token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  // Authentication endpoints
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await this.fetchApi<AuthResponse['data']>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response as AuthResponse;
  }

  async register(username: string, password: string, confirmPassword: string): Promise<AuthResponse> {
    const response = await this.fetchApi<AuthResponse['data']>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, confirmPassword }),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response as AuthResponse;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.fetchApi('/api/auth/logout', {
      method: 'POST',
    });

    if (response.success) {
      this.setToken(null);
    }

    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.fetchApi<User>('/api/auth/me');
  }

  // Message endpoints
  async sendMessage(
    recipientId: number,
    content: string,
    messageType: 'text' | 'file' | 'image' = 'text'
  ): Promise<ApiResponse<Message>> {
    return this.fetchApi<Message>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: recipientId,
        content,
        message_type: messageType,
      }),
    });
  }

  async sendGroupMessage(
    groupId: number,
    content: string,
    messageType: 'text' | 'file' | 'image' = 'text'
  ): Promise<ApiResponse<Message>> {
    return this.fetchApi<Message>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        group_id: groupId,
        content,
        message_type: messageType,
      }),
    });
  }

  // File upload endpoint
  async uploadFile(
    file: File,
    recipientId?: number,
    groupId?: number,
    caption?: string
  ): Promise<ApiResponse<{ message: Message; file: any }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (recipientId) {
      formData.append('recipient_id', recipientId.toString());
    }
    
    if (groupId) {
      formData.append('group_id', groupId.toString());
    }
    
    if (caption) {
      formData.append('caption', caption);
    }

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: formData,
    });

    return await response.json();
  }

  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return this.fetchApi<Conversation[]>('/api/messages/conversations');
  }

  async getDirectMessages(userId: number): Promise<ApiResponse<Message[]>> {
    return this.fetchApi<Message[]>(`/api/messages/direct/${userId}`);
  }

  async getGroupMessages(groupId: number): Promise<ApiResponse<Message[]>> {
    return this.fetchApi<Message[]>(`/api/messages/group/${groupId}`);
  }

  async getOnlineUsers(): Promise<ApiResponse<OnlineUser[]>> {
    return this.fetchApi<OnlineUser[]>('/api/users/online');
  }

  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.fetchApi<User[]>('/api/users');
  }

  // Group endpoints
  async createGroup(data: {
    name: string;
    description?: string;
    initial_members?: number[];
  }): Promise<ApiResponse<any>> {
    return this.fetchApi('/api/groups/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGroups(): Promise<ApiResponse<any[]>> {
    return this.fetchApi<any[]>('/api/groups');
  }

  async getGroupById(groupId: number): Promise<ApiResponse<any>> {
    return this.fetchApi<any>(`/api/groups/${groupId}`);
  }

  async updateGroup(groupId: number, data: {
    name?: string;
    description?: string;
  }): Promise<ApiResponse<any>> {
    return this.fetchApi(`/api/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getGroupMembers(groupId: number): Promise<ApiResponse<any[]>> {
    return this.fetchApi<any[]>(`/api/groups/${groupId}/members`);
  }

  async addGroupMember(groupId: number, userId: number, role: 'member' | 'moderator' = 'member'): Promise<ApiResponse<any[]>> {
    return this.fetchApi<any[]>(`/api/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
  }

  async removeGroupMember(groupId: number, userId: number): Promise<ApiResponse<any[]>> {
    return this.fetchApi<any[]>(`/api/groups/${groupId}/members`, {
      method: 'DELETE',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // Helper method to add multiple members
  async addGroupMembers(groupId: number, userIds: number[]): Promise<ApiResponse<any>> {
    try {
      const results = [];
      for (const userId of userIds) {
        const result = await this.addGroupMember(groupId, userId);
        if (!result.success) {
          throw new Error(result.error || `Failed to add user ${userId}`);
        }
        results.push(result);
      }
      
      // Return the last result which contains the updated member list
      return results[results.length - 1] || { success: true, data: [] };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add members'
      };
    }
  }

  // Group avatar endpoints
  async uploadGroupAvatar(groupId: number, file: File): Promise<ApiResponse<{ group: any; avatar_url: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`/api/groups/${groupId}/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: formData,
    });

    return await response.json();
  }

  async removeGroupAvatar(groupId: number): Promise<ApiResponse<{ group: any }>> {
    return this.fetchApi<{ group: any }>(`/api/groups/${groupId}/avatar`, {
      method: 'DELETE',
    });
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  clearAuth(): void {
    this.setToken(null);
  }

  // Delete a direct conversation
  async deleteConversation(otherUserId: number): Promise<void> {
    const response = await fetch(`/api/messages/conversations/${otherUserId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete conversation');
    }
  }

  // Delete a group (owner only)
  async deleteGroup(groupId: number): Promise<void> {
    const response = await fetch(`/api/groups/${groupId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete group');
    }
  }

  // Leave a group (non-owners)
  async leaveGroup(groupId: number): Promise<void> {
    const response = await fetch(`/api/groups/${groupId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to leave group');
    }
  }

  // Clear group conversation (for owner) - removes messages from conversation list without deleting the group
  async clearGroupConversation(groupId: number): Promise<void> {
    const response = await fetch(`/api/messages/group/${groupId}/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to clear group conversation');
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService; 