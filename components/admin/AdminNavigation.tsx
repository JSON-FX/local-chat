'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiService } from '@/lib/api';
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
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className={`h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} flex flex-col`} style={{ background: 'linear-gradient(180deg, oklch(0.205 0.03 265), oklch(0.18 0.03 268))' }}>
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-[var(--gradient-from)]" />
                <span className="font-bold text-lg text-white">Admin Panel</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto text-white/60 hover:text-white hover:bg-white/10"
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
                      transition-all duration-200
                      ${active ? 'bg-[oklch(0.59_0.16_255_/_20%)] text-white border-l-[3px] border-l-[oklch(0.59_0.16_255)]' : 'text-white/60 hover:text-white hover:bg-white/5'}
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
                        absolute left-full ml-2 px-2 py-1 bg-[oklch(0.25_0.035_260)] text-white
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
            <div className="border-t border-white/10" />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">System Status</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">Healthy</span>
                </div>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/50">CPU</span>
                  <span className="font-medium text-white/80">23%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Memory</span>
                  <span className="font-medium text-white/80">67%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Storage</span>
                  <span className="font-medium text-white/80">45%</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="border-t border-white/10" />
        <div className="p-4">
          <Button
            variant="ghost"
            size="sm"
            className={`w-full text-white/60 hover:text-white hover:bg-white/10 ${collapsed ? 'px-0' : ''}`}
            onClick={async () => {
              try {
                await apiService.logout();
                router.push('/');
              } catch (error) {
                console.error('Logout error:', error);
              }
            }}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
    </div>
  );
} 