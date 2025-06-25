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
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ [userId: number]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Initialize user and socket connection
  useEffect(() => {
    initializeApp();
  }, []);

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
      const isRelevantMessage = selectedConversation && (
        // Incoming message: from selected user to me
        (message.sender_id === selectedConversation && message.recipient_id === currentUser?.id) ||
        // Outgoing message: from me to selected user (in case we missed onMessageSent)
        (message.sender_id === currentUser?.id && message.recipient_id === selectedConversation)
      );
      
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

    socketClient.on('onMessageSent', (message) => {
      // Add sent message to current chat if it's for the selected conversation
      const isForCurrentConversation = selectedConversation && message.recipient_id === selectedConversation;
      
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
    await handleConversationSelect(userId);
    
    // Reload conversations to show the new chat in the sidebar
    await loadConversations();
  };

  const handleConversationSelect = async (userId: number) => {
    setSelectedConversation(userId);
    
    try {
      const response = await apiService.getDirectMessages(userId);
      if (response.success && response.data) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !content.trim()) return;

    try {
      // Send via socket for real-time delivery
      if (socketClient.isConnected()) {
        socketClient.sendMessage(selectedConversation, content.trim());
      } else {
        // Fallback to HTTP API
        const response = await apiService.sendMessage(selectedConversation, content.trim());
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
    const isForCurrentConversation = selectedConversation && message.recipient_id === selectedConversation;
    
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
          />
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-hidden">
          <ChatList
            conversations={conversations}
            selectedConversation={selectedConversation}
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
            selectedConversation={selectedConversation}
            onSendMessage={handleSendMessage}
            isConnected={isConnected}
            conversations={conversations}
            typingUsers={typingUsers}
            onRefreshMessages={() => selectedConversation && handleConversationSelect(selectedConversation)}
            onFileUploaded={handleFileUploaded}
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