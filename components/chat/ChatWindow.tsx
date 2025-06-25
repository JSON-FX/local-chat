'use client';

import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Circle, Paperclip, Download, Image as ImageIcon } from 'lucide-react';
import { Message, User, Conversation } from '@/lib/types';
import { socketClient } from '@/lib/socket-client';
import { cn } from '@/lib/utils';
import FileUpload from './FileUpload';

interface ChatWindowProps {
  messages: Message[];
  currentUser: User | null;
  selectedConversation: number;
  onSendMessage: (content: string) => void;
  isConnected: boolean;
  conversations: Conversation[];
  typingUsers: { [userId: number]: boolean };
  onRefreshMessages?: () => void;
  onFileUploaded?: (message: Message) => void;
}

export function ChatWindow({
  messages,
  currentUser,
  selectedConversation,
  onSendMessage,
  isConnected,
  conversations,
  typingUsers,
  onRefreshMessages,
  onFileUploaded
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getConversationPartner = () => {
    const conversation = conversations.find(c => c.other_user_id === selectedConversation);
    return conversation?.other_username || 'Unknown User';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && currentUser) {
      onSendMessage(inputValue);
      setInputValue('');
      handleStopTyping();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      socketClient.startTyping(selectedConversation);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      socketClient.stopTyping(selectedConversation);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    handleStopTyping();
  }, [selectedConversation]);

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 px-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10">
              {getConversationPartner().charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{getConversationPartner()}</h2>
            {typingUsers[selectedConversation] ? (
              <p className="text-xs text-muted-foreground italic">typing...</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {isConnected ? 'Online' : 'Offline'}
              </p>
            )}
          </div>
        </div>
        <Badge variant={isConnected ? 'secondary' : 'destructive'} className="text-xs">
          <Circle className={cn(
            "h-2 w-2 mr-1",
            isConnected ? "fill-green-500 text-green-500" : "fill-red-500 text-red-500"
          )} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      <ScrollArea className="flex-1 px-6">
        <div className="py-4 space-y-4">
          {messages.map((message, index) => {
            const isCurrentUser = message.sender_id === currentUser?.id;
            const showAvatar = !isCurrentUser && (
              index === 0 || 
              messages[index - 1]?.sender_id !== message.sender_id
            );

            return (
              <div
                key={message.id}
                className={cn(
                  "flex items-end space-x-2 mb-2",
                  isCurrentUser ? "justify-end" : "justify-start"
                )}
              >
                {!isCurrentUser && (
                  <div className="w-8">
                    {showAvatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10">
                          {(message.sender_username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-3 py-2",
                    isCurrentUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {!isCurrentUser && showAvatar && (
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {message.sender_username}
                    </p>
                  )}
                  
                  {/* Message content based on type */}
                  {message.message_type === 'image' && message.file_path ? (
                    <div className="space-y-2">
                      <img
                        src={`/api/files/download/${message.file_path?.split('/').pop()}`}
                        alt={message.file_name || 'Image'}
                        className="max-w-64 max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90"
                        onClick={() => message.file_path && window.open(`/api/files/download/${message.file_path.split('/').pop()}`, '_blank')}
                      />
                      {message.content && message.content !== `Shared image: ${message.file_name}` && (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  ) : message.message_type === 'file' && message.file_path ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 p-2 bg-background/50 rounded border">
                        <Download className="w-4 h-4" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.file_name}</p>
                          <p className="text-xs opacity-70">
                            {message.file_size ? `${Math.round(message.file_size / 1024)} KB` : 'File'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => message.file_path && window.open(`/api/files/download/${message.file_path.split('/').pop()}`, '_blank')}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                      {message.content && message.content !== `Shared file: ${message.file_name}` && (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className={cn(
                      "text-xs opacity-70",
                      isCurrentUser ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {formatMessageTime(message.timestamp)}
                    </span>
                    {message.queued && (
                      <Badge variant="outline" className="text-xs ml-2">
                        Queued
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setShowFileUpload(true)}
            disabled={!isConnected}
            className="shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1"
            disabled={!isConnected}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!inputValue.trim() || !isConnected}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {!isConnected && (
          <p className="text-xs text-muted-foreground mt-2">
            Disconnected - messages will be sent when connection is restored
          </p>
        )}
      </div>

      {/* File Upload Dialog */}
      <FileUpload
        isOpen={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        recipientId={selectedConversation}
        onFileUploaded={(message) => {
          console.log('File uploaded:', message);
          if (onFileUploaded) {
            onFileUploaded(message);
          } else {
            // Fallback: trigger refresh if no handler provided
            setTimeout(() => {
              if (onRefreshMessages) {
                onRefreshMessages();
              }
            }, 1000);
          }
        }}
      />
    </div>
  );
} 