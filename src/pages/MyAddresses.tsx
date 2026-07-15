import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link, Navigate } from 'react-router-dom';
import { Plus, Trash2, Home } from 'lucide-react';

interface Addr {
  id: string; label: string | null; full_name: string | null; phone: string | null;
  division: string | null; district: string | null; area: string | null;
  address_line: string; is_default: boolean;
}

export default function MyAddresses() {
  const { user, isLoading } = useAuth();
  const [rows, setRows] = useState<Addr[]>([]);
  const [form, setForm] = useState({ label: 'Home', full_name: '', phone: '', division: '', district: '', area: '', address_line: '', is_default: true });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('customer_addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data as Addr[]) || []);
  };

  useEffect(() => { if (user) load(); }, [user?.id]);

  if (!isLoading && !user) return <Navigate to="/auth" replace />;

  const save = async () => {
    if (!user || !form.address_line.trim()) return toast.error('Address line required');
    setSaving(true);
    try {
      if (form.is_default) {
        await supabase.from('customer_addresses').update({ is_default: false }).eq('user_id', user.id);
      }
      const { error } = await supabase.from('customer_addresses').insert({ ...form, user_id: user.id });
      if (error) throw error;
      toast.success('Address saved');
      setForm({ label: 'Home', full_name: '', phone: '', division: '', district: '', area: '', address_line: '', is_default: false });
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save (apply schema 17)');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('customer_addresses').delete().eq('id', id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My addresses</h1>
            <p className="text-sm text-muted-foreground">Saved delivery / meetup locations</p>
          </div>
          <Button variant="outline" asChild><Link to="/profile">Back to profile</Link></Button>
        </div>

        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Add address</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div><Label>Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
            <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Division</Label><Input value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} /></div>
            <div><Label>District</Label><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
            <div><Label>Area</Label><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Address line</Label><Input value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <Button onClick={save} disabled={saving}><Plus className="h-4 w-4 mr-1" /> Save address</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <Home className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">{r.label || 'Address'}{r.is_default ? ' · Default' : ''}</div>
                  <div className="text-sm text-muted-foreground">{r.full_name} {r.phone}</div>
                  <div className="text-sm">{r.address_line}</div>
                  <div className="text-xs text-muted-foreground">{[r.area, r.district, r.division].filter(Boolean).join(', ')}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No saved addresses yet.</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
