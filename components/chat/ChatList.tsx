'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Circle, MessageSquare, Users } from 'lucide-react';
import { Conversation, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { useReadStatus } from '@/lib/hooks/useReadStatus';

interface ChatListProps {
  conversations: Conversation[];
  selectedConversation: number | null;
  onSelectConversation: (userId: number, isGroup?: boolean) => void;
  onlineUsers: number[];
  typingUsers: { [userId: number]: boolean };
  collapsed?: boolean;
  currentUser: User | null;
}

export function ChatList({
  conversations,
  selectedConversation,
  onSelectConversation,
  onlineUsers,
  typingUsers,
  collapsed = false,
  currentUser
}: ChatListProps) {
  const selectedConversationRef = useRef<HTMLDivElement>(null);
  const { getUnreadCount } = useReadStatus({
    messages: [],
    currentUser,
    selectedConversation: 0,
    selectedConversationType: 'direct',
    isConnected: true
  });

  useEffect(() => {
    if (selectedConversation && selectedConversationRef.current) {
      selectedConversationRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedConversation]);

  const formatLastMessageTime = (timestamp: string) => {
    // SQLite CURRENT_TIMESTAMP returns UTC time in 'YYYY-MM-DD HH:MM:SS' format
    // We need to append 'Z' to indicate it's UTC, then convert to local time
    const utcTimestamp = timestamp.includes('Z') ? timestamp : timestamp + 'Z';
    const date = new Date(utcTimestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const truncateMessage = (message: string, maxLength: number = 35) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength).trim() + '...';
  };

  // Helper function to format display name with same logic as sidebar
  const formatDisplayName = (conversation: Conversation) => {
    if (conversation.conversation_type === 'group') {
      return conversation.group_name || 'Unknown Group';
    }
    
    // For direct conversations, build full name with middle initial if available
    if (conversation.other_user_name) {
      let fullName = conversation.other_user_name;
      
      // Add middle initial if middle_name exists
      if (conversation.other_user_middle_name) {
        fullName += ` ${conversation.other_user_middle_name.charAt(0).toUpperCase()}.`;
      }
      
      // Add last name if it exists
      if (conversation.other_user_last_name) {
        fullName += ` ${conversation.other_user_last_name}`;
      }
      
      return fullName;
    }
    
    // Fallback to username if no first name
    return conversation.other_username || 'Unknown User';
  };

  if (conversations.length === 0) {
    if (collapsed) {
      return (
        <div className="flex-1 flex items-center justify-center p-2">
          <MessageSquare className="h-6 w-6 text-white/50" />
        </div>
      );
    }
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-white/50" />
          <p className="text-sm text-white/50">No conversations yet</p>
          <p className="text-xs text-white/50 mt-1">
            Start a new conversation to see it here
          </p>
        </div>
      </div>
    );
  }

  // Render collapsed view
  if (collapsed) {
    return (
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-1">
          {conversations.map((conversation) => {
            const isGroup = conversation.conversation_type === 'group';
            const conversationId = isGroup ? conversation.group_id! : conversation.other_user_id;
            const isSelected = selectedConversation === conversationId;
            const displayName = formatDisplayName(conversation);
            const unreadCount = getUnreadCount(conversationId, isGroup);
            
            return (
              <div 
                key={isGroup ? `group-${conversation.group_id}` : `user-${conversation.other_user_id}`}
                className="mb-2"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full h-12 p-2 justify-center relative hover:bg-white/5",
                    isSelected && "bg-[oklch(0.59_0.16_255_/_20%)] border-l-[3px] border-l-[oklch(0.59_0.16_255)]"
                  )}
                  onClick={() => onSelectConversation(conversationId, isGroup)}
                  title={displayName}
                >
                  <div className="relative">
                                      <Avatar className="h-8 w-8">
                    {isGroup && conversation.avatar_path ? (
                      <AvatarImage 
                        src={`/api/files/download/${conversation.avatar_path}`} 
                        alt={displayName || 'Group'} 
                      />
                    ) : (!isGroup && conversation.avatar_path) ? (
                      <AvatarImage 
                        src={`/api/files/download/${conversation.avatar_path}`} 
                        alt={displayName || 'User'} 
                      />
                    ) : null}
                    <AvatarFallback className={cn(
                      "text-xs",
                      isGroup ? "bg-white/10 text-white/70" : "bg-white/10"
                    )}>
                      {isGroup ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        (displayName || 'U').charAt(0).toUpperCase()
                      )}
                    </AvatarFallback>
                  </Avatar>
                    {!isGroup && onlineUsers.includes(conversation.other_user_id) && (
                      <Circle className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-green-400 text-green-400" />
                    )}
                    {isGroup && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 gradient-accent rounded-full flex items-center justify-center">
                        <span className="text-[6px] text-white font-bold">#</span>
                      </div>
                    )}
                    <NotificationBadge count={unreadCount} />
                  </div>
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      <div className="p-2">
        {conversations.map((conversation) => {
          const isGroup = conversation.conversation_type === 'group';
          const conversationId = isGroup ? conversation.group_id! : conversation.other_user_id;
          const isSelected = selectedConversation === conversationId;
          const displayName = formatDisplayName(conversation);
          const unreadCount = getUnreadCount(conversationId, isGroup);
          
          return (
          <div 
            key={isGroup ? `group-${conversation.group_id}` : `user-${conversation.other_user_id}`}
            ref={isSelected ? selectedConversationRef : null}
          >
            <button
              className={cn(
                "w-full h-auto p-3 mb-1 flex items-center text-left rounded-md hover:bg-white/5 overflow-hidden",
                isSelected && "bg-[oklch(0.59_0.16_255_/_20%)] border-l-[3px] border-l-[oklch(0.59_0.16_255)]"
              )}
              onClick={() => onSelectConversation(conversationId, isGroup)}
            >
              <div className="flex items-start gap-3 w-full min-w-0">
                {/* Avatar with online indicator */}
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    {isGroup && conversation.avatar_path ? (
                      <AvatarImage 
                        src={`/api/files/download/${conversation.avatar_path}`} 
                        alt={displayName || 'Group'} 
                      />
                    ) : (!isGroup && conversation.avatar_path) ? (
                      <AvatarImage 
                        src={`/api/files/download/${conversation.avatar_path}`} 
                        alt={displayName || 'User'} 
                      />
                    ) : null}
                    <AvatarFallback className={cn(
                      "text-xs",
                      isGroup ? "bg-white/10 text-white/70" : "bg-white/10"
                    )}>
                      {isGroup ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        (displayName || 'U').charAt(0).toUpperCase()
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {!isGroup && onlineUsers.includes(conversation.other_user_id) && (
                    <Circle className="absolute -bottom-1 -right-1 h-3 w-3 fill-green-400 text-green-400" />
                  )}
                  {isGroup && (
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 gradient-accent rounded-full flex items-center justify-center">
                      <span className="text-[8px] text-white font-bold">#</span>
                    </div>
                  )}
                  <NotificationBadge count={unreadCount} />
                </div>

                {/* Conversation details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-sm font-medium text-white truncate flex-1 min-w-0">
                      {displayName}
                    </p>
                    {isGroup && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                        Group
                      </Badge>
                    )}
                    <span className="text-xs text-white/50 shrink-0">
                      {conversation.last_message_time ? formatLastMessageTime(conversation.last_message_time) : ''}
                    </span>
                  </div>

                  <p className="text-xs text-white/50 truncate">
                    {!isGroup && typingUsers[conversation.other_user_id] ? (
                      <span className="italic text-[var(--gradient-from)]">typing...</span>
                    ) : (
                      truncateMessage(conversation.last_message || (isGroup ? 'Group created' : 'No messages yet'))
                    )}
                  </p>
                </div>
              </div>
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
} 