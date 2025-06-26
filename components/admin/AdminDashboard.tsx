'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Users,
  MessageSquare,
  AlertTriangle,
  Activity,
  Shield,
  Server,
  TrendingUp,
  Clock,
  Database,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';

interface DashboardData {
  stats: {
    totalUsers: number;
    onlineUsers: number;
    totalMessages: number;
    todayMessages: number;
    activeGroups: number;
    systemLoad: number;
    memoryUsage: number;
    diskUsage: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'user' | 'message' | 'system' | 'security';
    description: string;
    timestamp: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    socket: 'healthy' | 'warning' | 'error';
    fileSystem: 'healthy' | 'warning' | 'error';
    memory: 'healthy' | 'warning' | 'error';
  };
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }>;
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '🟢';
      case 'warning':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Failed to load dashboard data. Please try again.
            </p>
            <Button onClick={fetchDashboardData} className="w-full mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and management center
          </p>
        </div>
        <Button onClick={fetchDashboardData} size="sm">
          <Activity className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert) => (
            <Card key={alert.id} className={`border-l-4 ${
              alert.type === 'error' ? 'border-l-red-500' :
              alert.type === 'warning' ? 'border-l-yellow-500' :
              'border-l-blue-500'
            }`}>
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className={`w-5 h-5 ${
                  alert.type === 'error' ? 'text-red-500' :
                  alert.type === 'warning' ? 'text-yellow-500' :
                  'text-blue-500'
                }`} />
                <div className="flex-1">
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                <Badge variant={
                  alert.type === 'error' ? 'destructive' :
                  alert.type === 'warning' ? 'secondary' :
                  'default'
                }>
                  {alert.type.toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.stats.totalUsers)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{formatNumber(data.stats.onlineUsers)}</span> online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.stats.totalMessages)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">{formatNumber(data.stats.todayMessages)}</span> today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Load</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(data.stats.systemLoad)}</div>
            <p className="text-xs text-muted-foreground">
              CPU utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(data.stats.memoryUsage)}</div>
            <p className="text-xs text-muted-foreground">
              RAM utilization
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Current status of system components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span>Database</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={getHealthColor(data.systemHealth.database)}>
                  {getHealthIcon(data.systemHealth.database)}
                </span>
                <Badge variant={data.systemHealth.database === 'healthy' ? 'default' : 'destructive'}>
                  {data.systemHealth.database}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                <span>Socket Server</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={getHealthColor(data.systemHealth.socket)}>
                  {getHealthIcon(data.systemHealth.socket)}
                </span>
                <Badge variant={data.systemHealth.socket === 'healthy' ? 'default' : 'destructive'}>
                  {data.systemHealth.socket}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span>File System</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={getHealthColor(data.systemHealth.fileSystem)}>
                  {getHealthIcon(data.systemHealth.fileSystem)}
                </span>
                <Badge variant={data.systemHealth.fileSystem === 'healthy' ? 'default' : 'destructive'}>
                  {data.systemHealth.fileSystem}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                <span>Memory</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={getHealthColor(data.systemHealth.memory)}>
                  {getHealthIcon(data.systemHealth.memory)}
                </span>
                <Badge variant={data.systemHealth.memory === 'healthy' ? 'default' : 'destructive'}>
                  {data.systemHealth.memory}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest system events and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'user' ? 'bg-blue-500' :
                    activity.type === 'message' ? 'bg-green-500' :
                    activity.type === 'system' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none mb-1">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {activity.severity && (
                    <Badge 
                      variant={
                        activity.severity === 'high' ? 'destructive' :
                        activity.severity === 'medium' ? 'secondary' :
                        'outline'
                      }
                      className="text-xs"
                    >
                      {activity.severity}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 