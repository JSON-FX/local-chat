'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Circle, MessageSquare, Users } from 'lucide-react';
import { Conversation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChatListProps {
  conversations: Conversation[];
  selectedConversation: number | null;
  onSelectConversation: (userId: number, isGroup?: boolean) => void;
  onlineUsers: number[];
  typingUsers: { [userId: number]: boolean };
}

export function ChatList({
  conversations,
  selectedConversation,
  onSelectConversation,
  onlineUsers,
  typingUsers
}: ChatListProps) {
  const selectedConversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedConversation && selectedConversationRef.current) {
      selectedConversationRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedConversation]);

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
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

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (conversations.length === 0) {
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

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="p-2">
        {conversations.map((conversation) => {
          const isGroup = conversation.conversation_type === 'group';
          const conversationId = isGroup ? conversation.group_id! : conversation.other_user_id;
          const isSelected = selectedConversation === conversationId;
          const displayName = isGroup ? conversation.group_name : conversation.other_username;
          
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
                        src={`/api/files/download/${conversation.avatar_path.split('/').pop()}`} 
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
                </div>

                {/* Conversation details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1">
                      <p className="text-sm font-medium truncate">
                        {displayName || (isGroup ? 'Unknown Group' : 'Unknown User')}
                      </p>
                      {isGroup && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          Group
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {conversation.last_message_time ? formatLastMessageTime(conversation.last_message_time) : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate">
                      {!isGroup && typingUsers[conversation.other_user_id] ? (
                        <span className="italic text-primary">typing...</span>
                      ) : (
                        truncateMessage(conversation.last_message || (isGroup ? 'Group created' : 'No messages yet'))
                      )}
                    </p>
                    {(conversation.unread_count || 0) > 0 && (
                      <Badge variant="destructive" className="text-xs h-5 min-w-[20px] rounded-full">
                        {(conversation.unread_count || 0) > 99 ? '99+' : (conversation.unread_count || 0)}
                      </Badge>
                    )}
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