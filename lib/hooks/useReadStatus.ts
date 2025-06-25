import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../api';
import { socketClient } from '../socket-client';
import { User } from '../types';

interface UnreadCounts {
  [key: string]: number; // Format: "direct_123" or "group_456"
}

// Global state for unread counts - shared across all hook instances
let globalUnreadCounts: UnreadCounts = {};
let globalSubscribers: Set<(counts: UnreadCounts) => void> = new Set();
let isGloballyInitialized = false;

// Function to update global state and notify all subscribers
const updateGlobalUnreadCounts = (newCounts: UnreadCounts) => {
  globalUnreadCounts = { ...newCounts };
  globalSubscribers.forEach(callback => callback(globalUnreadCounts));
};

// Function to update a specific conversation's unread count
const updateConversationCount = (key: string, count: number) => {
  const oldCount = globalUnreadCounts[key] || 0;
  console.log(`🔄 updateConversationCount: ${key} ${oldCount} -> ${count}, subscribers: ${globalSubscribers.size}`);
  globalUnreadCounts = { ...globalUnreadCounts, [key]: count };
  globalSubscribers.forEach(callback => callback(globalUnreadCounts));
};

// Global functions that can be called from anywhere to update unread counts
export const incrementUnreadCount = (conversationId: number, isGroup: boolean) => {
  const key = isGroup ? `group_${conversationId}` : `direct_${conversationId}`;
  const currentCount = globalUnreadCounts[key] || 0;
  updateConversationCount(key, currentCount + 1);
};

export const clearUnreadCount = (conversationId: number, isGroup: boolean) => {
  const key = isGroup ? `group_${conversationId}` : `direct_${conversationId}`;
  updateConversationCount(key, 0);
};

export function useReadStatus(currentUser: User | null) {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>(globalUnreadCounts);
  const [loading, setLoading] = useState(!isGloballyInitialized);

  // Subscribe to global state changes
  useEffect(() => {
    const handleGlobalUpdate = (newCounts: UnreadCounts) => {
      setUnreadCounts(newCounts);
    };
    
    globalSubscribers.add(handleGlobalUpdate);
    
    return () => {
      globalSubscribers.delete(handleGlobalUpdate);
    };
  }, []);

  // Load initial unread counts (only once globally)
  useEffect(() => {
    const loadUnreadCounts = async () => {
      if (isGloballyInitialized) {
        setLoading(false);
        return;
      }
      
      try {
        console.log('🔄 Loading initial unread counts for user:', currentUser?.username);
        const response = await apiService.getUnreadCounts();
        if (response.success && response.data) {
          console.log('📊 Initial unread counts loaded:', response.data);
          updateGlobalUnreadCounts(response.data);
        } else {
          console.log('❌ Failed to load unread counts:', response.error);
        }
        isGloballyInitialized = true;
      } catch (error) {
        console.error('Failed to load unread counts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadUnreadCounts();
    }
  }, [currentUser]);

  // Handle messages read events from socket (only set up once globally)
  useEffect(() => {
    if (!currentUser) return;
    
    const handleMessagesRead = (data: {
      message_ids: number[];
      reader_id: number;
      reader_username: string;
      conversation_id: number;
      is_group: boolean;
    }) => {
      const key = data.is_group ? `group_${data.conversation_id}` : `direct_${data.conversation_id}`;
      console.log(`🔔 Socket messages_read event: ${key}, reader: ${data.reader_username} (${data.reader_id}), currentUser: ${currentUser?.id}`);
      
      // Only clear unread counts when WE read messages (not when others read our messages)  
      if (data.reader_id === currentUser?.id) {
        console.log(`🔔 Socket: Clearing ${key} unread count due to our read action`);
        updateConversationCount(key, 0);
      } else {
        console.log(`🔔 Socket: Ignoring read event from other user`);
      }
    };

    socketClient.on('onMessagesRead', handleMessagesRead);

    return () => {
      socketClient.off('onMessagesRead');
    };
  }, [currentUser]);

  const markMessagesAsRead = useCallback(async (
    messageIds: number[],
    conversationId: number,
    isGroup: boolean
  ) => {
    try {
      const key = isGroup ? `group_${conversationId}` : `direct_${conversationId}`;
      const currentCount = globalUnreadCounts[key] || 0;
      
      console.log(`📖 markMessagesAsRead: ${key}, messageIds: ${messageIds.length}, currentCount: ${currentCount}`);
      
      const response = await apiService.markMessagesAsRead({
        message_ids: messageIds,
        conversation_id: conversationId,
        is_group: isGroup
      });

      if (response.success) {
        // Emit socket event
        socketClient.markMessagesAsRead(messageIds, conversationId, isGroup);
        
        // Update global state immediately
        console.log(`📖 Clearing unread count for ${key}: ${currentCount} -> 0`);
        updateConversationCount(key, 0);
      } else {
        console.error('API call failed:', response.error);
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, []);

  const markAllUnreadAsRead = useCallback(async (
    conversationId: number,
    isGroup: boolean
  ) => {
    try {
      const key = isGroup ? `group_${conversationId}` : `direct_${conversationId}`;
      const currentCount = globalUnreadCounts[key] || 0;
      
      console.log(`📖 markAllUnreadAsRead: ${key}, currentCount: ${currentCount}`);
      
      const response = await apiService.markAllUnreadAsRead({
        conversation_id: conversationId,
        is_group: isGroup
      });

      if (response.success && response.data) {
        console.log(`📖 markAllUnreadAsRead success: marked ${response.data.marked_count} messages`);
        
        // Update global state immediately
        console.log(`📖 Clearing unread count for ${key}: ${currentCount} -> 0`);
        updateConversationCount(key, 0);
      } else {
        console.error('API call failed:', response.error);
      }
    } catch (error) {
      console.error('Failed to mark all unread messages as read:', error);
    }
  }, []);

  const getUnreadCount = useCallback((conversationId: number, isGroup: boolean): number => {
    const key = isGroup ? `group_${conversationId}` : `direct_${conversationId}`;
    return unreadCounts[key] || 0;
  }, [unreadCounts]);

  const getTotalUnreadCount = useCallback((): number => {
    return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
  }, [unreadCounts]);

  return {
    unreadCounts,
    loading,
    markMessagesAsRead,
    markAllUnreadAsRead,
    getUnreadCount,
    getTotalUnreadCount
  };
} 