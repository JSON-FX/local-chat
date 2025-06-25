import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  className?: string;
  maxCount?: number;
  showZero?: boolean;
}

export function NotificationBadge({ 
  count, 
  className, 
  maxCount = 99, 
  showZero = false 
}: NotificationBadgeProps) {
  if (count <= 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <div
      className={cn(
        "absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center px-1 shadow-sm border-2 border-background z-20",
        className
      )}
    >
      {displayCount}
    </div>
  );
} 