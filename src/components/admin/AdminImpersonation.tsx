/**
 * AdminImpersonation — Lets super_admins "log in as" a user to debug issues.
 * Shows a banner when impersonating. All actions logged to admin_impersonation_logs.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserCog, LogOut, Search, AlertTriangle, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ImpersonationLog {
  id: string;
  admin_id: string;
  target_user_id: string;
  started_at: string;
  ended_at: string | null;
  reason: string | null;
}

export function AdminImpersonation() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  const [logs, setLogs] = useState<ImpersonationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data } = await supabase
        .from('admin_impersonation_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      setLogs((data as ImpersonationLog[]) || []);
    } catch {}
    setLoadingLogs(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone_number, avatar_url, is_verified, is_suspended')
        .or(`full_name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`)
        .limit(10);
      setSearchResults(data || []);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handleImpersonate = async () => {
    if (!selectedUser || !user) return;
    if (!reason.trim()) { toast.error('Please provide a reason for impersonation'); return; }

    setImpersonating(true);
    try {
      // Log the impersonation
      await supabase.from('admin_impersonation_logs').insert({
        admin_id: user.id,
        target_user_id: selectedUser.user_id,
        reason: reason.trim(),
        started_at: new Date().toISOString(),
      });

      // Store impersonation state in session storage
      sessionStorage.setItem('impersonating_admin_id', user.id);
      sessionStorage.setItem('impersonating_target_id', selectedUser.user_id);
      sessionStorage.setItem('impersonating_reason', reason.trim());

      toast.success(`Now impersonating ${selectedUser.full_name || 'user'}. Reloading...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to impersonate');
    }
    setImpersonating(false);
  };

  const handleEndImpersonation = async () => {
    const adminId = sessionStorage.getItem('impersonating_admin_id');
    const targetId = sessionStorage.getItem('impersonating_target_id');
    if (!adminId || !targetId) return;

    try {
      await supabase.from('admin_impersonation_logs')
        .update({ ended_at: new Date().toISOString() })
        .eq('admin_id', adminId)
        .eq('target_user_id', targetId)
        .is('ended_at', null);

      sessionStorage.removeItem('impersonating_admin_id');
      sessionStorage.removeItem('impersonating_target_id');
      sessionStorage.removeItem('impersonating_reason');

      toast.success('Ended impersonation. Reloading...');
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error('Failed to end impersonation');
    }
  };

  const isImpersonating = !!sessionStorage.getItem('impersonating_admin_id');

  return (
    <div className="space-y-6">
      {isImpersonating && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium text-sm">You are impersonating a user</p>
                <p className="text-xs text-muted-foreground">All actions are being logged. Click "Exit" to return to your admin account.</p>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={handleEndImpersonation} className="gap-2">
              <LogOut className="h-4 w-4" /> Exit Impersonation
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" /> User Impersonation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or phone..."
                className="pl-8"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>Search</Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map(u => (
                <div key={u.user_id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : (
                        <div className="h-full w-full flex items-center justify-center text-sm font-bold">{(u.full_name || '?')[0]}</div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.full_name || 'Unknown'}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{u.phone_number || 'No phone'}</p>
                        {u.is_verified && <Badge variant="default" className="text-[10px] h-4">Verified</Badge>}
                        {u.is_suspended && <Badge variant="destructive" className="text-[10px] h-4">Suspended</Badge>}
                      </div>
                    </div>
                  </div>
                  <Dialog open={dialogOpen && selectedUser?.user_id === u.user_id} onOpenChange={(v) => { setDialogOpen(v); if (!v) setSelectedUser(null); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedUser(u); setDialogOpen(true); }}>
                        <UserCog className="h-4 w-4" /> Impersonate
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Impersonate {u.full_name}?</DialogTitle>
                        <DialogDescription>
                          You will be logged in as this user. All actions will be logged with your admin ID.
                          You can exit at any time by clicking the banner at the top.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Label>Reason (required)</Label>
                        <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Debugging missing listings issue" />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { setDialogOpen(false); setSelectedUser(null); }}>Cancel</Button>
                        <Button onClick={handleImpersonate} disabled={impersonating || !reason.trim()}>
                          {impersonating ? 'Starting...' : 'Start Impersonation'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Impersonation History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Recent Impersonation Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No impersonation logs</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                  <div>
                    <p className="font-medium">Target: {log.target_user_id.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground">{log.reason || 'No reason provided'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}</p>
                    <Badge variant={log.ended_at ? 'secondary' : 'default'} className="text-[10px] mt-1">
                      {log.ended_at ? 'Ended' : 'Active'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
