/**
 * FeatureFlagsPage — Admin page to toggle features on/off globally or per-user.
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { toast } from 'sonner';
import { Flag, Plus, Trash2, Globe, User, ToggleLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number | null;
  target_user_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_FLAGS = [
  { key: 'bundle_offers', description: 'Allow buyers to make combined bundle offers' },
  { key: 'push_notifications', description: 'Browser push notifications' },
  { key: 'price_negotiation_chat', description: 'Multi-round price negotiation in offers' },
  { key: 'watchlist_auto_expiry', description: 'Auto-expire favorites after 30 days' },
  { key: 'qr_code_sharing', description: 'QR code generation for listings' },
  { key: 'listing_quality_score', description: 'Show quality score on listings' },
  { key: 'dispute_resolution', description: 'Enable dispute resolution center' },
  { key: 'verification_badges', description: 'Show verification badges on profiles' },
];

export default function FeatureFlagsPage() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFlagKey, setNewFlagKey] = useState('');
  const [newFlagDesc, setNewFlagDesc] = useState('');

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('feature_flags').select('*').order('key');
      setFlags((data as FeatureFlag[]) || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadFlags(); }, [loadFlags]);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await supabase.from('feature_flags').update({ is_enabled: !enabled }).eq('id', id);
      setFlags(prev => prev.map(f => f.id === id ? { ...f, is_enabled: !enabled } : f));
      toast.success(`Feature ${!enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to toggle feature');
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('feature_flags').delete().eq('id', id);
    setFlags(prev => prev.filter(f => f.id !== id));
    toast.success('Feature flag deleted');
  };

  const handleAdd = async () => {
    if (!newFlagKey.trim()) return;
    try {
      const { data, error } = await supabase.from('feature_flags').insert({
        key: newFlagKey.trim(),
        description: newFlagDesc.trim() || null,
        is_enabled: false,
      }).select().single();
      if (error) throw error;
      setFlags(prev => [...prev, data as FeatureFlag]);
      setNewFlagKey(''); setNewFlagDesc('');
      toast.success('Feature flag created');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create flag');
    }
  };

  const handleSeedDefaults = async () => {
    let count = 0;
    for (const df of DEFAULT_FLAGS) {
      const exists = flags.find(f => f.key === df.key);
      if (!exists) {
        try {
          const { data } = await supabase.from('feature_flags').insert({
            key: df.key,
            description: df.description,
            is_enabled: false,
          }).select().single();
          if (data) { setFlags(prev => [...prev, data as FeatureFlag]); count++; }
        } catch {}
      }
    }
    toast.success(count > 0 ? `Seeded ${count} default flags` : 'All default flags already exist');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Flag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Feature Flags</h1>
            <p className="text-muted-foreground">Toggle features on/off globally or per-user</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : flags.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <ToggleLeft className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No feature flags configured</p>
                  <Button onClick={handleSeedDefaults} className="gap-2"><Plus className="h-4 w-4" /> Seed Default Flags</Button>
                </CardContent>
              </Card>
            ) : (
              flags.map(flag => (
                <Card key={flag.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${flag.is_enabled ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                        <Flag className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm font-mono">{flag.key}</p>
                          <Badge variant={flag.is_enabled ? 'default' : 'secondary'} className="text-[10px]">
                            {flag.is_enabled ? 'ON' : 'OFF'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{flag.description || 'No description'}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Updated {formatDistanceToNow(new Date(flag.updated_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={flag.is_enabled} onCheckedChange={() => handleToggle(flag.id, flag.is_enabled)} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(flag.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Add new flag */}
          <div>
            <Card>
              <CardHeader><CardTitle className="text-base">Add Feature Flag</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Flag Key</Label>
                  <Input value={newFlagKey} onChange={e => setNewFlagKey(e.target.value)} placeholder="e.g. new_checkout_flow" className="font-mono" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={newFlagDesc} onChange={e => setNewFlagDesc(e.target.value)} placeholder="What does this feature do?" />
                </div>
                <Button onClick={handleAdd} disabled={!newFlagKey.trim()} className="w-full gap-2">
                  <Plus className="h-4 w-4" /> Add Flag
                </Button>
                <Separator />
                <Button onClick={handleSeedDefaults} variant="outline" className="w-full gap-2">
                  <Globe className="h-4 w-4" /> Seed Defaults
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
