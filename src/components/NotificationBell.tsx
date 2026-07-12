/**
 * NotificationBell — Compact notification bell with dropdown preview,
 * unread badge, and real-time updates. Designed for the navbar.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell, CheckCheck, Inbox, MoreHorizontal, X,
} from 'lucide-react';
import {
  formatNotificationTime, getNotificationIcon, getCategoryColor,
  type Notification,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  'user-plus': Bell, 'badge-check': CheckCheck, 'lock': Bell, 'smartphone': Bell,
  'ban': X, 'check-circle': CheckCheck, 'x-circle': X, 'package': Bell,
  'edit': Bell, 'clock': Bell, 'refresh-cw': CheckCheck,
  'shopping-bag': Bell, 'trash-2': X, 'flag': Bell,
  'zap': Bell, 'star': Bell, 'tag': Bell, 'x': X, 'message-square': Bell,
  'image': Bell, 'mic': Bell, 'file': Bell, 'at-sign': Bell,
  'check-check': CheckCheck, 'archive': Bell, 'search': Bell,
  'dollar-sign': Bell, 'folder': Bell, 'map-pin': Bell,
  'trending-down': Bell, 'shopping-cart': Bell, 'truck': Bell,
  'rotate-ccw': Bell, 'wrench': Bell, 'gift': Bell, 'bell': Bell,
};

export function NotificationBell() {
  const {
    notifications, unreadCount, loading,
    fetchNotifications, markAsRead, markAllAsRead, deleteNotification,
  } = useNotifications();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && notifications.length === 0) {
      fetchNotifications('all', false);
    }
  }, [open, notifications.length, fetchNotifications]);

  const handleClick = useCallback((notif: Notification) => {
    if (!notif.is_read) markAsRead(notif.id);
  }, [markAsRead]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[9px] h-3.5 px-1">{unreadCount}</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-[10px]"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[320px]">
          {loading && notifications.length === 0 ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-2.5 w-3/4" />
                    <Skeleton className="h-2 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Inbox className="h-8 w-8 opacity-30 mb-2" />
              <p className="text-xs">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.slice(0, 10).map((notif) => {
                const colors = getCategoryColor(notif.category);
                const iconName = notif.icon || getNotificationIcon(notif.notification_type);
                const IconComp = ICON_MAP[iconName] || Bell;
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors',
                      !notif.is_read && 'bg-primary/5',
                    )}
                    onClick={() => handleClick(notif)}
                  >
                    <div className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full', colors.bg)}>
                      <IconComp className={cn('h-3 w-3', colors.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[11px] truncate', !notif.is_read ? 'font-semibold' : 'font-medium')}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-[10px] text-muted-foreground truncate">{notif.body}</p>
                      )}
                      <span className="text-[9px] text-muted-foreground">
                        {formatNotificationTime(notif.created_at)}
                      </span>
                    </div>
                    {!notif.is_read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-3 py-2">
          <Link to="/notifications" onClick={() => setOpen(false)}>
            <span className="text-[11px] text-primary hover:underline">View all</span>
          </Link>
          <Link to="/notifications/preferences" onClick={() => setOpen(false)}>
            <span className="text-[11px] text-muted-foreground hover:text-foreground">Preferences</span>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
