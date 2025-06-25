'use client';

import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Circle, Paperclip, Download, Image as ImageIcon, ArrowDown, Users, Settings, Trash2, LogOut, MessageSquare, MoreVertical, UserMinus, File, FileText, FileSpreadsheet, FileBox, FileJson } from 'lucide-react';
import { Message, User, Conversation } from '@/lib/types';
import { socketClient } from '@/lib/socket-client';
import { cn } from '@/lib/utils';
import { ImageModal } from '@/components/ui/image-modal';
import FileUpload from './FileUpload';
import { GroupSettingsDialog } from './GroupSettingsDialog';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import path from 'path';
import { useReadStatus } from '@/lib/hooks/useReadStatus';

interface ChatWindowProps {
  messages: Message[];
  currentUser: User | null;
  selectedConversation: number;
  selectedConversationType: 'direct' | 'group';
  onSendMessage: (content: string) => void;
  isConnected: boolean;
  conversations: Conversation[];
  typingUsers: { [userId: number]: boolean };
  onRefreshMessages?: () => void;
  onFileUploaded?: (message: Message) => void;
  onDeleteConversation?: (conversationId: number, isGroup: boolean) => void;
}

export function ChatWindow({
  messages,
  currentUser,
  selectedConversation,
  selectedConversationType,
  onSendMessage,
  isConnected,
  conversations,
  typingUsers,
  onRefreshMessages,
  onFileUploaded,
  onDeleteConversation
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    imageSrc: string;
    imageAlt: string;
    fileName?: string;
  }>({
    isOpen: false,
    imageSrc: '',
    imageAlt: '',
    fileName: undefined
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);
  
  // Read status hook
  const { markAllUnreadAsRead, markMessagesAsRead } = useReadStatus(currentUser);

  useEffect(() => {
    // Use setTimeout to ensure the DOM is fully updated before scrolling
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  // Scroll to bottom when selected conversation changes
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [selectedConversation]);

  // Auto-mark ALL unread messages as read when viewing conversation
  const processingRef = useRef(false);
  const lastConversationRef = useRef<string>('');
  
  useEffect(() => {
    if (!currentUser || !selectedConversation || processingRef.current) return;
    
    const conversationKey = `${selectedConversationType}_${selectedConversation}`;
    
    // Only process when we switch to a new conversation (not on every message update)
    if (conversationKey !== lastConversationRef.current) {
      lastConversationRef.current = conversationKey;
      processingRef.current = true;
      
      // Mark ALL unread messages in this conversation as read after a short delay
      const timer = setTimeout(() => {
        console.log(`📖 ChatWindow: Auto-marking all unread messages as read in ${conversationKey}`);
        markAllUnreadAsRead(selectedConversation, selectedConversationType === 'group').finally(() => {
          processingRef.current = false;
        });
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        processingRef.current = false;
      };
    }
  }, [selectedConversation, selectedConversationType, currentUser?.id, markAllUnreadAsRead]);
  
  // Reset processing state when conversation changes
  useEffect(() => {
    processingRef.current = false;
  }, [selectedConversation, selectedConversationType]);

  // Add scroll event listener to detect when user has scrolled up
  useEffect(() => {
    const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    
    if (!scrollArea) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea as HTMLElement;
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
      setShowScrollButton(isScrolledUp);
    };
    
    scrollArea.addEventListener('scroll', handleScroll);
    return () => {
      scrollArea.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getConversationPartner = () => {
    // First check if selectedConversation is a number (normal case) or an object (new chat case)
    const isConversationObject = typeof selectedConversation === 'object';
    
    // If it's a regular conversation ID, find it in the conversations list
    if (!isConversationObject) {
      const conversation = conversations.find(c => 
        (selectedConversationType === 'direct' && c.other_user_id === selectedConversation) || 
        (selectedConversationType === 'group' && c.group_id === selectedConversation)
      );
      
      if (selectedConversationType === 'group') {
        return conversation?.group_name || 'Unknown Group';
      }
      
      return conversation?.other_username || 'Unknown User';
    } 
    // If it's already a Conversation object (happens with new chats)
    else {
      // Cast to any to access properties safely
      const conv = selectedConversation as any;
      if (conv.other_username) {
        return conv.other_username;
      }
      return 'Unknown User';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && currentUser) {
      onSendMessage(inputValue);
      setInputValue('');
      handleStopTyping();
      
      // Scroll to bottom after sending a message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      if (selectedConversationType === 'group') {
        socketClient.startTyping(undefined, selectedConversation);
      } else {
        socketClient.startTyping(selectedConversation);
      }
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
      if (selectedConversationType === 'group') {
        socketClient.stopTyping(undefined, selectedConversation);
      } else {
        socketClient.stopTyping(selectedConversation);
      }
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
    // SQLite CURRENT_TIMESTAMP returns UTC time in 'YYYY-MM-DD HH:MM:SS' format
    // We need to append 'Z' to indicate it's UTC, then convert to local time
    const utcTimestamp = timestamp.includes('Z') ? timestamp : timestamp + 'Z';
    const date = new Date(utcTimestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openImageModal = (imageSrc: string, imageAlt: string, fileName?: string) => {
    setImageModal({
      isOpen: true,
      imageSrc,
      imageAlt,
      fileName
    });
  };

  const closeImageModal = () => {
    setImageModal({
      isOpen: false,
      imageSrc: null as unknown as string,
      imageAlt: '',
      fileName: undefined
    });
  };

  const handleImageDownload = async () => {
    if (imageModal.imageSrc && imageModal.fileName) {
      try {
        // Fetch the image as a blob
        const response = await fetch(imageModal.imageSrc);
        const blob = await response.blob();
        
        // Create a temporary URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary anchor element and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = imageModal.fileName; // Use the original filename
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to download image:', error);
        // Fallback to opening in new tab if download fails
        window.open(imageModal.imageSrc, '_blank');
      }
    }
  };

  const handleDeleteConversation = async () => {
    if (!currentUser || !selectedConversation) return;
    
    try {
      if (selectedConversationType === 'direct') {
        await apiService.deleteConversation(selectedConversation);
        toast.success('Chat deleted');
      } else {
        // For groups, we just clear the conversation for the current user
        // (we don't delete the entire group unless it's done from group settings)
        await apiService.clearGroupConversation(selectedConversation);
        toast.success('Conversation cleared');
      }
      
      // Notify parent to refresh conversations
      if (onDeleteConversation) {
        onDeleteConversation(selectedConversation, selectedConversationType === 'group');
      }
    } catch (error: any) {
      toast.error(error.message || (selectedConversationType === 'direct' ? 
        'Failed to delete chat' : 'Failed to clear conversation'));
    } finally {
      setIsConfirmingDelete(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUser || !selectedConversation) return;
    
    try {
      await apiService.leaveGroup(selectedConversation);
      toast.success('Left group successfully');
      
      // Notify parent to refresh conversations
      if (onDeleteConversation) {
        onDeleteConversation(selectedConversation, true);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave group');
    } finally {
      setIsConfirmingLeave(false);
    }
  };

  // Check if user is the group owner
  const isGroupOwner = () => {
    if (!currentUser || selectedConversationType !== 'group') return false;
    const selectedGroup = conversations.find(c => c.group_id === selectedConversation);
    // This is a simplification - in a real app you'd check the created_by field
    // For now, assume only admin users can be group owners
    return currentUser.role === 'admin';
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <ImageIcon className="w-4 h-4" />;
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-4 h-4" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'ppt':
      case 'pptx':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'txt':
        return <FileText className="w-4 h-4" />;
      case 'zip':
      case 'rar':
        return <FileBox className="w-4 h-4" />;
      case 'json':
        return <FileJson className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 px-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center space-x-3 min-w-0 overflow-hidden">
          <Avatar className={cn("h-8 w-8 shrink-0", selectedConversationType === 'group' && "bg-blue-500/10")}>
            {selectedConversationType === 'group' && conversations.find(c => c.group_id === selectedConversation)?.avatar_path ? (
              <AvatarImage 
                src={`/api/files/download/${conversations.find(c => c.group_id === selectedConversation)?.avatar_path?.split('/').pop()}`} 
                alt={getConversationPartner()} 
              />
            ) : null}
            {selectedConversationType === 'group' ? (
              <AvatarFallback className="bg-blue-500/10 text-blue-700">
                <Users className="h-4 w-4" />
              </AvatarFallback>
            ) : (
              <AvatarFallback className="bg-primary/10">
                {getConversationPartner().charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0 overflow-hidden">
            <h2 className="font-semibold flex items-center gap-2">
              {selectedConversationType === 'group' && <span className="text-blue-600 shrink-0">#</span>}
              <span className="truncate">{getConversationPartner()}</span>
            </h2>
            {typingUsers[selectedConversation] ? (
              <p className="text-xs text-muted-foreground italic">typing...</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {isConnected ? 'Online' : 'Offline'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-1">
          {selectedConversationType === 'group' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGroupSettings(true)}
                className="h-8 w-8 p-0"
                title="Group Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>

              {isGroupOwner() ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  title="Clear Conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirmingLeave(true)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  title="Leave Group"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </>
          )}

          {selectedConversationType === 'direct' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirmingDelete(true)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Delete Chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          <Badge variant={isConnected ? 'secondary' : 'destructive'} className="text-xs hidden sm:flex">
            <Circle className={cn(
              "h-2 w-2 mr-1",
              isConnected ? "fill-green-500 text-green-500" : "fill-red-500 text-red-500"
            )} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          
          <Badge variant={isConnected ? 'secondary' : 'destructive'} className="w-2 h-2 sm:hidden p-0">
            <Circle className={cn(
              "h-2 w-2",
              isConnected ? "fill-green-500 text-green-500" : "fill-red-500 text-red-500"
            )} />
          </Badge>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {isConfirmingDelete && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {selectedConversationType === 'direct' ? 'Delete Chat?' : 'Clear Conversation?'}
            </h3>
            <p className="mb-6">
              {selectedConversationType === 'direct' 
                ? 'This will remove this conversation from your list. The other person will still see the conversation.'
                : 'This will clear all messages in this group from your conversation list. Other members will still see the messages.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeleteConversation}
              >
                {selectedConversationType === 'direct' ? 'Delete Chat' : 'Clear Conversation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Group Confirmation Dialog */}
      {isConfirmingLeave && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-bold mb-4">Leave Group?</h3>
            <p className="mb-6">
              This will remove you from the group. You'll need to be added again to rejoin.
            </p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsConfirmingLeave(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleLeaveGroup}
              >
                Leave
              </Button>
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-6 overflow-y-auto h-full" ref={scrollAreaRef}>
        <div className="py-4 space-y-4">
          {messages.map((message, index) => {
            // System messages should be displayed differently
            if (message.message_type === 'system') {
              return (
                <div
                  key={message.id}
                  className="flex justify-center w-full mb-2"
                >
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-center max-w-md">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      {message.content}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-500 opacity-70">
                      {formatMessageTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              );
            }

            const isCurrentUser = message.sender_id === currentUser?.id;
            const showAvatar = !isCurrentUser && (
              index === 0 || 
              messages[index - 1]?.sender_id !== message.sender_id
            );

            // Check if this is the last message from current user and if it should show read status
            const isLastUserMessage = isCurrentUser && (
              index === messages.length - 1 || 
              (index < messages.length - 1 && messages.slice(index + 1).every(m => m.sender_id !== currentUser?.id || m.message_type === 'system'))
            );

            return (
              <div key={message.id}>
                <div
                  className={cn(
                    "flex items-end space-x-2 mb-2 w-full",
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
                      "max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 break-words",
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
                          className="max-w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxHeight: '200px', maxWidth: '100%' }}
                          onClick={() => {
                            const imageSrc = `/api/files/download/${message.file_path?.split('/').pop()}`;
                            const imageAlt = message.file_name || 'Image';
                            openImageModal(imageSrc, imageAlt, message.file_name);
                          }}
                        />
                        {message.content && message.content !== `Shared image: ${message.file_name}` && (
                          <p className="text-sm break-words">{message.content}</p>
                        )}
                      </div>
                    ) : message.message_type === 'file' && message.file_path ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 p-2 bg-background/50 rounded border flex-wrap">
                          <div className="flex items-center w-full mb-1">
                            {getFileIcon(message.file_name || '')}
                            <div className="flex-1 min-w-0 mx-1">
                              <p className="text-sm font-medium break-all line-clamp-2" title={message.file_name}>
                                {message.file_name && message.file_name.length > 25 
                                  ? message.file_name.substring(0, 12) + '...' + 
                                    message.file_name.substring(message.file_name.lastIndexOf('.') - 5)
                                  : message.file_name}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-between w-full items-center">
                            <p className="text-xs opacity-70">
                              {message.file_size ? `${Math.round(message.file_size / 1024)} KB` : 'File'}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0 ml-auto"
                              onClick={() => message.file_path && window.open(`/api/files/download/${message.file_path.split('/').pop()}`, '_blank')}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {message.content && message.content !== `Shared file: ${message.file_name}` && (
                          <p className="text-sm break-words">{message.content}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
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

                {/* Show "seen" indicator right after the last message from current user */}
                {(() => {
                  // Only show "seen" for messages sent BY the current user that have been read by the recipient
                  const shouldShow = isLastUserMessage && selectedConversationType === 'direct' && isCurrentUser && message.is_read;
                  
                  return shouldShow ? (
                    <div className={cn(
                      "flex mb-2 w-full",
                      "justify-end pr-10" // Always align right since this is for current user's messages
                    )}>
                      <div className="text-xs text-muted-foreground">
                        Seen by {(() => {
                          const otherUser = conversations.find(c => 
                            c.conversation_type === 'direct' && c.other_user_id === selectedConversation
                          );
                          return otherUser?.other_username || 'User';
                        })()} {message.read_at ? ` ${formatMessageTime(message.read_at)}` : ''}
                      </div>
                    </div>
                  ) : null;
                })()}
                
                {isLastUserMessage && selectedConversationType === 'group' && message.read_by && message.read_by.length > 0 && (
                  <div className={cn(
                    "flex mb-2 w-full",
                    isCurrentUser ? "justify-end pr-10" : "justify-start pl-10"
                  )}>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">Seen by</span>
                      <div className="flex -space-x-1">
                        {message.read_by.filter(reader => reader.user_id !== currentUser?.id).slice(0, 3).map((reader) => (
                          <Avatar key={reader.user_id} className="h-4 w-4 border border-background" title={`${reader.username} - ${formatMessageTime(reader.read_at)}`}>
                            <AvatarFallback className="bg-primary/10 text-xs">
                              {reader.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {message.read_by.filter(reader => reader.user_id !== currentUser?.id).length > 3 ? (
                          <div className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600 border border-background flex items-center justify-center" title={`+${message.read_by.filter(reader => reader.user_id !== currentUser?.id).length - 3} more`}>
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                              +{message.read_by.filter(reader => reader.user_id !== currentUser?.id).length - 3}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {showScrollButton && (
        <div className="absolute bottom-24 right-6">
          <Button 
            size="icon" 
            className="rounded-full shadow-md" 
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}

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
        recipientId={selectedConversationType === 'direct' ? selectedConversation : undefined}
        groupId={selectedConversationType === 'group' ? selectedConversation : undefined}
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

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModal.isOpen}
        onClose={closeImageModal}
        imageSrc={imageModal.imageSrc}
        imageAlt={imageModal.imageAlt}
        fileName={imageModal.fileName}
        onDownload={handleImageDownload}
      />

      {/* Group Settings Dialog */}
      {selectedConversationType === 'group' && currentUser && (
        <GroupSettingsDialog
          isOpen={showGroupSettings}
          onClose={() => setShowGroupSettings(false)}
          group={{
            id: selectedConversation,
            name: getConversationPartner(),
            description: '',
            avatar_path: conversations.find(c => c.group_id === selectedConversation)?.avatar_path,
            created_by: 0 // This will be populated when the dialog loads members
          }}
          currentUser={currentUser}
          onGroupUpdated={(updatedGroup) => {
            // Check if the group was deleted
            if (updatedGroup.deleted && updatedGroup.groupId === selectedConversation) {
              // Handle group deletion
              if (onDeleteConversation) {
                onDeleteConversation(selectedConversation, true);
              }
            } 
            // Check if the user left the group
            else if (updatedGroup.left && updatedGroup.groupId === selectedConversation) {
              // Handle leaving group - similar to deletion from user's perspective
              if (onDeleteConversation) {
                onDeleteConversation(selectedConversation, true);
                toast.success('You have left the group');
              }
            }
            else {
              // Refresh conversations or handle group updates
              if (onRefreshMessages) {
                onRefreshMessages();
              }
            }
          }}
        />
      )}
    </div>
  );
} 