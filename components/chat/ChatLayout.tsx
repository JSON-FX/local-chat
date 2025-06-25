'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  MessageSquare, 
  LogOut, 
  Circle,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  BellOff
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import { socketClient } from '@/lib/socket-client';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { NewChatDialog } from './NewChatDialog';
import { User, Conversation, Message } from '@/lib/types';
import { incrementUnreadCount, clearUnreadCount } from '@/lib/hooks/useReadStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function ChatLayout() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedConversationType, setSelectedConversationType] = useState<'direct' | 'group'>('direct');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ [userId: number]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Debounced conversation loading to prevent excessive API calls
  const debouncedLoadConversations = useCallback(debounce(async () => {
    try {
      const response = await apiService.getConversations();
      if (response.success && response.data) {
        setConversations(response.data);
      } else {
        console.error('Failed to load conversations:', response.error);
      }
    } catch (error) {
      console.error('Load conversations error:', error);
    }
  }, 1000), []); // 1000ms debounce to prevent excessive calls

  // Initialize user and socket connection
  useEffect(() => {
    initializeApp();
    // Don't auto-request notifications - wait for user interaction
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    setupServiceWorker();
    const cleanup = setupPageVisibility();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Setup service worker for better system notifications
  const setupServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        setServiceWorkerRegistration(registration);
        console.log('✅ Service Worker registered:', registration);
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('✅ Service Worker ready');
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  };

  // Setup notifications
  const setupNotifications = async () => {
    if ('Notification' in window) {
      try {
        // Check current permission first
        let permission = Notification.permission;
        
        // For Chrome compatibility - only request if not already decided
        if (permission === 'default') {
          // Show a user-friendly prompt first (Chrome requires user gesture)
          const userWantsNotifications = window.confirm(
            'LocalChat would like to send you notifications when you receive new messages. Allow notifications?'
          );
          
          if (userWantsNotifications) {
            permission = await Notification.requestPermission();
          } else {
            permission = 'denied';
          }
        }
        
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
          console.log('✅ Notification permission granted');
          toast.success('🔔 Notifications enabled! You\'ll be notified of new messages.');
          
          // Test notification on first enable
          try {
            const testNotification = new Notification('LocalChat Notifications Enabled', {
              body: 'You will now receive notifications for new messages.',
              icon: '/favicon.ico',
              tag: 'test-notification',
              requireInteraction: false
            });
            
            setTimeout(() => {
              testNotification.close();
            }, 3000);
          } catch (error) {
            console.warn('Test notification failed:', error);
          }
          
        } else if (permission === 'denied') {
          console.log('❌ Notification permission denied');
          toast.error('Notifications blocked. To enable: Click the bell icon in your browser\'s address bar or go to site settings.');
        }
      } catch (error) {
        console.error('Notification setup error:', error);
        toast.error('Failed to setup notifications. Please check your browser settings.');
      }
    } else {
      console.log('❌ This browser does not support notifications');
      toast.error('Your browser does not support notifications');
    }
  };

  // Setup page visibility detection
  const setupPageVisibility = () => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
      console.log('👁️ Page visibility changed:', !document.hidden ? 'visible' : 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also listen for window focus/blur
    const handleFocus = () => setIsPageVisible(true);
    const handleBlur = () => setIsPageVisible(false);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  };

  // Play notification sound
  const playNotificationSound = async () => {
    try {
      // Check if audio context is allowed (Chrome autoplay policy)
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.warn('Web Audio API not supported');
        return;
      }

      const audioContext = new AudioContext();
      
      // Resume audio context if suspended (Chrome autoplay policy)
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
        } catch (error) {
          console.warn('Could not resume audio context:', error);
          return;
        }
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a pleasant notification sound
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 0.1); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2); // E5
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.type = 'sine';
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);

      // Clean up audio context after use
      setTimeout(() => {
        audioContext.close();
      }, 500);
      
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
      
      // Fallback: Try using a simple HTML5 audio beep
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMbBTmV2/LReSsFJXzJ8t2WQQAWX7np1JBMEA9Pqd/trWAaAA=');
        audio.volume = 0.1;
        audio.play().catch(() => {
          console.warn('Audio fallback also failed');
        });
      } catch (fallbackError) {
        console.warn('Audio fallback failed:', fallbackError);
      }
    }
  };

  // Show browser/system notification
  const showNotification = (title: string, body: string, icon?: string, data?: any) => {
    if (notificationPermission === 'granted' && !isPageVisible) {
      try {
        // Prefer service worker notifications for better system integration
        if (serviceWorkerRegistration && 'showNotification' in serviceWorkerRegistration) {
          // Use service worker for persistent system notifications
          const notificationOptions: any = {
            body,
            icon: icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'localchat-message',
            requireInteraction: false,
            silent: false,
            data: data || {},
            actions: [
              {
                action: 'view',
                title: 'Open Chat'
              }
            ]
          };
          serviceWorkerRegistration.showNotification(title, notificationOptions);
          console.log('🔔 Service Worker notification shown:', title);
        } else {
          // Fallback to regular notification
          const notification = new Notification(title, {
            body,
            icon: icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'localchat-message',
            requireInteraction: false,
            silent: false
          });

          // Auto-close notification after 8 seconds
          setTimeout(() => {
            notification.close();
          }, 8000);

          // Handle notification interactions
          notification.onclick = () => {
            // Focus and bring window to front
            if (window.focus) {
              window.focus();
            }
            
            // For Chrome/Edge: bring tab to front
            if (parent && parent !== window) {
              parent.focus();
            }
            
            // Try to bring browser window to front (may not work due to security)
            try {
              window.parent.focus();
            } catch (e) {
              // Silently fail
            }
            
            notification.close();
          };

          console.log('🔔 Browser notification shown:', title);
        }
        
        // Flash the title bar for additional attention
        try {
          const originalTitle = document.title;
          let flashCount = 0;
          const flashInterval = setInterval(() => {
            document.title = flashCount % 2 === 0 ? '💬 New Message!' : originalTitle;
            flashCount++;
            if (flashCount >= 6) {
              clearInterval(flashInterval);
              document.title = originalTitle;
            }
          }, 500);
        } catch (error) {
          // Silently fail
        }

      } catch (error) {
        console.error('Failed to show notification:', error);
        
        // Ultimate fallback: Change tab title
        try {
          if (!isPageVisible) {
            const originalTitle = document.title;
            document.title = `💬 ${title}`;
            
            setTimeout(() => {
              document.title = originalTitle;
            }, 5000);
          }
        } catch (fallbackError) {
          console.error('Notification fallback failed:', fallbackError);
        }
      }
    }
  };

  // Handle new message notifications
  const handleMessageNotification = (message: Message, senderName: string, isGroup: boolean = false) => {
    // Don't notify for own messages
    if (message.sender_id === currentUser?.id) {
      return;
    }

    // Always play sound for new messages (even when page is visible)
    playNotificationSound();

    // Only show browser notification when page is not visible
    if (!isPageVisible) {
      const title = isGroup 
        ? `New message in ${conversations.find(c => c.group_id === message.group_id)?.group_name || 'group'}`
        : `New message from ${senderName}`;
      
      const body = message.file_path 
        ? '📎 Sent a file'
        : message.content || 'New message';

      const notificationData = {
        messageId: message.id,
        senderId: message.sender_id,
        senderName,
        isGroup,
        conversationId: isGroup ? message.group_id : message.sender_id,
        timestamp: new Date().toISOString()
      };

      showNotification(title, body, '/favicon.ico', notificationData);
    }
  };

  // Restore selected conversation from localStorage
  useEffect(() => {
    if (currentUser && conversations.length > 0) {
      const savedConversation = localStorage.getItem('selectedConversation');
      if (savedConversation) {
        try {
          const { id, type } = JSON.parse(savedConversation);
          if (id && type) {
            // Find the conversation in the loaded conversations
            const exists = conversations.find(c => 
              (type === 'direct' && c.other_user_id === id) || 
              (type === 'group' && c.group_id === id)
            );
            
            if (exists) {
              console.log('🔄 Restoring conversation:', id, type);
              handleConversationSelect(id, type === 'group');
            } else {
              // Conversation no longer exists, clear localStorage
              console.warn('Saved conversation no longer exists, clearing localStorage');
              localStorage.removeItem('selectedConversation');
            }
          }
        } catch (error) {
          console.error('Failed to parse saved conversation:', error);
          localStorage.removeItem('selectedConversation');
        }
      }
    }
  }, [currentUser, conversations]);

  // Setup socket handlers with current state
  useEffect(() => {
    console.log('🔧 Setting up socket handlers with current state');
    console.log('🔧 currentUser:', currentUser);
    console.log('🔧 selectedConversation:', selectedConversation);
    
    setupSocketHandlers();

    return () => {
      socketClient.off('onConnected');
      socketClient.off('onDisconnected');
      socketClient.off('onAuthenticated');
      socketClient.off('onNewMessage');
      socketClient.off('onMessageSent');
      socketClient.off('onGroupMessage');
      socketClient.off('onGroupDeleted');
      socketClient.off('onMemberLeftGroup');
      socketClient.off('onOwnershipTransferred');
      socketClient.off('onUserOnline');
      socketClient.off('onUserOffline');
      socketClient.off('onUserTyping');
      socketClient.off('onGroupCreated');
      socketClient.off('onMemberAddedToGroup');
      socketClient.off('onMessagesRead');
      socketClient.off('onError');
      socketClient.off('onAuthError');
    };
  }, [currentUser, selectedConversation]); // Re-setup handlers when these change

  const initializeApp = async () => {
    try {
      // Check if user is authenticated
      if (!apiService.isAuthenticated()) {
        router.push('/');
        return;
      }

      // Get current user
      const userResponse = await apiService.getCurrentUser();
      if (!userResponse.success || !userResponse.data) {
        toast.error('Failed to get user data');
        router.push('/');
        return;
      }

      setCurrentUser(userResponse.data);

      // Connect to socket first (handlers will be set up by the useEffect)
      const token = apiService.getToken();
      if (token) {
        try {
          // Disconnect any existing connections first
          socketClient.disconnect();
          
          // Ensure socket client uses the fresh token
          socketClient.setToken(token);
          await socketClient.connect(token);
        } catch (socketError) {
          console.warn('Socket connection failed:', socketError);
          toast.error('Real-time connection failed');
        }
      }

      // Load conversations and online users after socket connection
      await Promise.all([
        loadConversations(),
        loadOnlineUsers()
      ]);

    } catch (error) {
      console.error('App initialization error:', error);
      toast.error('Failed to initialize app');
    } finally {
      setIsLoading(false);
    }
  };

  const setupSocketHandlers = () => {
    socketClient.on('onConnected', () => {
      setIsConnected(true);
    });

    socketClient.on('onDisconnected', () => {
      setIsConnected(false);
    });

    socketClient.on('onAuthenticated', async (data) => {
      setIsConnected(true);
      toast.success(`Connected as ${data.username}`);
      
      // Auto-join all group rooms after authentication
      setTimeout(async () => {
        try {
          // Load conversations if not already loaded
          if (conversations.length === 0) {
            await loadConversations();
          }
          
          // Join all group rooms
          const groupConversations = conversations.filter(c => c.conversation_type === 'group');
          for (const conv of groupConversations) {
            if (conv.group_id) {
              socketClient.joinRoom(`group_${conv.group_id}`);
            }
          }
          console.log(`🏠 Auto-joined ${groupConversations.length} group rooms after authentication`);
        } catch (error) {
          console.error('Failed to auto-join group rooms:', error);
        }
      }, 1000); // Small delay to ensure socket is fully ready
    });

    socketClient.on('onNewMessage', (message) => {
      console.log('📨 Processing new message:', message);
      
      // Check if this message is for the currently opened conversation
      let isRelevantMessage = false;
      
      if (selectedConversation) {
        if (selectedConversationType === 'group' && message.group_id) {
          // Group message (including system messages): check if it's for the selected group
          isRelevantMessage = message.group_id === selectedConversation.group_id;
        } else if (selectedConversationType === 'direct' && !message.group_id) {
          // Direct message: check if it's between current user and selected user
          isRelevantMessage = (
            // Incoming message: from selected user to me
            (message.sender_id === selectedConversation.other_user_id && message.recipient_id === currentUser?.id) ||
            // Outgoing message: from me to selected user (in case we missed onMessageSent)
            (message.sender_id === currentUser?.id && message.recipient_id === selectedConversation.other_user_id)
          );
        }
      }
      
      if (isRelevantMessage) {
        console.log('📨 Message is relevant, adding to current chat');
        setMessages(prev => {
          // Prevent duplicates by checking if message already exists
          const exists = prev.some(m => m.id === message.id);
          if (exists) {
            console.log('📨 Message already exists, skipping');
            return prev;
          }
          console.log('📨 Adding new message to chat');
          return [...prev, message];
        });
      } else {
        console.log('📨 Message not relevant for current conversation');
      }

      // Handle notifications for direct messages (but not system messages)
      if (!message.group_id && message.recipient_id === currentUser?.id && message.sender_id !== 0) {
        // Find sender information
        const senderName = conversations.find(c => 
          c.conversation_type === 'direct' && c.other_user_id === message.sender_id
        )?.other_username || 'Unknown User';
        
        handleMessageNotification(message, senderName, false);
      }

      // Update unread count for direct messages (only if we're not currently viewing this conversation)
      if (!message.group_id && message.recipient_id === currentUser?.id && message.sender_id !== 0) {
        // Only increment if this conversation is not currently selected or if it's selected but we're not looking at it
        const isCurrentlyViewing = selectedConversation?.other_user_id === message.sender_id && selectedConversationType === 'direct';
        if (!isCurrentlyViewing) {
          incrementUnreadCount(message.sender_id, false);
        }
      }
      
      // Update conversation list (debounced)
      debouncedLoadConversations();
    });

    socketClient.on('onGroupMessage', (message) => {
      // Check if this message is for the currently opened group conversation
      let isRelevantMessage = false;
      
      if (selectedConversation && selectedConversationType === 'group' && message.group_id) {
        isRelevantMessage = message.group_id === selectedConversation.group_id;
      }
      
      if (isRelevantMessage) {
        setMessages(prev => {
          // Prevent duplicates by checking if message already exists
          const exists = prev.some(m => m.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });
      }

      // Handle notifications for group messages
      if (message.group_id && message.sender_id !== currentUser?.id) {
        // Find sender and group information
        const senderName = message.sender_username || 'Unknown User';
        handleMessageNotification(message, senderName, true);
      }

      // Update unread count for group messages (only if we're not currently viewing this group)
      if (message.group_id && message.sender_id !== currentUser?.id) {
        // Only increment if this group is not currently selected or if it's selected but we're not looking at it
        const isCurrentlyViewing = selectedConversation?.group_id === message.group_id && selectedConversationType === 'group';
        if (!isCurrentlyViewing) {
          incrementUnreadCount(message.group_id, true);
        }
      }
      
      // Update conversation list (debounced)
      debouncedLoadConversations();
    });

    socketClient.on('onGroupDeleted', (data) => {
      console.log('Group deleted:', data);
      
      // If the deleted group is the currently selected conversation, reset it
      if (selectedConversation && 
          selectedConversationType === 'group' && 
          selectedConversation.group_id === data.group_id) {
        setSelectedConversation(null);
        setMessages([]);
        localStorage.removeItem('selectedConversation');
        
        // Show notification
        toast.info(`Group was deleted by ${data.deleted_by.username}`);
      }
      
      // Immediately update conversations list to remove the deleted group
      setConversations(prev => prev.filter(c => 
        !(c.conversation_type === 'group' && c.group_id === data.group_id)
      ));
      
      // Also refresh from server (debounced)
      debouncedLoadConversations();
    });

    socketClient.on('onMemberLeftGroup', (data) => {
      console.log('Member left group:', data);
      
      // Show notification if it's the current group
      if (selectedConversation && 
          selectedConversationType === 'group' && 
          selectedConversation.group_id === data.group_id) {
        toast.info(`${data.username} left the group`);
      }
      
      // Refresh conversations to update member count if needed (debounced)
      debouncedLoadConversations();
    });

    socketClient.on('onOwnershipTransferred', (data) => {
      console.log('Ownership transferred:', data);
      
      // Show notification
      toast.info(`Group ownership transferred from ${data.former_owner.username} to ${data.new_owner.username}`);
      
      // Refresh conversations to update ownership status (debounced)
      debouncedLoadConversations();
    });

    socketClient.on('onMessageSent', (message) => {
      // Add sent message to current chat if it's for the selected conversation
      let isForCurrentConversation = false;
      
      if (selectedConversation) {
        if (selectedConversationType === 'group' && message.group_id) {
          // Group message: check if it's for the selected group
          isForCurrentConversation = message.group_id === selectedConversation.group_id;
        } else if (selectedConversationType === 'direct' && !message.group_id) {
          // Direct message: check if it's for the selected user
          isForCurrentConversation = message.recipient_id === selectedConversation.other_user_id;
        }
      }
      
      if (isForCurrentConversation) {
        setMessages(prev => {
          // Prevent duplicates by checking if message already exists
          const exists = prev.some(m => m.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });
      }
      
      // Update conversation list (debounced)
      debouncedLoadConversations();
    });

    socketClient.on('onUserOnline', (data) => {
      setOnlineUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
    });

    socketClient.on('onUserOffline', (data) => {
      setOnlineUsers(prev => prev.filter(id => id !== data.userId));
    });

    socketClient.on('onUserTyping', (data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.userId]: data.isTyping
      }));

      // Clear typing indicator after 3 seconds if still typing
      if (data.isTyping) {
        setTimeout(() => {
          setTypingUsers(prev => {
            const updated = { ...prev };
            if (updated[data.userId]) {
              delete updated[data.userId];
            }
            return updated;
          });
        }, 3000);
      }
    });

    socketClient.on('onGroupCreated', (data) => {
      // Refresh conversations to show the new group
      loadConversations();
      
      // Show notification (but only if current user didn't create it)
      if (data.created_by.id !== currentUser?.id) {
        toast.success(`You were added to group "${data.group.name}"`);
      }
    });

    socketClient.on('onMemberAddedToGroup', (data) => {
      // Refresh conversations to show the group
      loadConversations();
      
      // Auto-join the group room for real-time messaging
      if (socketClient.isConnected()) {
        socketClient.joinRoom(`group_${data.group.id}`);
      }
      
      // Show notification
      toast.success(`You were added to group "${data.group.name}" by ${data.added_by.username}`);
    });

    socketClient.on('onGroupAvatarUpdated', (data) => {
      console.log('Group avatar updated:', data);
      
      // Update conversations list to reflect the new avatar
      setConversations(prev => prev.map(conversation => {
        if (conversation.conversation_type === 'group' && conversation.group_id === data.group_id) {
          return {
            ...conversation,
            avatar_path: data.avatar_path
          };
        }
        return conversation;
      }));
      
      // Show notification if the current user didn't update it
      if (data.updated_by.id !== currentUser?.id) {
        const avatarAction = data.avatar_path ? 'updated' : 'removed';
        toast.info(`Group avatar ${avatarAction} by ${data.updated_by.username}`);
      }
    });

    socketClient.on('onMemberLeftGroup', (data) => {
      // If this is about the current user, it's handled elsewhere
      if (data.user_id === currentUser?.id) {
        return;
      }
      
      // Show notification if this is for the currently selected group
      if (selectedConversation && 
          selectedConversationType === 'group' && 
          selectedConversation.group_id === data.group_id) {
        toast.info(`${data.username} has left the group`);
      }
      
      // Refresh conversations to update member counts
      loadConversations();
    });

    socketClient.on('onMessagesRead', (data) => {
      
      // Update read status for messages in the current conversation
      if (selectedConversation) {
        let isRelevantForCurrentConversation = false;
        
        if (data.is_group && selectedConversationType === 'group') {
          isRelevantForCurrentConversation = selectedConversation.group_id === data.conversation_id;
        } else if (!data.is_group && selectedConversationType === 'direct') {
          // For direct messages, check if this event is about the current conversation
          // The event is relevant if the reader or conversation involves the selected user
          isRelevantForCurrentConversation = 
            selectedConversation.other_user_id === data.reader_id || 
            selectedConversation.other_user_id === data.conversation_id;
        }
        
        if (isRelevantForCurrentConversation) {
          setMessages(prev => prev.map(message => {
            // Only update the specific messages that were read
            if (data.message_ids.includes(message.id)) {
              if (data.is_group) {
                // For group messages, add to read_by array
                const existingRead = message.read_by?.find(r => r.user_id === data.reader_id);
                if (!existingRead) {
                  return {
                    ...message,
                    read_by: [
                      ...(message.read_by || []),
                      {
                        user_id: data.reader_id,
                        username: data.reader_username,
                        read_at: new Date().toISOString()
                      }
                    ]
                  };
                }
              } else {
                // For direct messages, only mark as read if the reader is NOT the current user
                // (This means the OTHER person read our messages)
                if (data.reader_id !== currentUser?.id) {
                  return {
                    ...message,
                    is_read: true,
                    read_at: new Date().toISOString()
                  };
                }
              }
            }
            return message;
          }));
        }
      }
      
      // Note: Unread counts are now handled by the useReadStatus hook
      // No need to reload conversations as this causes race conditions
    });

    socketClient.on('onError', (error) => {
      toast.error(error.error || 'Socket error occurred');
    });

    socketClient.on('onAuthError', (error) => {
      toast.error('Authentication failed');
      handleLogout();
    });
  };

  const loadConversations = async () => {
    try {
      const response = await apiService.getConversations();
      if (response.success && response.data) {
        setConversations(response.data);
        
        // Restore last conversation if none is selected and we have saved state
        if (!selectedConversation && response.data.length > 0) {
          const savedConversation = localStorage.getItem('lastConversation');
          if (savedConversation) {
            try {
              const { conversationId, isGroup } = JSON.parse(savedConversation);
              
              // Check if the saved conversation still exists
              const conversationExists = response.data.some((conv: any) => {
                if (isGroup) {
                  return conv.group_id === conversationId;
                } else {
                  return conv.other_user_id === conversationId;
                }
              });
              
              if (conversationExists) {
                // Restore the conversation with a small delay to ensure everything is loaded
                setTimeout(() => {
                  handleConversationSelect(conversationId, isGroup);
                }, 100);
              }
            } catch (e) {
              // Invalid saved data, ignore
              localStorage.removeItem('lastConversation');
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await apiService.getOnlineUsers();
      if (response.success && response.data) {
        const userIds = response.data.map(user => user.userId);
        setOnlineUsers(userIds);
      }
    } catch (error) {
      console.error('Failed to load online users:', error);
    }
  };

  const handleStartChat = async (userId: number) => {
    try {
      // Get user information first
      const usersResponse = await apiService.getUsers();
      if (usersResponse.success && usersResponse.data) {
        const user = usersResponse.data.find(u => u.id === userId);
        
        if (user) {
          // Create a temporary conversation with the user's information
          const tempConversation: Conversation = {
            other_user_id: user.id,
            other_username: user.username,
            last_message: '',
            last_message_time: new Date().toISOString(),
            conversation_type: 'direct',
            group_id: undefined,
            group_name: undefined,
            avatar_path: undefined
          };
          
          // Set the selected conversation with the user information
          setSelectedConversation(tempConversation);
          setSelectedConversationType('direct');
          setMessages([]);
          
          // Save to localStorage
          localStorage.setItem('selectedConversation', JSON.stringify({
            id: userId,
            type: 'direct'
          }));
          
          // Reload conversations to show the new chat in the sidebar
          await loadConversations();
        } else {
          // User not found
          toast.error('User not found');
        }
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const handleGroupCreated = async (groupData: any) => {
    // Handle both API response format and direct group object
    const group = groupData.group || groupData;
    
    // Refresh conversations to show the new group
    await loadConversations();
    
    // Show success message
    toast.success(`Group "${group.name}" created successfully`);
    
    // Optionally select the new group conversation
    // TODO: Add group selection logic when group chat display is implemented
  };

  const handleConversationSelect = async (conversationId: number, isGroup: boolean = false) => {
    try {
      setIsLoadingMessages(true);
      
      // Save selected conversation to localStorage
      localStorage.setItem('selectedConversation', JSON.stringify({
        id: conversationId,
        type: isGroup ? 'group' : 'direct'
      }));
      
      const conversation = conversations.find(c => 
        (isGroup && c.group_id === conversationId) || 
        (!isGroup && c.other_user_id === conversationId)
      );
      
      if (!conversation) {
        // For direct chats, if the conversation doesn't exist yet, create a temporary conversation object
        // This allows users to start a new chat with someone they haven't chatted with before
        if (!isGroup) {
          // Get user info to create a temporary conversation
          try {
            const usersResponse = await apiService.getUsers();
            if (usersResponse.success && usersResponse.data) {
              const user = usersResponse.data.find(u => u.id === conversationId);
              if (user) {
                const tempConversation: Conversation = {
                  other_user_id: user.id,
                  other_username: user.username,
                  last_message: '',
                  last_message_time: new Date().toISOString(),
                  conversation_type: 'direct',
                  group_id: undefined,
                  group_name: undefined,
                  avatar_path: undefined
                };
                
                setSelectedConversation(tempConversation);
                setSelectedConversationType('direct');
                setMessages([]);
                setIsLoadingMessages(false);
                return;
              }
            }
          } catch (error) {
            console.error('Failed to get user info:', error);
          }
        }
        
        // If we reach here, either it's a group that doesn't exist or we couldn't get user info
        localStorage.removeItem('selectedConversation');
        setSelectedConversation(null);
        setMessages([]);
        console.warn(`Conversation not found: ${isGroup ? 'group' : 'direct'} ID ${conversationId}`);
        return;
      }
      
      setSelectedConversation(conversation);
      setSelectedConversationType(isGroup ? 'group' : 'direct');
      
      // Join the appropriate room for real-time messaging
      if (socketClient.isConnected()) {
        if (isGroup) {
          socketClient.joinRoom(`group_${conversationId}`);
        }
        // For direct messages, no specific room joining needed
      }
      
      // Fetch messages for this conversation
      const response = isGroup
        ? await apiService.getGroupMessages(conversationId)
        : await apiService.getDirectMessages(conversationId);
      
      if (response.success && response.data) {
        setMessages(response.data);
      } else {
        toast.error('Failed to load messages');
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error('Failed to load conversation');
      // Reset state on error
      setSelectedConversation(null);
      setMessages([]);
      localStorage.removeItem('selectedConversation');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !selectedConversation) return;

    try {
      // Try to send via socket first (real-time)
      if (socketClient.isConnected()) {
        if (selectedConversationType === 'group') {
          socketClient.sendGroupMessage(selectedConversation.group_id || 0, content.trim());
        } else {
          socketClient.sendMessage(selectedConversation.other_user_id, content.trim());
        }
      } else {
        // Fallback to HTTP API
        const response = selectedConversationType === 'group' 
          ? await apiService.sendGroupMessage(selectedConversation.group_id || 0, content.trim())
          : await apiService.sendMessage(selectedConversation.other_user_id, content.trim());
          
        if (response.success && response.data) {
          setMessages(prev => [...prev, response.data!]);
          loadConversations();
        } else {
          toast.error('Failed to send message');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleFileUploaded = (message: Message) => {
    // Add the message immediately to show in current conversation
    let isForCurrentConversation = false;
    
    if (selectedConversation) {
      if (selectedConversationType === 'group' && message.group_id) {
        // Group message: check if it's for the selected group
        isForCurrentConversation = message.group_id === selectedConversation.group_id;
      } else if (selectedConversationType === 'direct' && !message.group_id) {
        // Direct message: check if it's for the selected user
        isForCurrentConversation = message.recipient_id === selectedConversation.other_user_id;
      }
    }
    
    if (isForCurrentConversation) {
      setMessages(prev => {
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
    }
    
    // Update conversation list to show latest activity (debounced)
    debouncedLoadConversations();
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      socketClient.disconnect();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      apiService.clearAuth();
      socketClient.disconnect();
      router.push('/');
    }
  };

  const handleDeleteConversation = (conversationId: number, isGroup: boolean) => {
    // Reset selected conversation if it was deleted
    if (selectedConversation) {
      const currentId = selectedConversation.conversation_type === 'direct' 
        ? selectedConversation.other_user_id 
        : selectedConversation.group_id;
        
      if ((isGroup && currentId === conversationId) || 
          (!isGroup && currentId === conversationId)) {
        setSelectedConversation(null);
        // Clear localStorage when conversation is deleted
        localStorage.removeItem('selectedConversation');
      }
    }
    
    // Refresh conversations list (debounced)
    debouncedLoadConversations();
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading LocalChat...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex bg-background">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} border-r border-border flex flex-col h-full transition-all duration-300 ease-in-out`}>
          {/* Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-border">
            {!sidebarCollapsed ? (
              <>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-6 w-6 text-primary" />
                  <span className="font-semibold">LocalChat</span>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Notification Status */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setupNotifications()}
                    className="text-muted-foreground hover:text-foreground p-1"
                    title={notificationPermission === 'granted' ? 'Notifications enabled - you will receive alerts for new messages' : 
                           notificationPermission === 'denied' ? 'Notifications blocked - check your browser settings or site permissions' : 
                           'Click to enable desktop notifications for new messages'}
                  >
                    {notificationPermission === 'granted' ? (
                      <Bell className="h-4 w-4 text-green-600" />
                    ) : (
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  
                  {/* Connection Status */}
                  {isConnected ? (
                    <Badge variant="secondary" className="text-xs">
                      <Circle className="h-2 w-2 mr-1 fill-green-500 text-green-500" />
                      Online
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <Circle className="h-2 w-2 mr-1 fill-red-500 text-red-500" />
                      Offline
                    </Badge>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center w-full space-y-1">
                <div className="relative">
                  <MessageSquare className="h-6 w-6 text-primary" />
                  {isConnected ? (
                    <Circle className="absolute -top-1 -right-1 h-3 w-3 fill-green-500 text-green-500" />
                  ) : (
                    <Circle className="absolute -top-1 -right-1 h-3 w-3 fill-red-500 text-red-500" />
                  )}
                </div>
                {/* Notification status in collapsed view */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setupNotifications()}
                  className="p-1 h-6"
                  title={notificationPermission === 'granted' ? 'Notifications enabled - you will receive alerts for new messages' : 
                         notificationPermission === 'denied' ? 'Notifications blocked - check your browser settings or site permissions' : 
                         'Click to enable desktop notifications for new messages'}
                >
                  {notificationPermission === 'granted' ? (
                    <Bell className="h-3 w-3 text-green-600" />
                  ) : (
                    <BellOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Toggle Button */}
          <div className="px-2 py-2 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`w-full ${sidebarCollapsed ? 'justify-center' : 'justify-start'} space-x-2`}
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  <span className="text-xs">Hide</span>
                </>
              )}
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="p-2 border-b border-border">
            <NewChatDialog
              onlineUsers={onlineUsers}
              onStartChat={handleStartChat}
              onGroupCreated={handleGroupCreated}
              collapsed={sidebarCollapsed}
            />
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-hidden">
            <ChatList
              conversations={conversations}
              selectedConversation={selectedConversation ? 
                (selectedConversation.conversation_type === 'direct' ? 
                  selectedConversation.other_user_id : 
                  selectedConversation.group_id || 0) : null}
              onSelectConversation={handleConversationSelect}
              onlineUsers={onlineUsers}
              typingUsers={typingUsers}
              collapsed={sidebarCollapsed}
              currentUser={currentUser}
            />
          </div>

          {/* User Info - Moved to Bottom */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{currentUser?.username}</p>
                  <p className="text-sm text-muted-foreground capitalize">{currentUser?.role}</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sign out</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Collapsed User Info */}
          {sidebarCollapsed && (
            <div className="p-2 border-t border-border flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-foreground p-2"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sign out</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Signature */}
          {!sidebarCollapsed && (
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Developed By Management Information System Section (MISS)<br />
                Municipality Of Quezon Bukidnon 8715 Philippines<br />
                All Rights Reserved 2025
              </p>
            </div>
          )}
        </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {selectedConversation ? (
          <ChatWindow
            messages={messages}
            currentUser={currentUser}
            selectedConversation={
              selectedConversation.conversation_type === 'direct'
                ? selectedConversation.other_user_id
                : selectedConversation.group_id || 0
            }
            selectedConversationType={selectedConversation.conversation_type}
            onSendMessage={handleSendMessage}
            isConnected={isConnected}
            conversations={conversations}
            typingUsers={typingUsers}
            onRefreshMessages={() => {
              if (selectedConversation) {
                const id = selectedConversation.conversation_type === 'direct' 
                  ? selectedConversation.other_user_id 
                  : (selectedConversation.group_id || 0);
                handleConversationSelect(id, selectedConversation.conversation_type === 'group');
              }
            }}
            onFileUploaded={handleFileUploaded}
            onDeleteConversation={handleDeleteConversation}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Card className="p-8 text-center max-w-md">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Welcome to LocalChat</h3>
              <p className="text-muted-foreground">
                Select a conversation from the sidebar to start messaging
              </p>
            </Card>
          </div>
        )}
      </div>
      </div>
    </TooltipProvider>
  );
} 