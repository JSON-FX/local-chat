'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Settings, Camera, Upload, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { User as UserType } from '@/lib/types';

interface UserSettingsDialogProps {
  currentUser: UserType | null;
  onUserUpdate?: (user: UserType) => void;
  children?: React.ReactNode;
}

export function UserSettingsDialog({ currentUser, onUserUpdate, children }: UserSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'avatar'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const handleAvatarUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = localStorage.getItem('auth_token');

      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Avatar updated successfully');
        if (onUserUpdate && data.data) {
          onUserUpdate(data.data);
        }
      } else {
        toast.error(data.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onUserUpdate]);

  const handleAvatarDelete = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch('/api/users/avatar', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Avatar removed successfully');
        if (onUserUpdate && data.data) {
          onUserUpdate(data.data);
        }
      } else {
        toast.error(data.error || 'Failed to remove avatar');
      }
    } catch (error) {
      console.error('Avatar delete error:', error);
      toast.error('Failed to remove avatar');
    } finally {
      setIsLoading(false);
    }
  }, [onUserUpdate]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Settings</span>
          </DialogTitle>
          <DialogDescription>
            View your profile information and manage your avatar
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg mb-6" role="tablist">
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('profile')}
            className="flex-1"
            role="tab"
            aria-selected={activeTab === 'profile'}
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </Button>
          <Button
            variant={activeTab === 'avatar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('avatar')}
            className="flex-1"
            role="tab"
            aria-selected={activeTab === 'avatar'}
          >
            <Camera className="h-4 w-4 mr-2" />
            Avatar
          </Button>
        </div>

        {/* Profile Tab - Read-only SSO information */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your profile details from LGU Single Sign-On
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-200"
                role="status"
              >
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>This information is managed by LGU-SSO and cannot be edited here.</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <p className="text-sm font-medium">
                    {currentUser?.full_name || 'Not set'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Username</Label>
                    <p className="text-sm font-medium">{currentUser?.username}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm font-medium">
                      {currentUser?.email || 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Position</Label>
                    <p className="text-sm font-medium">
                      {currentUser?.position || 'Not set'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Office</Label>
                    <p className="text-sm font-medium">
                      {currentUser?.office_name || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Username: {currentUser?.username}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  Role: {currentUser?.role}
                </Badge>
                {currentUser?.sso_role && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    SSO Role: {currentUser.sso_role}
                  </Badge>
                )}
              </div>

              {currentUser?.profile_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(currentUser.profile_synced_at).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Avatar Tab - Locally editable */}
        {activeTab === 'avatar' && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>
                Upload or change your profile picture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  {currentUser?.avatar_path ? (
                    <img
                      src={`/api/files/download/${currentUser.avatar_path}`}
                      alt={currentUser.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted flex items-center justify-center text-2xl font-semibold">
                      {currentUser?.full_name?.[0] || currentUser?.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{currentUser?.full_name || currentUser?.username}</p>
                  <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentUser?.avatar_path ? 'Custom avatar' : 'Default avatar'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="avatar-upload" className="text-sm font-medium">
                    Upload New Avatar
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose a JPG, PNG, or GIF file (max 5MB)
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                    {currentUser?.avatar_path && (
                      <Button
                        onClick={handleAvatarDelete}
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                </div>

                {isLoading && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
                    <span>Processing avatar...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
