import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { logUserAction } from '@/lib/audit';
import {
  AlertTriangle,
  Shield,
  Ban,
  Search,
  Fingerprint,
  Check,
  Trash2,
  Plus,
  Globe,
} from 'lucide-react';

interface FraudFlag {
  id: string;
  user_id: string;
  flag_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string | null;
  auto_generated: boolean;
  resolved: boolean;
  created_at: string;
}

interface ShadowBan {
  id: string;
  user_id: string;
  reason: string | null;
  created_at: string;
}

interface BlacklistItem {
  id: string;
  type: 'ip' | 'email' | 'phone';
  value: string;
  reason: string | null;
  created_at: string;
}

interface IPReputation {
  id: string;
  ip_address: string;
  reputation_score: number;
  is_vpn: boolean;
  is_proxy: boolean;
  is_blacklisted: boolean;
  country: string | null;
  isp: string | null;
  last_checked: string;
}

interface DeviceFingerprint {
  id: string;
  user_id: string;
  fingerprint_hash: string;
  ip_address: string | null;
  first_seen: string;
  last_seen: string;
}

export default function FraudDetection() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);
  const [shadowBans, setShadowBans] = useState<ShadowBan[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [ipReputation, setIpReputation] = useState<IPReputation | null>(null);
  const [deviceFingerprints, setDeviceFingerprints] = useState<DeviceFingerprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [ipSearch, setIpSearch] = useState('');
  const [deviceUserSearch, setDeviceUserSearch] = useState('');
  const [newBlacklistType, setNewBlacklistType] = useState<'ip' | 'email' | 'phone'>('ip');
  const [newBlacklistValue, setNewBlacklistValue] = useState('');
  const [newBlacklistReason, setNewBlacklistReason] = useState('');
  const [newShadowBanUser, setNewShadowBanUser] = useState('');
  const [newShadowBanReason, setNewShadowBanReason] = useState('');

  useEffect(() => {
    if (isAdmin === false) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchFraudFlags();
      fetchShadowBans();
      fetchBlacklist();
    }
  }, [isAdmin]);

  const fetchFraudFlags = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('fraud_flags')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      const { data } = await query;
      setFraudFlags(data as FraudFlag[] || []);
    } catch {
      toast.error('Failed to load fraud flags');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchFraudFlags();
    }
  }, [severityFilter, isAdmin]);

  const fetchShadowBans = async () => {
    const { data } = await supabase
      .from('shadow_bans')
      .select('*')
      .order('created_at', { ascending: false });
    setShadowBans(data as ShadowBan[] || []);
  };

  const fetchBlacklist = async () => {
    const { data } = await supabase
      .from('blacklisted_items')
      .select('*')
      .order('created_at', { ascending: false });
    setBlacklist(data as BlacklistItem[] || []);
  };

  const handleResolveFlag = async (flagId: string, userId: string) => {
    const { error } = await supabase
      .from('fraud_flags')
      .update({
        resolved: true,
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', flagId);

    if (error) {
      toast.error('Failed to resolve fraud flag');
      return;
    }

    await logUserAction('update', userId, { type: 'fraud_flag_resolved', flag_id: flagId });
    toast.success('Fraud flag resolved');
    fetchFraudFlags();
  };

  const handleAddShadowBan = async () => {
    if (!newShadowBanUser || !newShadowBanReason) {
      toast.error('User ID and reason are required');
      return;
    }

    const { error } = await supabase.from('shadow_bans').insert({
      user_id: newShadowBanUser,
      reason: newShadowBanReason,
      banned_by: user?.id,
    });

    if (error) {
      toast.error('Failed to shadow ban user');
      return;
    }

    await logUserAction('suspend', newShadowBanUser, { type: 'shadow_ban', reason: newShadowBanReason });
    toast.success('User shadow banned');
    setNewShadowBanUser('');
    setNewShadowBanReason('');
    fetchShadowBans();
  };

  const handleRemoveShadowBan = async (userId: string) => {
    const { error } = await supabase
      .from('shadow_bans')
      .delete()
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to remove shadow ban');
      return;
    }

    await logUserAction('unsuspend', userId, { type: 'shadow_ban_removed' });
    toast.success('Shadow ban removed');
    fetchShadowBans();
  };

  const handleAddBlacklist = async () => {
    if (!newBlacklistValue) {
      toast.error('Value is required');
      return;
    }

    const { error } = await supabase.from('blacklisted_items').insert({
      type: newBlacklistType,
      value: newBlacklistValue,
      reason: newBlacklistReason || null,
      added_by: user?.id,
    });

    if (error) {
      toast.error('Failed to add to blacklist');
      return;
    }

    toast.success('Item added to blacklist');
    setNewBlacklistValue('');
    setNewBlacklistReason('');
    fetchBlacklist();
  };

  const handleRemoveBlacklist = async (id: string) => {
    const { error } = await supabase.from('blacklisted_items').delete().eq('id', id);

    if (error) {
      toast.error('Failed to remove from blacklist');
      return;
    }

    toast.success('Item removed from blacklist');
    fetchBlacklist();
  };

  const handleSearchIP = async () => {
    if (!ipSearch) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('ip_reputation')
      .select('*')
      .eq('ip_address', ipSearch)
      .maybeSingle();
    setIpReputation(data as IPReputation | null);
    setIsLoading(false);
  };

  const handleSearchDevices = async () => {
    if (!deviceUserSearch) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('device_fingerprints')
      .select('*')
      .eq('user_id', deviceUserSearch)
      .order('last_seen', { ascending: false });
    setDeviceFingerprints(data as DeviceFingerprint[] || []);
    setIsLoading(false);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-red-500 hover:bg-red-500 text-white">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  if (isAdmin === null) {
    return (
      <AdminLayout>
        <Skeleton className="h-96" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Tabs defaultValue="flags" className="mt-6">
        <TabsList>
          <TabsTrigger value="flags">Fraud Flags</TabsTrigger>
          <TabsTrigger value="shadow">Shadow Bans</TabsTrigger>
          <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
          <TabsTrigger value="ip">IP Reputation</TabsTrigger>
          <TabsTrigger value="devices">Device Fingerprints</TabsTrigger>
        </TabsList>

        {/* Fraud Flags Tab */}
        <TabsContent value="flags">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Fraud Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <Label>Filter by severity:</Label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : fraudFlags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No unresolved fraud flags.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Auto</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fraudFlags.map((flag) => (
                        <TableRow key={flag.id}>
                          <TableCell className="text-sm font-medium">
                            {flag.user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-sm">{flag.flag_type}</TableCell>
                          <TableCell>{getSeverityBadge(flag.severity)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {flag.description || '—'}
                          </TableCell>
                          <TableCell>
                            {flag.auto_generated ? (
                              <Badge variant="secondary">Auto</Badge>
                            ) : (
                              <Badge variant="outline">Manual</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleResolveFlag(flag.id, flag.user_id)}
                              title="Resolve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shadow Bans Tab */}
        <TabsContent value="shadow">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Shadow Bans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-3 rounded-lg border p-4">
                <h4 className="text-sm font-medium">Add Shadow Ban</h4>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="shadowBanUser">User ID</Label>
                    <Input
                      id="shadowBanUser"
                      value={newShadowBanUser}
                      onChange={(e) => setNewShadowBanUser(e.target.value)}
                      placeholder="Enter user UUID"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="shadowBanReason">Reason</Label>
                    <Input
                      id="shadowBanReason"
                      value={newShadowBanReason}
                      onChange={(e) => setNewShadowBanReason(e.target.value)}
                      placeholder="Reason for shadow ban"
                    />
                  </div>
                  <Button onClick={handleAddShadowBan}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
              {shadowBans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No shadow bans active.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shadowBans.map((sb) => (
                        <TableRow key={sb.id}>
                          <TableCell className="text-sm font-medium">
                            {sb.user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sb.reason || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(sb.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveShadowBan(sb.user_id)}
                              title="Remove shadow ban"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blacklist Tab */}
        <TabsContent value="blacklist">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Blacklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-3 rounded-lg border p-4">
                <h4 className="text-sm font-medium">Add to Blacklist</h4>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={newBlacklistType} onValueChange={(v) => setNewBlacklistType(v as 'ip' | 'email' | 'phone')}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ip">IP</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="blacklistValue">Value</Label>
                    <Input
                      id="blacklistValue"
                      value={newBlacklistValue}
                      onChange={(e) => setNewBlacklistValue(e.target.value)}
                      placeholder="IP address, email, or phone"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="blacklistReason">Reason</Label>
                    <Input
                      id="blacklistReason"
                      value={newBlacklistReason}
                      onChange={(e) => setNewBlacklistReason(e.target.value)}
                      placeholder="Reason (optional)"
                    />
                  </div>
                  <Button onClick={handleAddBlacklist}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
              {blacklist.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No blacklisted items.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blacklist.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline" className="uppercase">{item.type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{item.value}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.reason || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRemoveBlacklist(item.id)}
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* IP Reputation Tab */}
        <TabsContent value="ip">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                IP Reputation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="ipSearch">Search IP Address</Label>
                  <Input
                    id="ipSearch"
                    value={ipSearch}
                    onChange={(e) => setIpSearch(e.target.value)}
                    placeholder="Enter IP address"
                  />
                </div>
                <Button onClick={handleSearchIP}>
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
              {isLoading ? (
                <Skeleton className="h-32" />
              ) : ipReputation ? (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{ipReputation.ip_address}</span>
                    <div className="flex gap-2">
                      {ipReputation.is_vpn && <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white">VPN</Badge>}
                      {ipReputation.is_proxy && <Badge className="bg-orange-500 hover:bg-orange-500 text-white">Proxy</Badge>}
                      {ipReputation.is_blacklisted && <Badge variant="destructive">Blacklisted</Badge>}
                      {!ipReputation.is_vpn && !ipReputation.is_proxy && !ipReputation.is_blacklisted && (
                        <Badge className="bg-green-600 hover:bg-green-600 text-white">Clean</Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Reputation Score: </span>
                      <span className="font-medium">{ipReputation.reputation_score.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Country: </span>
                      <span className="font-medium">{ipReputation.country || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ISP: </span>
                      <span className="font-medium">{ipReputation.isp || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Checked: </span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(ipReputation.last_checked), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Search for an IP address to view reputation data.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Device Fingerprints Tab */}
        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                Device Fingerprints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="deviceSearch">Search by User ID</Label>
                  <Input
                    id="deviceSearch"
                    value={deviceUserSearch}
                    onChange={(e) => setDeviceUserSearch(e.target.value)}
                    placeholder="Enter user UUID"
                  />
                </div>
                <Button onClick={handleSearchDevices}>
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
              {isLoading ? (
                <Skeleton className="h-32" />
              ) : deviceFingerprints.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fingerprint</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>First Seen</TableHead>
                        <TableHead>Last Seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deviceFingerprints.map((df) => (
                        <TableRow key={df.id}>
                          <TableCell className="text-sm font-mono">
                            {df.fingerprint_hash.slice(0, 16)}...
                          </TableCell>
                          <TableCell className="text-sm">{df.ip_address || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(df.first_seen), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(df.last_seen), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Search for a user to view their device fingerprints.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
