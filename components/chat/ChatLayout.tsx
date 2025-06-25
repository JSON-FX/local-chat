'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  LogOut, 
  Wifi, 
  WifiOff,
  Circle 
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import { socketClient } from '@/lib/socket-client';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { NewChatDialog } from './NewChatDialog';
import { User, Conversation, Message } from '@/lib/types';

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

  // Initialize user and socket connection
  useEffect(() => {
    initializeApp();
  }, []);

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
      socketClient.off('onUserOnline');
      socketClient.off('onUserOffline');
      socketClient.off('onUserTyping');
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

      // Load conversations and online users
      await Promise.all([
        loadConversations(),
        loadOnlineUsers()
      ]);

      // Connect to socket if we have a token
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

    socketClient.on('onAuthenticated', (data) => {
      setIsConnected(true);
      toast.success(`Connected as ${data.username}`);
    });

    socketClient.on('onNewMessage', (message) => {
      // Check if this message is for the currently opened conversation
      let isRelevantMessage = false;
      
      if (selectedConversation) {
        if (selectedConversationType === 'group' && message.group_id) {
          // Group message: check if it's for the selected group
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
        setMessages(prev => {
          // Prevent duplicates by checking if message already exists
          const exists = prev.some(m => m.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });
      }
      
      // Update conversation list
      loadConversations();
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
      
      // Update conversation list
      loadConversations();
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
      
      // Also refresh from server
      loadConversations();
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
      
      // Update conversation list
      loadConversations();
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
    // Select the conversation (this will create one if it doesn't exist when first message is sent)
    await handleConversationSelect(userId, false);
    
    // Reload conversations to show the new chat in the sidebar
    await loadConversations();
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
    
    // Update conversation list to show latest activity
    loadConversations();
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
    
    // Refresh conversations list
    loadConversations();
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
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col h-full">
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <span className="font-semibold">LocalChat</span>
          </div>
          <div className="flex items-center space-x-2">
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
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{currentUser?.username}</p>
              <p className="text-sm text-muted-foreground capitalize">{currentUser?.role}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-border">
          <NewChatDialog
            onlineUsers={onlineUsers}
            onStartChat={handleStartChat}
            onGroupCreated={handleGroupCreated}
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
          />
        </div>
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
  );
} 