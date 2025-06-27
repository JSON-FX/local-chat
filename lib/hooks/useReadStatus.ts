import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../api';
import { socketClient } from '../socket-client';
import { User } from '../types';
import { MessageReadService } from '@/lib/messageReads';

interface UnreadCounts {
  [key: string]: number; // Format: "direct_123" or "group_456"
}

// Global state for unread counts
let globalUnreadCounts: UnreadCounts = {};
let isGloballyInitialized = false;
const globalSubscribers = new Set<(counts: UnreadCounts) => void>();

const updateGlobalUnreadCounts = (newCounts: UnreadCounts) => {
  globalUnreadCounts = { ...globalUnreadCounts, ...newCounts };
  globalSubscribers.forEach(callback => callback(globalUnreadCounts));
};

const updateConversationCount = (key: string, count: number) => {
  globalUnreadCounts[key] = count;
  globalSubscribers.forEach(callback => callback(globalUnreadCounts));
};

export const incrementUnreadCount = (conversationId: number, isGroup: boolean) => {
  const key = isGroup ? `group_${conversationId}` : `direct_${conversationId}`;
  const oldCount = globalUnreadCounts[key] || 0;
  const newCount = oldCount + 1;
  updateConversationCount(key, newCount);
};

export const clearUnreadCount = (conversationId: number, isGroup: boolean) => {
  const key = isGroup ? `group_${conversationId}` : `direct_${conversationId}`;
  updateConversationCount(key, 0);
};

interface UseReadStatusProps {
  messages: any[];
  currentUser: any;
  selectedConversation: number;
  selectedConversationType: 'direct' | 'group';
  isConnected: boolean;
}

