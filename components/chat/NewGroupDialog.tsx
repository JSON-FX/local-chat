'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';
import { Users, X } from 'lucide-react';
import { User } from '@/lib/types';

interface NewGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated?: (group: any) => void;
}

const NewGroupDialog: React.FC<NewGroupDialogProps> = ({
  isOpen,
  onClose,
  onGroupCreated
}) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load available users when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await apiService.getUsers();
      if (response.success) {
        setAvailableUsers(response.data || []);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberToggle = (userId: number) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    setCreating(true);
    
    try {
      console.log('DEBUG: Creating group with selected members:', selectedMembers);
      
      const response = await apiService.createGroup({
        name: groupName.trim(),
        description: description.trim() || undefined,
        initial_members: selectedMembers
      });
      
      if (response.success) {
        toast.success('Group created successfully');
        onGroupCreated?.(response.data.group);
        handleClose();
      } else {
        toast.error(response.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Create group error:', error);
      toast.error('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName('');
    setDescription('');
    setSelectedMembers([]);
    setCreating(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Create New Group
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              maxLength={100}
              disabled={creating}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional group description"
              rows={3}
              disabled={creating}
            />
          </div>

          {/* Member Selection */}
          <div className="space-y-2">
            <Label>Add Members ({selectedMembers.length} selected)</Label>
            <ScrollArea className="h-48 border rounded-md p-2">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <span className="text-sm text-muted-foreground">Loading users...</span>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="flex items-center justify-center py-4">
                  <span className="text-sm text-muted-foreground">No users available</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm"
                    >
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedMembers.includes(user.id)}
                        onCheckedChange={() => handleMemberToggle(user.id)}
                        disabled={creating}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-xs">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <label
                        htmlFor={`user-${user.id}`}
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        {user.username}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={creating || !groupName.trim()}
            >
              {creating ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewGroupDialog; 