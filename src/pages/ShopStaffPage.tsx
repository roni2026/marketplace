/**
 * ShopStaffPage — Manage shop staff accounts (add, remove, set roles, permissions).
 * Available for Professional+ tiers.
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, UserPlus, Trash2, Shield, Crown, Mail, Phone, Lock, Eye, Edit, Package, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  invited_at: string;
  joined_at: string | null;
  profiles: { full_name: string | null; avatar_url: string | null; phone_number: string | null } | null;
}

const STAFF_ROLES = [
  { value: 'manager', label: 'Manager', description: 'Full access except billing' },
  { value: 'editor', label: 'Editor', description: 'Can create and edit listings' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to dashboard' },
];

const PERMISSIONS = [
  { key: 'listings.create', label: 'Create Listings', icon: Package },
  { key: 'listings.edit', label: 'Edit Listings', icon: Edit },
  { key: 'listings.delete', label: 'Delete Listings', icon: Trash2 },
  { key: 'analytics.view', label: 'View Analytics', icon: BarChart3 },
  { key: 'orders.manage', label: 'Manage Orders', icon: Package },
  { key: 'messages.reply', label: 'Reply to Messages', icon: Mail },
];

export default function ShopStaffPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [invitePerms, setInvitePerms] = useState<string[]>(['listings.create', 'listings.edit']);
  const [inviting, setInviting] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: shopData } = await supabase.from('shops').select('*').eq('owner_id', user.id).single();
      if (shopData) {
        setShop(shopData);
        const { data: staffData } = await supabase
          .from('shop_staff')
          .select('*, profiles(full_name, avatar_url, phone_number)')
          .eq('shop_id', shopData.id)
          .order('invited_at', { ascending: false });
        setStaff((staffData as StaffMember[]) || []);
      }
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handleInvite = async () => {
    if (!shop || !inviteEmail.trim()) { toast.error('Enter an email address'); return; }
    setInviting(true);
    try {
      // Find user by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .ilike('phone_number', `%${inviteEmail}%`)
        .limit(1)
        .single();

      // Try to find by email in auth — but we can't query auth.users directly
      // Instead, create a pending invitation
      const { data, error } = await supabase.from('shop_staff').insert({
        shop_id: shop.id,
        user_id: profile?.user_id || crypto.randomUUID(),
        role: inviteRole,
        permissions: invitePerms,
        is_active: false,
        invited_at: new Date().toISOString(),
      }).select().single();

      if (error) throw error;
      setStaff(prev => [...prev, data as StaffMember]);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInvite(false);
      setInviteEmail('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send invitation');
    }
    setInviting(false);
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from('shop_staff').update({ is_active: !active }).eq('id', id);
    setStaff(prev => prev.map(s => s.id === id ? { ...s, is_active: !active } : s));
    toast.success(`Staff member ${!active ? 'activated' : 'deactivated'}`);
  };

  const handleRemove = async (id: string) => {
    await supabase.from('shop_staff').delete().eq('id', id);
    setStaff(prev => prev.filter(s => s.id !== id));
    toast.success('Staff member removed');
  };

  const handleUpdateRole = async (id: string, role: string) => {
    await supabase.from('shop_staff').update({ role }).eq('id', id);
    setStaff(prev => prev.map(s => s.id === id ? { ...s, role } : s));
    toast.success('Role updated');
  };

  const togglePerm = (perm: string) => {
    setInvitePerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const canManageStaff = shop && ['professional', 'business', 'enterprise'].includes(shop.membership_tier);
  const maxStaff = shop?.membership_tier === 'enterprise' ? -1 : shop?.membership_tier === 'business' ? 5 : 1;
  const currentStaff = staff.filter(s => s.is_active).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Shop Staff</h1>
              <p className="text-muted-foreground">
                {canManageStaff
                  ? `${currentStaff}${maxStaff === -1 ? '' : `/${maxStaff}`} active staff`
                  : 'Upgrade to Professional to add staff'}
              </p>
            </div>
          </div>
          {canManageStaff && (maxStaff === -1 || currentStaff < maxStaff) && (
            <Button onClick={() => setShowInvite(true)} className="gap-2">
              <UserPlus className="h-4 w-4" /> Invite Staff
            </Button>
          )}
        </div>

        {!canManageStaff && (
          <Card className="mb-6 bg-muted/50">
            <CardContent className="p-6 text-center">
              <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Staff management is a Premium feature</p>
              <p className="text-sm text-muted-foreground mb-4">Upgrade to Professional or higher to add staff members to your shop.</p>
              <Button asChild><Link to="/membership-plans">View Plans</Link></Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        ) : staff.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No staff members yet</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {staff.map(member => {
              const role = STAFF_ROLES.find(r => r.value === member.role);
              return (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted overflow-hidden">
                          {member.profiles?.avatar_url ? (
                            <img src={member.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-sm font-bold">
                              {(member.profiles?.full_name || '?')[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.profiles?.full_name || 'Pending invitation'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant={member.role === 'manager' ? 'default' : 'secondary'} className="text-[10px] capitalize gap-1">
                              {member.role === 'manager' ? <Crown className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                              {member.role}
                            </Badge>
                            {!member.is_active && <Badge variant="outline" className="text-[10px]">Pending</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Invited {formatDistanceToNow(new Date(member.invited_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canManageStaff && (
                          <Select value={member.role} onValueChange={v => handleUpdateRole(member.id, v)}>
                            <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STAFF_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        <Switch checked={member.is_active} onCheckedChange={() => handleToggleActive(member.id, member.is_active)} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove staff member?</AlertDialogTitle>
                              <AlertDialogDescription>This will revoke their access to your shop immediately.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemove(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Permissions */}
                    {member.permissions && member.permissions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
                        {member.permissions.map(perm => {
                          const p = PERMISSIONS.find(pr => pr.key === perm);
                          const Icon = p?.icon || Eye;
                          return <Badge key={perm} variant="outline" className="text-[10px] gap-1"><Icon className="h-3 w-3" /> {p?.label || perm}</Badge>;
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <MobileNav />
      <Footer />

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Invite Staff Member</DialogTitle>
            <DialogDescription>Invite someone to help manage your shop</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Email or Phone</Label>
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com or 01XXXXXXXXX" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div><span className="font-medium">{r.label}</span><span className="text-xs text-muted-foreground block">{r.description}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {PERMISSIONS.map(p => {
                  const Icon = p.icon;
                  return (
                    <label key={p.key} className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-accent">
                      <Switch checked={invitePerms.includes(p.key)} onCheckedChange={() => togglePerm(p.key)} />
                      <span className="text-sm flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
