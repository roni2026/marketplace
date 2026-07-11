import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, CheckCheck, Trash2, CheckCircle, XCircle, MessageCircle, Tag, AlertCircle, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  ad_approved: CheckCircle,
  ad_rejected: XCircle,
  new_message: MessageCircle,
  new_offer: Tag,
  offer_accepted: CheckCircle,
  offer_rejected: XCircle,
  ad_expiring: AlertCircle,
  report_update: Info,
  system: Info,
  ticket_update: Info,
};

export default function Notifications() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    toast.success('All notifications marked as read');
  };

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    toast.success('Notification deleted');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Notifications — BazarBD</title>
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-1">No notifications</h3>
              <p className="text-muted-foreground text-sm">
                You'll see updates about your ads, messages, and offers here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
              return (
                <Card
                  key={notification.id}
                  className={!notification.is_read ? 'border-primary/50 bg-primary/5' : ''}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      notification.is_read ? 'bg-muted' : 'bg-primary/10'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        notification.is_read ? 'text-muted-foreground' : 'text-primary'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`font-medium text-sm ${!notification.is_read ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleMarkRead(notification.id)}
                            >
                              <CheckCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
