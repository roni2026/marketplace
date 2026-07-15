/**
 * BillingHistoryPage — Shows membership payment history, invoices, and subscription status.
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CreditCard, Download, Receipt, Calendar, CheckCircle, XCircle, Clock, AlertCircle, Crown, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Membership {
  id: string;
  tier: string;
  status: string;
  billing_cycle: string;
  amount: number;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  status: string;
  created_at: string;
  description: string | null;
}

export default function BillingHistoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMembership, setActiveMembership] = useState<Membership | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [m, t] = await Promise.all([
        supabase.from('shop_memberships').select('*').eq('shop_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('transactions').select('*').or(`user_id.eq.${user.id},seller_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(20),
      ]);

      // Also try by shop owner
      if (m.error || !m.data) {
        const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single();
        if (shop) {
          const { data: m2 } = await supabase.from('shop_memberships').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false });
          setMemberships((m2 as Membership[]) || []);
        }
      } else {
        setMemberships((m.data as Membership[]) || []);
      }

      setTransactions((t.data as Transaction[]) || []);

      const active = (memberships || []).find(m => m.status === 'active');
      setActiveMembership(active || null);
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handleToggleAutoRenew = async () => {
    if (!activeMembership) return;
    try {
      await supabase.from('shop_memberships').update({ auto_renew: !activeMembership.auto_renew }).eq('id', activeMembership.id);
      setActiveMembership({ ...activeMembership, auto_renew: !activeMembership.auto_renew });
      toast.success(`Auto-renew ${!activeMembership.auto_renew ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update auto-renew');
    }
  };

  const handleCancel = async () => {
    if (!activeMembership) return;
    try {
      await supabase.from('shop_memberships').update({
        status: 'cancelled',
        expires_at: new Date().toISOString(),
      }).eq('id', activeMembership.id);
      setActiveMembership({ ...activeMembership, status: 'cancelled' });
      toast.success('Subscription cancelled. You will keep access until the end of your billing period.');
    } catch {
      toast.error('Failed to cancel subscription');
    }
  };

  const handleDownloadInvoice = (membership: Membership) => {
    // Generate a simple invoice as a downloadable text file
    const invoice = `
BazarBD — Membership Invoice
============================
Invoice ID: ${membership.id}
Date: ${format(new Date(membership.started_at), 'MMM d, yyyy')}

Plan: ${membership.tier} (${membership.billing_cycle})
Amount: ৳${membership.amount}
Status: ${membership.status}

Billed to: ${user?.email}
User ID: ${user?.id}

Thank you for being a BazarBD member!
`;
    const blob = new Blob([invoice], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice_${membership.id.slice(0, 8)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Invoice downloaded');
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: any; icon: any }> = {
      active: { variant: 'default', icon: CheckCircle },
      pending: { variant: 'secondary', icon: Clock },
      cancelled: { variant: 'destructive', icon: XCircle },
      expired: { variant: 'outline', icon: AlertCircle },
      completed: { variant: 'default', icon: CheckCircle },
      failed: { variant: 'destructive', icon: XCircle },
    };
    const cfg = map[status] || { variant: 'secondary', icon: Receipt };
    const Icon = cfg.icon;
    return <Badge variant={cfg.variant} className="gap-1 capitalize"><Icon className="h-3 w-3" /> {status}</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Billing & Subscription</h1>
            <p className="text-muted-foreground">Manage your membership and view payment history</p>
          </div>
        </div>

        {/* Active subscription card */}
        {loading ? (
          <Skeleton className="h-32 rounded-lg mb-6" />
        ) : activeMembership ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" /> Active Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="font-bold text-lg capitalize">{activeMembership.tier}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Billing</p>
                  <p className="font-medium capitalize">{activeMembership.billing_cycle}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-bold text-lg">৳{activeMembership.amount?.toLocaleString()}</p>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {statusBadge(activeMembership.status)}
                  {activeMembership.expires_at && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {activeMembership.status === 'cancelled' ? 'Expires' : 'Renews'} {formatDistanceToNow(new Date(activeMembership.expires_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {activeMembership.status === 'active' && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleToggleAutoRenew} className="gap-2">
                        <RefreshCw className={`h-3.5 w-3.5 ${activeMembership.auto_renew ? 'text-green-500' : ''}`} />
                        Auto-renew: {activeMembership.auto_renew ? 'ON' : 'OFF'}
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={handleCancel}>
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" asChild><Link to="/membership-plans">Change Plan</Link></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">No active subscription</p>
              <p className="text-sm text-muted-foreground mb-4">You're currently on the Free plan. Upgrade to unlock more features.</p>
              <Button asChild><Link to="/membership-plans">View Plans</Link></Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="history">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="history" className="flex-1 gap-2"><Receipt className="h-4 w-4" /> Payment History</TabsTrigger>
            <TabsTrigger value="transactions" className="flex-1 gap-2"><CreditCard className="h-4 w-4" /> Transactions</TabsTrigger>
          </TabsList>

          {/* Payment History */}
          <TabsContent value="history">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : memberships.length === 0 ? (
              <Card><CardContent className="p-8 text-center"><Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No payment history yet</p></CardContent></Card>
            ) : (
              <div className="space-y-2">
                {memberships.map(m => (
                  <Card key={m.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm capitalize">{m.tier} Plan</p>
                          {statusBadge(m.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ৳{m.amount?.toLocaleString()} · {m.billing_cycle} · {format(new Date(m.started_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDownloadInvoice(m)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Transactions */}
          <TabsContent value="transactions">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : transactions.length === 0 ? (
              <Card><CardContent className="p-8 text-center"><CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No transactions yet</p></CardContent></Card>
            ) : (
              <div className="space-y-2">
                {transactions.map(t => (
                  <Card key={t.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{t.description || t.transaction_type}</p>
                          {statusBadge(t.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ৳{t.amount?.toLocaleString()} · {format(new Date(t.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">{t.transaction_type}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
