'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, MessageSquare, Circle, Plus, Users, User as UserIcon } from 'lucide-react';
import { User } from '@/lib/types';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';
import NewGroupDialog from './NewGroupDialog';

interface NewChatDialogProps {
  onlineUsers: number[];
  onStartChat: (userId: number) => void;
  onGroupCreated?: (group: any) => void;
  collapsed?: boolean;
}

export function NewChatDialog({ onlineUsers, onStartChat, onGroupCreated, collapsed = false }: NewChatDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && users.length === 0) {
      loadUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim()) {
      const filtered = users.filter(user => {
        const fullName = formatUserDisplayName(user).toLowerCase();
        const username = user.username.toLowerCase();
        const query = searchQuery.toLowerCase();
        
        return fullName.includes(query) || username.includes(query);
      });
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getUsers();
      if (response.success && response.data) {
        setUsers(response.data);
        setFilteredUsers(response.data);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = (user: User) => {
    onStartChat(user.id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleGroupCreated = (group: any) => {
    onGroupCreated?.(group);
    setIsOpen(false);
  };

  // Helper function to format user display name with same logic as sidebar and conversation list
  const formatUserDisplayName = (user: User) => {
    // Build full name with middle initial if available
    if (user.name) {
      let fullName = user.name;
      
      // Add middle initial if middle_name exists
      if (user.middle_name) {
        fullName += ` ${user.middle_name.charAt(0).toUpperCase()}.`;
      }
      
      // Add last name if it exists
      if (user.last_name) {
        fullName += ` ${user.last_name}`;
      }
      
      return fullName;
    }
    
    // Fallback to username if no first name
    return user.username;
  };

  const sortedUsers = useMemo(() => {
    if (!filteredUsers || !Array.isArray(filteredUsers)) {
      return [];
    }
    
    return [...filteredUsers].sort((a, b) => {
      // Sort online users first
      const aOnline = onlineUsers.includes(a.id);
      const bOnline = onlineUsers.includes(b.id);
      
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      
      // Then sort alphabetically by display name
      return formatUserDisplayName(a).localeCompare(formatUserDisplayName(b));
    });
  }, [filteredUsers, onlineUsers]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {collapsed ? (
          <Button size="sm" className="w-full h-10 p-2" title="New Chat">
            <Plus className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Chat</DialogTitle>
          <DialogDescription>
            Choose how you want to start a conversation
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Chat Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto p-4 flex-col space-y-2"
              onClick={() => setShowGroupDialog(true)}
            >
              <Users className="h-6 w-6" />
              <span className="text-sm font-medium">Create Group</span>
              <span className="text-xs text-muted-foreground">Chat with multiple people</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex-col space-y-2"
              onClick={() => {/* Keep dialog open for direct chat selection */}}
            >
              <UserIcon className="h-6 w-6" />
              <span className="text-sm font-medium">Direct Chat</span>
              <span className="text-xs text-muted-foreground">Chat with one person</span>
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users for direct chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users List */}
          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : sortedUsers.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">
                    {searchQuery ? 'No users found' : 'No users available'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {sortedUsers.map((user) => (
                  <Button
                    key={user.id}
                    variant="ghost"
                    className="w-full h-auto p-3 justify-start"
                    onClick={() => handleStartChat(user)}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      {/* Avatar with online indicator */}
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          {user.avatar_path ? (
                            <AvatarImage 
                              src={`/api/files/download/${user.avatar_path}`} 
                              alt={formatUserDisplayName(user)} 
                            />
                          ) : null}
                          <AvatarFallback className="bg-primary/10">
                            {formatUserDisplayName(user).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {onlineUsers.includes(user.id) && (
                          <Circle className="absolute -bottom-1 -right-1 h-3 w-3 fill-green-500 text-green-500" />
                        )}
                      </div>

                      {/* User details */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{formatUserDisplayName(user)}</p>
                          {onlineUsers.includes(user.id) && (
                            <Badge variant="secondary" className="text-xs">
                              Online
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">
                          {user.role}
                        </p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>

      {/* Group Creation Dialog */}
      <NewGroupDialog
        isOpen={showGroupDialog}
        onClose={() => setShowGroupDialog(false)}
        onGroupCreated={handleGroupCreated}
      />
    </Dialog>
  );
} 