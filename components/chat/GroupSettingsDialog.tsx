'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Settings, Upload, Trash2, UserMinus, Crown, Shield, UserPlus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import { User } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GroupMember {
  id: number;
  username: string;
  group_role: 'admin' | 'moderator' | 'member';
  joined_at: string;
}

interface GroupSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  group: {
    id: number;
    name: string;
    description?: string;
    avatar_path?: string;
    created_by: number;
  };
  currentUser: User;
  onGroupUpdated?: (group: any) => void;
}

export function GroupSettingsDialog({
  isOpen,
  onClose,
  group,
  currentUser,
  onGroupUpdated
}: GroupSettingsDialogProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Add members functionality
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [addMembersLoading, setAddMembersLoading] = useState(false);

  // Check if current user is admin
  const isAdmin = members.find(m => m.id === currentUser.id)?.group_role === 'admin';

  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, group.id]);

  useEffect(() => {
    // Set initial avatar preview if group has avatar
    if (group.avatar_path) {
      setAvatarPreview(`/api/files/download/${group.avatar_path.split('/').pop()}`);
    }
  }, [group.avatar_path]);

  useEffect(() => {
    if (showAddMembers) {
      loadUsers();
    }
  }, [showAddMembers]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getGroupMembers(group.id);
      if (response.success && response.data) {
        setMembers(response.data);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error('Failed to load group members');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiService.getUsers();
      if (response.success && response.data) {
        // Filter out users who are already members
        const memberIds = members.map(m => m.id);
        const availableUsers = response.data.filter((user: User) => !memberIds.includes(user.id));
        setUsers(availableUsers);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one user to add');
      return;
    }

    try {
      setAddMembersLoading(true);
      const response = await apiService.addGroupMembers(group.id, selectedUserIds);
      if (response.success) {
        toast.success(`Added ${selectedUserIds.length} member(s) successfully`);
        setShowAddMembers(false);
        setSelectedUserIds([]);
        setUserSearchQuery('');
        loadMembers(); // Refresh members list
      } else {
        toast.error(response.error || 'Failed to add members');
      }
    } catch (error) {
      console.error('Failed to add members:', error);
      toast.error('Failed to add members');
    } finally {
      setAddMembersLoading(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!isAdmin) {
      toast.error('Only group admins can remove members');
      return;
    }

    try {
      const response = await apiService.removeGroupMember(group.id, userId);
      if (response.success) {
        toast.success('Member removed successfully');
        loadMembers();
      } else {
        toast.error(response.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !isAdmin) return;

    try {
      setLoading(true);
      const response = await apiService.uploadGroupAvatar(group.id, avatarFile);
      if (response.success) {
        toast.success('Group avatar updated successfully');
        setAvatarFile(null);
        onGroupUpdated?.(response.data?.group);
      } else {
        toast.error(response.error || 'Failed to update avatar');
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast.error('Failed to update avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      const response = await apiService.removeGroupAvatar(group.id);
      if (response.success) {
        toast.success('Group avatar removed successfully');
        setAvatarPreview(null);
        setAvatarFile(null);
        onGroupUpdated?.(response.data?.group);
      } else {
        toast.error(response.error || 'Failed to remove avatar');
      }
    } catch (error) {
      console.error('Failed to remove avatar:', error);
      toast.error('Failed to remove avatar');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">Admin</Badge>;
      case 'moderator':
        return <Badge variant="secondary" className="text-blue-700 bg-blue-100">Moderator</Badge>;
      default:
        return <Badge variant="outline">Member</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Group Settings - {group.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Avatar Section */}
          {isAdmin && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Group Avatar</h3>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt={group.name} />
                  ) : (
                    <AvatarFallback className="bg-blue-500/10 text-blue-700">
                      <Users className="h-8 w-8" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <div className="flex gap-2">
                    {avatarFile && (
                      <Button
                        onClick={handleUploadAvatar}
                        disabled={loading}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload
                      </Button>
                    )}
                    {(avatarPreview || group.avatar_path) && (
                      <Button
                        onClick={handleRemoveAvatar}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
            </div>
          )}

          {/* Members Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members ({members.length})
              </h3>
              {isAdmin && (
                <Button
                  onClick={() => setShowAddMembers(!showAddMembers)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Members
                </Button>
              )}
            </div>

            {/* Add Members Section */}
            {showAddMembers && isAdmin && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        {userSearchQuery ? 'No users found matching your search' : 'No available users to add'}
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={selectedUserIds.includes(user.id)}
                            onCheckedChange={() => handleUserToggle(user.id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
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
                      ))
                    )}
                  </div>
                </ScrollArea>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedUserIds.length} user(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowAddMembers(false);
                        setSelectedUserIds([]);
                        setUserSearchQuery('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddMembers}
                      disabled={selectedUserIds.length === 0 || addMembersLoading}
                      size="sm"
                    >
                      {addMembersLoading ? 'Adding...' : `Add ${selectedUserIds.length} Member(s)`}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <ScrollArea className="h-64">
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading members...
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No members found
                  </div>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {member.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.username}</span>
                            {getRoleIcon(member.group_role)}
                          </div>
                          <div className="flex items-center gap-2">
                            {getRoleBadge(member.group_role)}
                            <span className="text-xs text-muted-foreground">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Only show remove button for admins, and can't remove group creator */}
                      {isAdmin && member.id !== group.created_by && member.id !== currentUser.id && (
                        <Button
                          onClick={() => handleRemoveMember(member.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 