'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminNavigation } from './AdminNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import {
  Bell,
  Settings,
  User,
  LogOut,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface AdminUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  avatar?: string;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
  read: boolean;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchSystemAlerts();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await apiService.getCurrentUser();
      if (!response.success || !response.data) {
        throw new Error('Not authenticated');
      }
      
      // Check if user is admin
      if (response.data.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        router.push('/chat');
        return;
      }
      
      setUser(response.data);
    } catch (error) {
      console.error('Auth check failed:', error);
      toast.error('Authentication failed. Please login.');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemAlerts = async () => {
    try {
      const token = apiService.getToken();
      if (!token) return;

      const response = await fetch('/api/admin/system', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch system alerts:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      const token = apiService.getToken();
      if (!token) return;

      await fetch(`/api/admin/system/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ read: true })
      });
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      ));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const unreadAlerts = alerts.filter(alert => !alert.read);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Auth redirect in progress
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Navigation */}
      <div className="flex-shrink-0">
        <AdminNavigation />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <Card className="rounded-none border-l-0 border-r-0 border-t-0">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-semibold text-lg">Administration Panel</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <Badge variant="outline" className="text-xs">
                LocalChat Admin v1.0
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {/* System Alerts */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="w-4 h-4" />
                    {unreadAlerts.length > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center p-0"
                      >
                        {unreadAlerts.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="px-3 py-2 text-sm font-medium border-b">
                    System Alerts ({unreadAlerts.length} unread)
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        No system alerts
                      </div>
                    ) : (
                      alerts.slice(0, 5).map((alert) => (
                        <DropdownMenuItem
                          key={alert.id}
                          className={`block px-3 py-2 cursor-pointer ${
                            !alert.read ? 'bg-blue-50 dark:bg-blue-950' : ''
                          }`}
                          onClick={() => markAlertAsRead(alert.id)}
                        >
                          <div className="flex items-start gap-2">
                            {getAlertIcon(alert.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight">
                                {alert.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(alert.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                  {alerts.length > 5 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground border-t text-center">
                      View all alerts in System Health
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>
                        {user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{user.username}</span>
                      <span className="text-xs text-muted-foreground">{user.role}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <Separator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
} 