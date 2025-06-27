'use client';

import { useState } from 'react';
import { X, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BetaNoticeProps {
  variant?: 'warning' | 'info';
  dismissible?: boolean;
  className?: string;
  persistent?: boolean; // If true, shows on every session
}

export function BetaNotice({ 
  variant = 'warning', 
  dismissible = true, 
  className,
  persistent = false 
}: BetaNoticeProps) {
  const [isVisible, setIsVisible] = useState(() => {
    // Check if user has dismissed this notice (unless persistent)
    if (typeof window !== 'undefined' && !persistent) {
      return !localStorage.getItem('beta-notice-dismissed');
    }
    return true;
  });

  const handleDismiss = () => {
    if (!persistent) {
      localStorage.setItem('beta-notice-dismissed', 'true');
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const Icon = variant === 'warning' ? AlertTriangle : Info;
  const variantStyles = variant === 'warning' 
    ? 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200'
    : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200';

  return (
    <div className={cn(
      'border-b px-4 py-3 flex items-center gap-3 text-sm',
      variantStyles,
      className
    )}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <Badge variant="outline" className="text-xs font-semibold">
        BETA
      </Badge>
      <div className="flex-1">
        <span className="font-medium">This is a beta version. </span>
        <span>Your messages and files may be removed during major updates. Please backup important data.</span>
      </div>
      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-auto p-1 hover:bg-transparent"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
} 