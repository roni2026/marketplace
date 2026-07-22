import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  completeOrder,
  notifyOrderParty,
  ORDER_SELECT,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  updateOrderStatus,
  type MarketplaceOrder,
} from '@/lib/orders';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import {
  Package,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';

function statusClass(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/20',
    confirmed: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20',
    meetup_set: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20',
    completed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    cancelled: 'bg-muted text-muted-foreground border-border',
    disputed: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20',
  };
  return map[status] || '';
}

export default function MyOrders() {
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'buying' | 'selling'>('buying');
  const [actionId, setActionId] = useState<string | null>(null);

  const [meetupOpen, setMeetupOpen] = useState(false);
  const [meetupOrder, setMeetupOrder] = useState<MarketplaceOrder | null>(null);
  const [meetupLocation, setMeetupLocation] = useState('');
  const [meetupAt, setMeetupAt] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelOrder, setCancelOrder] = useState<MarketplaceOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_orders')
        .select(ORDER_SELECT)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setOrders((data as MarketplaceOrder[]) || []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not load orders — apply marketplace_orders migration');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const buying = useMemo(() => orders.filter((o) => o.buyer_id === user?.id), [orders, user]);
  const selling = useMemo(() => orders.filter((o) => o.seller_id === user?.id), [orders, user]);

  const patchLocal = (id: string, next: Partial<MarketplaceOrder>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...next } : o)));
  };

  const confirmOrder = async (order: MarketplaceOrder) => {
    if (!user) return;
    setActionId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, { status: 'confirmed' });
      patchLocal(order.id, updated);
      const other = user.id === order.seller_id ? order.buyer_id : order.seller_id;
      await notifyOrderParty(other, 'Order confirmed', `Order ${order.order_number} is confirmed.`, order.id);
      toast.success('Order confirmed');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to confirm');
    } finally {
      setActionId(null);
    }
  };

  const saveMeetup = async () => {
    if (!meetupOrder || !user) return;
    if (!meetupLocation.trim()) {
      toast.error('Add a meetup place');
      return;
    }
    setActionId(meetupOrder.id);
    try {
      const updated = await updateOrderStatus(meetupOrder.id, {
        status: 'meetup_set',
        meetup_location: meetupLocation.trim(),
        meetup_at: meetupAt ? new Date(meetupAt).toISOString() : null,
      });
      patchLocal(meetupOrder.id, updated);
      const other = user.id === meetupOrder.seller_id ? meetupOrder.buyer_id : meetupOrder.seller_id;
      await notifyOrderParty(
        other,
        'Meetup set',
        `Meetup for ${meetupOrder.order_number}: ${meetupLocation.trim()}`,
        meetupOrder.id,
      );
      toast.success('Meetup saved');
      setMeetupOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save meetup');
    } finally {
      setActionId(null);
    }
  };

  const markComplete = async (order: MarketplaceOrder) => {
    if (!user) return;
    setActionId(order.id);
    try {
      const updated = await completeOrder(order, user.id);
      patchLocal(order.id, updated);
      toast.success('Deal marked complete');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to complete order');
    } finally {
      setActionId(null);
    }
  };

  const markPaidOffline = async (order: MarketplaceOrder) => {
    setActionId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, {
        payment_status: 'paid_outside',
        payment_method: 'cash_meetup',
      });
      patchLocal(order.id, updated);
      toast.success('Marked paid offline');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionId(null);
    }
  };

  const submitCancel = async () => {
    if (!cancelOrder || !user) return;
    setActionId(cancelOrder.id);
    try {
      const updated = await updateOrderStatus(cancelOrder.id, {
        status: 'cancelled',
        cancel_reason: cancelReason.trim() || 'Cancelled by user',
        cancelled_at: new Date().toISOString(),
      });
      patchLocal(cancelOrder.id, updated);
      const other = user.id === cancelOrder.seller_id ? cancelOrder.buyer_id : cancelOrder.seller_id;
      await notifyOrderParty(other, 'Order cancelled', `Order ${cancelOrder.order_number} was cancelled.`, cancelOrder.id);
      toast.success('Order cancelled');
      setCancelOpen(false);
      setCancelReason('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setActionId(null);
    }
  };

  const openDispute = async (order: MarketplaceOrder) => {
    if (!user) return;
    setActionId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, { status: 'disputed' });
      patchLocal(order.id, updated);
      await notifyOrderParty(
        order.seller_id === user.id ? order.buyer_id : order.seller_id,
        'Order disputed',
        `Order ${order.order_number} was marked disputed.`,
        order.id,
      );
      toast.message('Marked disputed — open a support ticket if you need help.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionId(null);
    }
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const OrderCard = ({ order }: { order: MarketplaceOrder }) => {
    const isSeller = order.seller_id === user?.id;
    const role = isSeller ? 'Selling' : 'Buying';
    const busy = actionId === order.id;
    const active = !['completed', 'cancelled'].includes(order.status);
    const img = order.ads?.ad_images?.[0]?.image_url;

    return (
      <Card className="shadow-none overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {img ? (
              <Link to={order.ads?.slug ? `/ad/${order.ads.slug}` : '#'} className="shrink-0">
                <img src={img} alt="" className="w-full sm:w-24 h-24 rounded-lg object-cover bg-muted" />
              </Link>
            ) : (
              <div className="w-full sm:w-24 h-24 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-mono">{order.order_number}</p>
                  <Link
                    to={order.ads?.slug ? `/ad/${order.ads.slug}` : '#'}
                    className="font-medium text-sm hover:text-primary line-clamp-1"
                  >
                    {order.ads?.title || 'Listing'}
                  </Link>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className={`font-normal ${statusClass(order.status)}`}>
                    {ORDER_STATUS_LABEL[order.status] || order.status}
                  </Badge>
                  <Badge variant="secondary" className="font-normal">
                    {PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    {role}
                  </Badge>
                </div>
              </div>

              <p className="text-lg font-semibold tabular-nums">
                ৳{Number(order.amount).toLocaleString('en-BD')}
              </p>

              {order.meetup_location && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    {order.meetup_location}
                    {order.meetup_at && (
                      <> · {format(new Date(order.meetup_at), 'MMM d, yyyy h:mm a')}</>
                    )}
                  </span>
                </p>
              )}

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </p>

              {active && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {order.status === 'pending' && isSeller && (
                    <Button size="sm" disabled={busy} onClick={() => confirmOrder(order)}>
                      Confirm deal
                    </Button>
                  )}
                  {['pending', 'confirmed', 'meetup_set'].includes(order.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setMeetupOrder(order);
                        setMeetupLocation(order.meetup_location || '');
                        setMeetupAt(
                          order.meetup_at
                            ? format(new Date(order.meetup_at), "yyyy-MM-dd'T'HH:mm")
                            : '',
                        );
                        setMeetupOpen(true);
                      }}
                    >
                      Set meetup
                    </Button>
                  )}
                  {order.payment_status === 'unpaid' &&
                    ['confirmed', 'meetup_set'].includes(order.status) && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => markPaidOffline(order)}>
                        Paid offline
                      </Button>
                    )}
                  {['confirmed', 'meetup_set'].includes(order.status) && (
                    <Button
                      size="sm"
                      disabled={busy}
                      className="gap-1"
                      onClick={() => markComplete(order)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Complete
                    </Button>
                  )}
                  {active && order.status !== 'disputed' && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          setCancelOrder(order);
                          setCancelOpen(true);
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => openDispute(order)}>
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                        Dispute
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/messages">
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      Message
                    </Link>
                  </Button>
                </div>
              )}

              {order.status === 'disputed' && (
                <Button size="sm" variant="outline" asChild className="mt-1">
                  <Link to="/my/support">Open support ticket</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const list = tab === 'buying' ? buying : selling;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>My orders — BazarBD</title>
      </Helmet>
      <Header />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-6 md:py-8 pb-24 lg:pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
            <p className="text-sm text-muted-foreground">
              Deals after an offer is accepted — confirm, meet, complete.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/my/offers">Offers</Link>
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'buying' | 'selling')}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="buying" className="flex-1">
              Buying ({buying.length})
            </TabsTrigger>
            <TabsTrigger value="selling" className="flex-1">
              Selling ({selling.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
            ) : list.length === 0 ? (
              <Card className="shadow-none border-dashed">
                <CardContent className="py-12 text-center">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium mb-1">No orders yet</p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    When a seller accepts an offer, a deal appears here so you can set meetup and complete it.
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/my/offers">View offers</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              list.map((o) => <OrderCard key={o.id} order={o} />)
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={meetupOpen} onOpenChange={setMeetupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set meetup</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Place</Label>
              <Input
                value={meetupLocation}
                onChange={(e) => setMeetupLocation(e.target.value)}
                placeholder="e.g. Gulshan 1 police box, café name…"
              />
            </div>
            <div className="space-y-2">
              <Label>When (optional)</Label>
              <Input
                type="datetime-local"
                value={meetupAt}
                onChange={(e) => setMeetupAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMeetupOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveMeetup} disabled={!!actionId}>
              Save meetup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Why is this deal off?"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep order
            </Button>
            <Button variant="destructive" onClick={submitCancel} disabled={!!actionId}>
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
      <MobileNav />
    </div>
  );
}
