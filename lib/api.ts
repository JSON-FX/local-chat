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

  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return this.fetchApi<Conversation[]>('/api/messages/conversations');
  }

  async getDirectMessages(userId: number): Promise<ApiResponse<Message[]>> {
    return this.fetchApi<Message[]>(`/api/messages/direct/${userId}`);
  }

  async getOnlineUsers(): Promise<ApiResponse<OnlineUser[]>> {
    return this.fetchApi<OnlineUser[]>('/api/users/online');
  }

  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.fetchApi<User[]>('/api/users');
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  clearAuth(): void {
    this.setToken(null);
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService; 