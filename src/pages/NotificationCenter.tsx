/**
 * NotificationCenter — Enterprise notification center with tabs, filters,
 * bulk actions, infinite scroll, real-time updates, and compact UI.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, CheckCheck, Archive, Trash2, Pin, Search, Inbox,
  CheckCircle2, Star, AlertTriangle, MessageSquare, Tag,
  Package, ShoppingCart, DollarSign, Truck, User, Heart,
  Search as SearchIcon, Globe, Shield, Gift, FileText,
  MoreHorizontal, ChevronDown, X,
} from 'lucide-react';
import {
  formatNotificationTime, getNotificationIcon, getCategoryColor,
  type Notification, type NotificationCategory,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const TABS = [
  { key: 'all', label: 'All', icon: Bell },
  { key: 'unread', label: 'Unread', icon: Inbox },
  { key: 'read', label: 'Read', icon: CheckCheck },
  { key: 'archived', label: 'Archived', icon: Archive },
  { key: 'important', label: 'Important', icon: Star },
  { key: 'account', label: 'Account', icon: User },
  { key: 'listings', label: 'Listings', icon: Package },
  { key: 'offers', label: 'Offers', icon: Tag },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'saved_searches', label: 'Saved Searches', icon: SearchIcon },
  { key: 'wishlist', label: 'Wishlist', icon: Heart },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'orders', label: 'Orders', icon: ShoppingCart },
  { key: 'payments', label: 'Payments', icon: DollarSign },
  { key: 'delivery', label: 'Delivery', icon: Truck },
  { key: 'system', label: 'System', icon: Globe },
] as const;

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  'user-plus': User, 'badge-check': CheckCircle2, 'lock': Shield, 'smartphone': Bell,
  'ban': X, 'check-circle': CheckCircle2, 'x-circle': X, 'package': Package,
  'edit': FileText, 'clock': AlertTriangle, 'refresh-cw': CheckCircle2,
  'shopping-bag': ShoppingCart, 'trash-2': Trash2, 'flag': AlertTriangle,
  'zap': Zap, 'star': Star, 'tag': Tag, 'x': X, 'message-square': MessageSquare,
  'image': Package, 'mic': MessageSquare, 'file': FileText, 'at-sign': MessageSquare,
  'check-check': CheckCheck, 'archive': Archive, 'search': SearchIcon,
  'dollar-sign': DollarSign, 'folder': Package, 'map-pin': Globe,
  'trending-down': Tag, 'shopping-cart': ShoppingCart, 'truck': Truck,
  'rotate-ccw': CheckCircle2, 'wrench': Globe, 'gift': Gift, 'bell': Bell,
};

function Zap({ className }: { className?: string }) {
  return <Star className={className} />;
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const {
    notifications, unreadCount, loading, hasMore,
    fetchNotifications, markAsRead, markAllAsRead,
    archiveNotification, deleteNotification, pinNotification, trackClick,
    loadMore,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications(activeTab);
    setSelectedIds(new Set());
  }, [activeTab, fetchNotifications]);

  const filteredNotifications = useMemo(() => {
    if (!searchQuery) return notifications;
    const q = searchQuery.toLowerCase();
    return notifications.filter(n =>
      n.title.toLowerCase().includes(q) ||
      (n.body?.toLowerCase().includes(q) ?? false)
    );
  }, [notifications, searchQuery]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const bottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    if (bottom && hasMore && !loading) {
      loadMore(activeTab);
    }
  }, [hasMore, loading, loadMore, activeTab]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    }
  }, [selectedIds, filteredNotifications]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkMarkRead = useCallback(async () => {
    for (const id of selectedIds) {
      await markAsRead(id);
    }
    setSelectedIds(new Set());
  }, [selectedIds, markAsRead]);

  const handleBulkArchive = useCallback(async () => {
    for (const id of selectedIds) {
      await archiveNotification(id);
    }
    setSelectedIds(new Set());
  }, [selectedIds, archiveNotification]);

  const handleBulkDelete = useCallback(async () => {
    for (const id of selectedIds) {
      await deleteNotification(id);
    }
    setSelectedIds(new Set());
  }, [selectedIds, deleteNotification]);

  const handleNotificationClick = useCallback((notif: Notification) => {
    if (!notif.is_read) markAsRead(notif.id);
    trackClick(notif.id);
  }, [markAsRead, trackClick]);

  const allSelected = filteredNotifications.length > 0 && selectedIds.size === filteredNotifications.length;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => markAllAsRead(activeTab)}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
            <Link to="/notifications/preferences">
              <Button variant="ghost" size="sm" className="h-7 text-xs">Preferences</Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="h-8 pl-8 pr-3 text-xs"
          />
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto -mx-1 px-1">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-7 gap-0.5">
              {TABS.map(tab => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="h-6 px-2.5 text-[11px] gap-1"
                >
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex-shrink-0 flex items-center justify-between border-b border-primary/20 bg-primary/5 px-4 py-1.5">
          <span className="text-xs font-medium text-primary">{selectedIds.size} selected</span>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs" onClick={handleBulkMarkRead}>
              <CheckCheck className="h-3 w-3" /> Read
            </Button>
            <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs" onClick={handleBulkArchive}>
              <Archive className="h-3 w-3" /> Archive
            </Button>
            <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs text-red-600" onClick={handleBulkDelete}>
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSelectedIds(new Set())}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Notifications list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {loading && notifications.length === 0 ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox className="h-12 w-12 opacity-30 mb-3" />
            <p className="text-sm">No notifications</p>
            <p className="text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Select all header */}
            {filteredNotifications.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30">
                <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} aria-label="Select all" />
                <span className="text-[11px] text-muted-foreground">
                  {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {filteredNotifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                isSelected={selectedIds.has(notif.id)}
                onSelect={() => handleSelectOne(notif.id)}
                onClick={() => handleNotificationClick(notif)}
                onArchive={() => archiveNotification(notif.id)}
                onDelete={() => deleteNotification(notif.id)}
                onPin={() => pinNotification(notif.id, !notif.is_pinned)}
              />
            ))}
            {loading && notifications.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            )}
            {!loading && !hasMore && filteredNotifications.length > 0 && (
              <div className="py-4 text-center text-[11px] text-muted-foreground">
                No more notifications
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Notification Item Component ----

interface NotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onPin: () => void;
}

function NotificationItem({
  notification: n, isSelected, onSelect, onClick, onArchive, onDelete, onPin,
}: NotificationItemProps) {
  const colors = getCategoryColor(n.category);
  const iconName = n.icon || getNotificationIcon(n.notification_type);
  const IconComp = ICON_COMPONENTS[iconName] || Bell;

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 px-3 py-2.5 transition-colors cursor-pointer hover:bg-accent/30',
        !n.is_read && 'bg-primary/5',
        n.is_pinned && 'border-l-2 border-l-primary',
      )}
      onClick={onClick}
    >
      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onSelect} aria-label="Select" />
      </div>

      {/* Icon */}
      <div className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full', colors.bg)}>
        <IconComp className={cn('h-3.5 w-3.5', colors.text)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {n.is_pinned && <Pin className="h-2.5 w-2.5 text-primary flex-shrink-0" />}
          {n.is_important && <Star className="h-2.5 w-2.5 text-amber-500 flex-shrink-0 fill-amber-500" />}
          {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
          <p className={cn('text-xs truncate', !n.is_read ? 'font-semibold' : 'font-medium')}>
            {n.title}
          </p>
        </div>
        {n.body && (
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {formatNotificationTime(n.created_at)}
          </span>
          {n.action_url && n.action_label && (
            <Link
              to={n.action_url}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-primary hover:underline"
            >
              {n.action_label}
            </Link>
          )}
        </div>
      </div>

      {/* Actions dropdown */}
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            {!n.is_read && (
              <DropdownMenuItem className="text-xs" onClick={onClick}>
                <CheckCheck className="mr-2 h-3 w-3" /> Mark as read
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-xs" onClick={onPin}>
              <Pin className="mr-2 h-3 w-3" /> {n.is_pinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" onClick={onArchive}>
              <Archive className="mr-2 h-3 w-3" /> Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-red-600" onClick={onDelete}>
              <Trash2 className="mr-2 h-3 w-3" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
