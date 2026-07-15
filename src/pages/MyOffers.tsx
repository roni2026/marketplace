import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link, Navigate } from 'react-router-dom';

export default function MyOffers() {
  const { user, isLoading } = useAuth();
  const [sent, setSent] = useState<any[]>([]);
  const [received, setReceived] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [s, r] = await Promise.all([
          supabase.from('offers').select('*, ads(title,slug)').eq('buyer_id', user.id).order('created_at', { ascending: false }),
          supabase.from('offers').select('*, ads(title,slug)').eq('seller_id', user.id).order('created_at', { ascending: false }),
        ]);
        // column names may vary — try alternate
        if (s.error) {
          const s2 = await supabase.from('offers').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
          setSent(s2.data || []);
        } else setSent(s.data || []);
        if (!r.error) setReceived(r.data || []);
      } catch (e: any) {
        toast.error(e?.message || 'Offers unavailable');
      }
    })();
  }, [user?.id]);

  if (!isLoading && !user) return <Navigate to="/auth" replace />;

  const OfferList = ({ rows, empty }: { rows: any[]; empty: string }) => (
    <div className="space-y-2">
      {rows.map((o) => (
        <Card key={o.id}>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">{o.ads?.title || o.ad_id || 'Offer'}</div>
              <div className="text-sm text-muted-foreground">৳{Number(o.amount ?? o.price ?? 0).toLocaleString()}</div>
            </div>
            <Badge variant="secondary">{o.status || 'pending'}</Badge>
          </CardContent>
        </Card>
      ))}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My offers</h1>
          <Button variant="outline" asChild><Link to="/profile">Profile</Link></Button>
        </div>
        <h2 className="font-semibold mb-2">Sent</h2>
        <OfferList rows={sent} empty="You have not made any offers yet." />
        <h2 className="font-semibold mt-8 mb-2">Received</h2>
        <OfferList rows={received} empty="No offers on your listings yet." />
      </main>
      <Footer />
    </div>
  );
}
