'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Circle, MessageSquare } from 'lucide-react';
import { Conversation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChatListProps {
  conversations: Conversation[];
  selectedConversation: number | null;
  onSelectConversation: (userId: number) => void;
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
          const isSelected = selectedConversation === conversation.other_user_id;
          return (
          <div 
            key={conversation.other_user_id}
            ref={isSelected ? selectedConversationRef : null}
          >
            <Button
              variant="ghost"
              className={cn(
                "w-full h-auto p-3 mb-1 justify-start text-left",
                isSelected && "bg-accent"
              )}
              onClick={() => onSelectConversation(conversation.other_user_id)}
            >
              <div className="flex items-start space-x-3 w-full">
                {/* Avatar with online indicator */}
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10">
                      {(conversation.other_username || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {onlineUsers.includes(conversation.other_user_id) && (
                    <Circle className="absolute -bottom-1 -right-1 h-3 w-3 fill-green-500 text-green-500" />
                  )}
                </div>

                {/* Conversation details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">
                      {conversation.other_username || 'Unknown User'}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {conversation.last_message_time ? formatLastMessageTime(conversation.last_message_time) : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate">
                      {typingUsers[conversation.other_user_id] ? (
                        <span className="italic text-primary">typing...</span>
                      ) : (
                        truncateMessage(conversation.last_message || 'No messages yet')
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