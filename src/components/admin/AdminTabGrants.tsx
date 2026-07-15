import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface CatalogRow { permission_key: string; label: string; section: string; href: string; sort_order: number; }

/** Super-admin UI: grant/revoke individual /admin tabs for a limited admin. */
export function AdminTabGrants({ userId }: { userId: string }) {
  const { user, roles } = useAuth();
  const isSuper = (roles || []).includes('super_admin' as any);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, g] = await Promise.all([
        supabase.from('admin_tab_catalog').select('*').order('sort_order'),
        supabase.from('admin_tab_permissions').select('permission_key').eq('user_id', userId),
      ]);
      if (c.error) throw c.error;
      if (g.error) throw g.error;
      setCatalog((c.data as CatalogRow[]) || []);
      setGranted(new Set(((g.data as any[]) || []).map((r) => r.permission_key)));
    } catch (e: any) {
      toast.error(e?.message || 'Load tab grants failed (run schema 17)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  if (!isSuper) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Admin tab access</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Only super admins can assign limited admin tabs.</CardContent>
      </Card>
    );
  }

  const toggle = (key: string, on: boolean) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (on) next.add(key); else next.delete(key);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await supabase.from('admin_tab_permissions').delete().eq('user_id', userId);
      const rows = [...granted].map((permission_key) => ({
        user_id: userId,
        permission_key,
        granted_by: user?.id ?? null,
      }));
      if (rows.length) {
        const { error } = await supabase.from('admin_tab_permissions').insert(rows);
        if (error) throw error;
      }
      toast.success('Tab access saved — that admin will only see granted tabs');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const sections = catalog.reduce<Record<string, CatalogRow[]>>((acc, row) => {
    (acc[row.section] ||= []).push(row);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Limited admin — visible tabs</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Toggle which admin sidebar tabs this user can open. Super admins always see all.</p>
        </div>
        <Button size="sm" onClick={save} disabled={saving || loading}>Save tab access</Button>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-32 w-full" /> : (
          <div className="space-y-6">
            {Object.entries(sections).map(([section, rows]) => (
              <div key={section}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{section}</h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {rows.map((row) => (
                    <label key={row.permission_key} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                      <span className="truncate">{row.label}</span>
                      <Switch checked={granted.has(row.permission_key)} onCheckedChange={(v) => toggle(row.permission_key, v)} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {catalog.length === 0 && <p className="text-sm text-muted-foreground">No catalog rows — apply supabase/17_schema_v15_catalog_rbac_customer.sql</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
