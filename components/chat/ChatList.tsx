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
  const { getUnreadCount } = useReadStatus(currentUser);

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

  if (conversations.length === 0) {
    if (collapsed) {
      return (
        <div className="flex-1 flex items-center justify-center p-2">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
        </div>
      );
    }
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No conversations yet</p>
          <p className="text-xs text-muted-foreground mt-1">
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
            const displayName = isGroup ? conversation.group_name : conversation.other_username;
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
                    "w-full h-12 p-2 justify-center relative",
                    isSelected && "bg-accent"
                  )}
                  onClick={() => onSelectConversation(conversationId, isGroup)}
                  title={displayName || (isGroup ? 'Unknown Group' : 'Unknown User')}
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      {isGroup && conversation.avatar_path ? (
                        <AvatarImage 
                          src={`/api/files/download/${conversation.avatar_path}`} 
                          alt={displayName || 'Group'} 
                        />
                      ) : null}
                      <AvatarFallback className={cn(
                        "text-xs",
                        isGroup ? "bg-blue-100 text-blue-700" : "bg-primary/10"
                      )}>
                        {isGroup ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          (displayName || 'U').charAt(0).toUpperCase()
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {!isGroup && onlineUsers.includes(conversation.other_user_id) && (
                      <Circle className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-green-500 text-green-500" />
                    )}
                    {isGroup && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-blue-500 rounded-full flex items-center justify-center">
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
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="p-2">
        {conversations.map((conversation) => {
          const isGroup = conversation.conversation_type === 'group';
          const conversationId = isGroup ? conversation.group_id! : conversation.other_user_id;
          const isSelected = selectedConversation === conversationId;
          const displayName = isGroup ? conversation.group_name : conversation.other_username;
          const unreadCount = getUnreadCount(conversationId, isGroup);
          
          return (
          <div 
            key={isGroup ? `group-${conversation.group_id}` : `user-${conversation.other_user_id}`}
            ref={isSelected ? selectedConversationRef : null}
          >
            <Button
              variant="ghost"
              className={cn(
                "w-full h-auto p-3 mb-1 justify-start text-left",
                isSelected && "bg-accent"
              )}
              onClick={() => onSelectConversation(conversationId, isGroup)}
            >
              <div className="flex items-start space-x-3 w-full">
                {/* Avatar with online indicator */}
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    {isGroup && conversation.avatar_path ? (
                      <AvatarImage 
                        src={`/api/files/download/${conversation.avatar_path}`} 
                        alt={displayName || 'Group'} 
                      />
                    ) : null}
                    <AvatarFallback className={cn(
                      "text-xs",
                      isGroup ? "bg-blue-100 text-blue-700" : "bg-primary/10"
                    )}>
                      {isGroup ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        (displayName || 'U').charAt(0).toUpperCase()
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {!isGroup && onlineUsers.includes(conversation.other_user_id) && (
                    <Circle className="absolute -bottom-1 -right-1 h-3 w-3 fill-green-500 text-green-500" />
                  )}
                  {isGroup && (
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-[8px] text-white font-bold">#</span>
                    </div>
                  )}
                  <NotificationBadge count={unreadCount} />
                </div>

                {/* Conversation details */}
                <div className="flex-1 min-w-0 relative">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1 flex-1 min-w-0 max-w-[calc(100%-50px)] pr-2">
                      <p className="text-sm font-medium text-truncate-ellipsis">
                        {displayName || (isGroup ? 'Unknown Group' : 'Unknown User')}
                      </p>
                      {isGroup && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1 flex-shrink-0">
                          Group
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 min-w-[45px] text-right">
                      {conversation.last_message_time ? formatLastMessageTime(conversation.last_message_time) : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs text-muted-foreground text-truncate-ellipsis">
                        {!isGroup && typingUsers[conversation.other_user_id] ? (
                          <span className="italic text-primary">typing...</span>
                        ) : (
                          truncateMessage(conversation.last_message || (isGroup ? 'Group created' : 'No messages yet'))
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Button>
          </div>
          );
        })}
      </div>
    </ScrollArea>
  );
} 