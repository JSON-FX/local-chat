import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../api';
import { socketClient } from '../socket-client';
import { User } from '../types';

interface UnreadCounts {
  [key: string]: number; // Format: "direct_123" or "group_456"
}

export function useReadStatus(currentUser: User | null) {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [loading, setLoading] = useState(true);

  // Load initial unread counts
  useEffect(() => {
    const loadUnreadCounts = async () => {
      try {
        const response = await apiService.getUnreadCounts();
        if (response.success && response.data) {
          setUnreadCounts(response.data);
        }
      } catch (error) {
        console.error('Failed to load unread counts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUnreadCounts();
  }, []);

  // Handle messages read events from socket
  useEffect(() => {
    const handleMessagesRead = (data: {
      message_ids: number[];
      reader_id: number;
      reader_username: string;
      conversation_id: number;
      is_group: boolean;
    }) => {
      // Only update unread counts when it's our own read status
      if (data.reader_id === currentUser?.id) {
        const key = data.is_group ? `group_${data.conversation_id}` : `direct_${data.conversation_id}`;
        setUnreadCounts(prev => ({
          ...prev,
          [key]: 0
        }));
      }
    };

    socketClient.on('onMessagesRead', handleMessagesRead);

    return () => {
      socketClient.off('onMessagesRead');
    };
  }, [currentUser]);

  // Handle new messages - increment unread count
  useEffect(() => {
    const handleNewMessage = (message: any) => {
      const key = message.group_id 
        ? `group_${message.group_id}` 
        : `direct_${message.sender_id}`;
      
      // Only increment if message is not from current user
      if (message.sender_id !== currentUser?.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [key]: (prev[key] || 0) + 1
        }));
      }
    };

    const handleGroupMessage = (message: any) => {
      const key = `group_${message.group_id}`;
      
      // Only increment if message is not from current user
      if (message.sender_id !== currentUser?.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [key]: (prev[key] || 0) + 1
        }));
      }
    };

    socketClient.on('onNewMessage', handleNewMessage);
    socketClient.on('onGroupMessage', handleGroupMessage);

    return () => {
      socketClient.off('onNewMessage');
      socketClient.off('onGroupMessage');
    };
  }, [currentUser]);

  const markMessagesAsRead = useCallback(async (
    messageIds: number[],
    conversationId: number,
    isGroup: boolean
  ) => {
    try {
      const response = await apiService.markMessagesAsRead({
        message_ids: messageIds,
        conversation_id: conversationId,
        is_group: isGroup
      });

      if (response.success) {
        // Emit socket event
        socketClient.markMessagesAsRead(messageIds, conversationId, isGroup);
        
        // Update local state
        const key = isGroup ? `group_${conversationId}` : `direct_${conversationId}`;
        setUnreadCounts(prev => ({
          ...prev,
          [key]: 0
        }));
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
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
    getUnreadCount,
    getTotalUnreadCount
  };
} 