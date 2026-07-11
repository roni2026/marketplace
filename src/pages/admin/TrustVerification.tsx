import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { logUserAction } from '@/lib/audit';
import { Check, X, ShieldCheck, MapPin, TrendingUp, AlertTriangle } from 'lucide-react';

interface BusinessVerification {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  license_number: string | null;
  tax_id: string | null;
  address: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  verified_at: string | null;
  created_at: string;
}

interface AddressVerification {
  id: string;
  user_id: string;
  address: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  verified_at: string | null;
  created_at: string;
}

interface SellerScore {
  id: string;
  user_id: string;
  trust_score: number;
  fraud_risk_score: number;
  reputation_score: number;
  updated_at: string;
}

interface ProfileInfo {
  full_name: string | null;
}

export default function TrustVerification() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [businessVerifications, setBusinessVerifications] = useState<BusinessVerification[]>([]);
  const [addressVerifications, setAddressVerifications] = useState<AddressVerification[]>([]);
  const [sellerScores, setSellerScores] = useState<SellerScore[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileInfo>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAdmin === false) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAll();
    }
  }, [isAdmin]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [bizRes, addrRes, scoreRes] = await Promise.all([
        supabase
          .from('business_verifications')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('address_verifications')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('seller_scores')
          .select('*')
          .order('trust_score', { ascending: false }),
      ]);

      setBusinessVerifications(bizRes.data as BusinessVerification[] || []);
      setAddressVerifications(addrRes.data as AddressVerification[] || []);
      setSellerScores(scoreRes.data as SellerScore[] || []);

      // Fetch profiles for user names
      const allUserIds = [
        ...(bizRes.data || []).map((b: BusinessVerification) => b.user_id),
        ...(addrRes.data || []).map((a: AddressVerification) => a.user_id),
        ...(scoreRes.data || []).map((s: SellerScore) => s.user_id),
      ];
      const uniqueUserIds = [...new Set(allUserIds)];

      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', uniqueUserIds);
        const map: Record<string, ProfileInfo> = {};
        profiles?.forEach((p) => {
          map[p.user_id] = { full_name: p.full_name };
        });
        setProfileMap(map);
      }
    } catch {
      toast.error('Failed to load verification data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveBusiness = async (id: string, userId: string) => {
    const { error } = await supabase
      .from('business_verifications')
      .update({
        verification_status: 'approved',
        verified_at: new Date().toISOString(),
        verified_by: user?.id,
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to approve business verification');
      return;
    }

    await logUserAction('verify', userId, { type: 'business_verification', action: 'approved' });
    toast.success('Business verification approved');
    fetchAll();
  };

  const handleRejectBusiness = async (id: string, userId: string) => {
    const { error } = await supabase
      .from('business_verifications')
      .update({
        verification_status: 'rejected',
        verified_at: new Date().toISOString(),
        verified_by: user?.id,
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to reject business verification');
      return;
    }

    await logUserAction('verify', userId, { type: 'business_verification', action: 'rejected' });
    toast.success('Business verification rejected');
    fetchAll();
  };

  const handleApproveAddress = async (id: string, userId: string) => {
    const { error } = await supabase
      .from('address_verifications')
      .update({
        verification_status: 'approved',
        verified_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to approve address verification');
      return;
    }

    await logUserAction('verify', userId, { type: 'address_verification', action: 'approved' });
    toast.success('Address verification approved');
    fetchAll();
  };

  const handleRejectAddress = async (id: string, userId: string) => {
    const { error } = await supabase
      .from('address_verifications')
      .update({
        verification_status: 'rejected',
        verified_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to reject address verification');
      return;
    }

    await logUserAction('verify', userId, { type: 'address_verification', action: 'rejected' });
    toast.success('Address verification rejected');
    fetchAll();
  };

  const getUserName = (userId: string) => {
    return profileMap[userId]?.full_name || userId.slice(0, 8) + '...';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return <Badge className="bg-green-600 hover:bg-green-600 text-white">Approved</Badge>;
    } else if (status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getScoreBadge = (score: number, type: 'trust' | 'risk' | 'reputation') => {
    if (type === 'risk') {
      if (score >= 70) return <Badge variant="destructive">High Risk</Badge>;
      if (score >= 40) return <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white">Medium Risk</Badge>;
      return <Badge className="bg-green-600 hover:bg-green-600 text-white">Low Risk</Badge>;
    }
    if (score >= 70) return <Badge className="bg-green-600 hover:bg-green-600 text-white">High</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white">Medium</Badge>;
    return <Badge variant="secondary">Low</Badge>;
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
      <Tabs defaultValue="business" className="mt-6">
        <TabsList>
          <TabsTrigger value="business">Business Verifications</TabsTrigger>
          <TabsTrigger value="address">Address Verifications</TabsTrigger>
          <TabsTrigger value="scores">Seller Scores</TabsTrigger>
        </TabsList>

        {/* Business Verifications Tab */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Business Verifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : businessVerifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No business verifications found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>License #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {businessVerifications.map((bv) => (
                        <TableRow key={bv.id}>
                          <TableCell className="text-sm font-medium">
                            {getUserName(bv.user_id)}
                          </TableCell>
                          <TableCell className="text-sm">{bv.business_name}</TableCell>
                          <TableCell className="text-sm capitalize">{bv.business_type}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {bv.license_number || '—'}
                          </TableCell>
                          <TableCell>{getStatusBadge(bv.verification_status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(bv.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {bv.verification_status === 'pending' && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleApproveBusiness(bv.id, bv.user_id)}
                                  title="Approve"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleRejectBusiness(bv.id, bv.user_id)}
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
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

        {/* Address Verifications Tab */}
        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Verifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : addressVerifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No address verifications found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {addressVerifications.map((av) => (
                        <TableRow key={av.id}>
                          <TableCell className="text-sm font-medium">
                            {getUserName(av.user_id)}
                          </TableCell>
                          <TableCell className="text-sm">{av.address}</TableCell>
                          <TableCell>{getStatusBadge(av.verification_status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(av.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {av.verification_status === 'pending' && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleApproveAddress(av.id, av.user_id)}
                                  title="Approve"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleRejectAddress(av.id, av.user_id)}
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
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

        {/* Seller Scores Tab */}
        <TabsContent value="scores">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Seller Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : sellerScores.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No seller scores found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Trust Score</TableHead>
                        <TableHead>Fraud Risk</TableHead>
                        <TableHead>Reputation</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellerScores.map((ss) => (
                        <TableRow key={ss.id}>
                          <TableCell className="text-sm font-medium">
                            {getUserName(ss.user_id)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{ss.trust_score.toFixed(0)}</span>
                              {getScoreBadge(ss.trust_score, 'trust')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{ss.fraud_risk_score.toFixed(0)}</span>
                              {getScoreBadge(ss.fraud_risk_score, 'risk')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{ss.reputation_score.toFixed(0)}</span>
                              {getScoreBadge(ss.reputation_score, 'reputation')}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(ss.updated_at), { addSuffix: true })}
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
      </Tabs>
    </AdminLayout>
  );
}