export function useReadStatus({
  messages,
  currentUser,
  selectedConversation,
  selectedConversationType,
  isConnected
}: UseReadStatusProps) {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>(globalUnreadCounts);
  const [loading, setLoading] = useState(!isGloballyInitialized);
  const lastMarkedRef = useRef<Set<number>>(new Set());
  const throttleRef = useRef<NodeJS.Timeout | null>(null);

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
        console.log('🔄 DEBUG: Loading initial unread counts for user:', currentUser?.username);
        const response = await apiService.getUnreadCounts();
        if (response.success && response.data) {
          console.log('📊 DEBUG: Initial unread counts loaded:', response.data);
          updateGlobalUnreadCounts(response.data);
        } else {
          console.log('❌ DEBUG: Failed to load unread counts:', response.error);
        }
        isGloballyInitialized = true;
      } catch (error) {
        console.error('❌ DEBUG: Failed to load unread counts:', error);
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
      console.log(`🔔 DEBUG: Socket messages_read event: ${key}, reader: ${data.reader_username} (${data.reader_id}), currentUser: ${currentUser?.id}`);
      
      // Only clear unread counts when WE read messages (not when others read our messages)  
      if (data.reader_id === currentUser?.id) {
        console.log(`🔔 DEBUG: Socket: Clearing ${key} unread count due to our read action`);
        updateConversationCount(key, 0);
      } else {
        console.log(`🔔 DEBUG: Socket: Ignoring read event from other user`);
      }
    };

    socketClient.on('onMessagesRead', handleMessagesRead);

    return () => {
      socketClient.off('onMessagesRead');
    };
  }, [currentUser]);

  // Auto-mark messages as read when user is actively viewing conversation
  useEffect(() => {
    if (!currentUser || !selectedConversation || !isConnected) {
      console.log('🚫 DEBUG: Auto-mark - Skipping due to missing requirements:', {
        hasUser: !!currentUser,
        hasConversation: !!selectedConversation,
        isConnected
      });
      return;
    }

    // Find unread messages from other users that haven't been marked yet
    const unreadMessages = messages.filter(msg => {
      const isFromCurrentUser = msg.sender_id === currentUser.id;
      const alreadyMarked = lastMarkedRef.current.has(msg.id);
      
      if (selectedConversationType === 'direct') {
        const shouldMark = !isFromCurrentUser && !msg.is_read && !alreadyMarked;
        console.log(`📖 DEBUG: Message ${msg.id} - Direct check:`, {
          isFromCurrentUser,
          isRead: msg.is_read,
          alreadyMarked,
          shouldMark
        });
        return shouldMark;
      } else {
        // For group messages, check if current user is in read_by list
        const isReadByCurrentUser = msg.read_by?.some((reader: any) => reader.user_id === currentUser.id);
        const shouldMark = !isFromCurrentUser && !isReadByCurrentUser && !alreadyMarked;
        console.log(`📖 DEBUG: Message ${msg.id} - Group check:`, {
          isFromCurrentUser,
          isReadByCurrentUser,
          hasReadBy: !!msg.read_by,
          readByCount: msg.read_by?.length || 0,
          alreadyMarked,
          shouldMark
        });
        return shouldMark;
      }
    });

    if (unreadMessages.length === 0) {
      console.log('📖 DEBUG: Auto-mark - No unread messages to mark');
      return;
    }

    console.log(`📖 DEBUG: Auto-mark - Found ${unreadMessages.length} unread messages to mark:`, 
      unreadMessages.map(m => `ID:${m.id}`));

    // Clear any existing throttle
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }

    // Throttle the marking to prevent excessive API calls
    throttleRef.current = setTimeout(async () => {
      const messageIds = unreadMessages.map(msg => msg.id);
      
      console.log(`📖 DEBUG: Auto-mark - Attempting to mark messages as read:`, messageIds);
      
      try {
        // Use the manual markMessagesAsRead function
        await manualMarkMessagesAsRead(messageIds, selectedConversation, selectedConversationType === 'group');
        
        // Add to marked set to prevent re-marking
        messageIds.forEach(id => lastMarkedRef.current.add(id));
        
        console.log(`✅ DEBUG: Auto-mark - Successfully marked ${messageIds.length} messages as read`);
        console.log(`📊 DEBUG: Auto-mark - Total marked messages count: ${lastMarkedRef.current.size}`);
        
      } catch (error) {
        console.error('❌ DEBUG: Auto-mark - Error marking messages as read:', error);
      }
    }, 2000); // 2 second throttle

    // Cleanup on unmount
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [messages, currentUser, selectedConversation, selectedConversationType, isConnected]);

  // Reset marked messages when conversation changes
  useEffect(() => {
    console.log(`🔄 DEBUG: Auto-mark - Conversation changed to ${selectedConversation} (${selectedConversationType}), resetting marked messages`);
    lastMarkedRef.current.clear();
  }, [selectedConversation, selectedConversationType]);

  // Manual mark messages as read function
  const manualMarkMessagesAsRead = useCallback(async (
    messageIds: number[],
    conversationId: number,
    isGroup: boolean
  ) => {
    try {
      const key = isGroup ? `group_${conversationId}` : `direct_${conversationId}`;
      const currentCount = globalUnreadCounts[key] || 0;
      
      console.log(`📖 DEBUG: Manual mark - ${key}, messageIds: ${messageIds.length}, currentCount: ${currentCount}`);
      console.log(`🔍 DEBUG: Manual mark - messageIds: [${messageIds.join(', ')}]`);
      console.log(`🔍 DEBUG: Manual mark - Conversation: ${conversationId}, isGroup: ${isGroup}`);
      
      const response = await apiService.markMessagesAsRead({
        message_ids: messageIds,
        conversation_id: conversationId,
        is_group: isGroup
      });

      if (response.success) {
        console.log(`🔍 DEBUG: Manual mark - API call successful`);
        
        // Update global state immediately
        console.log(`📖 DEBUG: Manual mark - Clearing unread count for ${key}: ${currentCount} -> 0`);
        updateConversationCount(key, 0);
      } else {
        console.error('Failed to mark messages as read:', response.error);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
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

      if (response.success) {
        const markedCount = response.data?.marked_count || 0;
        console.log(`📖 markAllUnreadAsRead success: marked ${markedCount} messages`);
        
        // Update global state immediately
        console.log(`📖 Clearing unread count for ${key}: ${currentCount} -> 0`);
        updateConversationCount(key, 0);
      } else {
        console.error('API call failed:', response.error || 'Unknown error');
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
    markMessagesAsRead: manualMarkMessagesAsRead,
    markAllUnreadAsRead,
    getUnreadCount,
    getTotalUnreadCount
  };
} 