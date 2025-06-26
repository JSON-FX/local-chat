'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Shield,
  AlertTriangle,
  Activity,
  Database,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'System overview and metrics'
  },
  {
    label: 'User Management',
    href: '/admin/users',
    icon: Users,
    description: 'Manage users and permissions'
  },
  {
    label: 'Message Oversight',
    href: '/admin/messages',
    icon: MessageSquare,
    description: 'Monitor and moderate messages'
  },
  {
    label: 'Audit Logs',
    href: '/admin/audit',
    icon: FileText,
    description: 'View system audit trail'
  },
  {
    label: 'System Metrics',
    href: '/admin/metrics',
    icon: BarChart3,
    description: 'Performance and analytics'
  },
  {
    label: 'System Health',
    href: '/admin/system',
    icon: Activity,
    description: 'Health monitoring'
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'System configuration'
  }
];

export function AdminNavigation() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <Card className={`h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <CardContent className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                <span className="font-bold text-lg">Admin Panel</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation Items */}
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`
                      group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
                      transition-all duration-200 hover:bg-accent hover:text-accent-foreground
                      ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}
                      ${collapsed ? 'justify-center' : ''}
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}

                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div className="
                        absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground
                        text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100
                        transition-opacity duration-200 pointer-events-none z-50
                        whitespace-nowrap
                      ">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* System Status */}
        {!collapsed && (
          <>
            <Separator />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">System Status</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 font-medium">Healthy</span>
                </div>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPU</span>
                  <span className="font-medium">23%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memory</span>
                  <span className="font-medium">67%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Storage</span>
                  <span className="font-medium">45%</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <Separator />
        <div className="p-4">
          <Button
            variant="ghost"
            size="sm"
            className={`w-full ${collapsed ? 'px-0' : ''}`}
            onClick={() => {
              // Handle logout
              console.log('Logout clicked');
            }}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 