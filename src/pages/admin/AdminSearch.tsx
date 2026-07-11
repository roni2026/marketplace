/**
 * AdminSearch — Global admin search across all entities.
 */

import { useState, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Search, Users, Package, Store, Flag, CheckCircle, XCircle, Star, Ban, BadgeCheck, Eye } from 'lucide-react';

export default function AdminSearch() {
  const { user } = useAuth();
  const { adminSearch, quickApprove, quickReject, quickSuspend, quickVerify, quickFeature } = useAdminPortal();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ users: any[]; listings: any[]; shops: any[]; reports: any[] }>({ users: [], listings: [], shops: [], reports: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults({ users: [], listings: [], shops: [], reports: [] }); setHasSearched(false); return; }
    setIsSearching(true);
    setHasSearched(true);
    const data = await adminSearch(q);
    setResults(data);
    setIsSearching(false);
  }, [adminSearch]);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const totalResults = results.users.length + results.listings.length + results.shops.length;

  return (
    <AdminLayout>
      <PageHeader
        title="Global Search"
        description="Search across users, listings, shops, and reports"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Search' }]}
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search users, listings, shops..." className="pl-10 h-12 text-lg" autoFocus />
      </div>

      {!hasSearched ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Start typing to search across the marketplace</p>
          </CardContent>
        </Card>
      ) : isSearching ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : totalResults === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No results found for "{query}"</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Users ({results.users.length})</TabsTrigger>
            <TabsTrigger value="listings" className="gap-2"><Package className="h-4 w-4" /> Listings ({results.listings.length})</TabsTrigger>
            <TabsTrigger value="shops" className="gap-2"><Store className="h-4 w-4" /> Shops ({results.shops.length})</TabsTrigger>
          </TabsList>

          {/* Users */}
          <TabsContent value="users">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {results.users.map((u: any) => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">{(u.full_name || '?')[0]}</div>
                            <div><p className="text-sm font-medium">{u.full_name || 'Unknown'}</p><p className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 12)}</p></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {u.is_verified && <Badge variant="default" className="text-xs gap-1"><BadgeCheck className="h-3 w-3" /> Verified</Badge>}
                            {u.is_suspended && <Badge variant="destructive" className="text-xs">Suspended</Badge>}
                            {!u.is_verified && !u.is_suspended && <Badge variant="secondary" className="text-xs">Active</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" asChild><Link to={`/user/${u.user_id}`}><Eye className="h-3.5 w-3.5" /></Link></Button>
                            {!u.is_verified && <Button variant="ghost" size="sm" onClick={() => quickVerify(u.user_id)} className="gap-1 text-xs"><BadgeCheck className="h-3.5 w-3.5" /> Verify</Button>}
                            {!u.is_suspended && <Button variant="ghost" size="sm" onClick={() => quickSuspend(u.user_id)} className="gap-1 text-xs text-destructive"><Ban className="h-3.5 w-3.5" /> Suspend</Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Listings */}
          <TabsContent value="listings">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Price</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {results.listings.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium text-sm">{l.title}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{l.status}</Badge></TableCell>
                        <TableCell className="text-sm">{formatPrice(l.price, 'fixed')}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" asChild><Link to={`/ad/${l.slug}-${l.id}`}><Eye className="h-3.5 w-3.5" /></Link></Button>
                            {l.status === 'pending' && <Button variant="ghost" size="sm" onClick={() => quickApprove(l.id)} className="gap-1 text-xs text-green-600"><CheckCircle className="h-3.5 w-3.5" /> Approve</Button>}
                            {l.status === 'pending' && <Button variant="ghost" size="sm" onClick={() => quickReject(l.id)} className="gap-1 text-xs text-destructive"><XCircle className="h-3.5 w-3.5" /> Reject</Button>}
                            <Button variant="ghost" size="sm" onClick={() => quickFeature(l.id)} className="gap-1 text-xs"><Star className="h-3.5 w-3.5" /> Feature</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shops */}
          <TabsContent value="shops">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Shop</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {results.shops.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-sm">{s.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {s.is_verified && <Badge variant="default" className="text-xs gap-1"><BadgeCheck className="h-3 w-3" /> Verified</Badge>}
                            {s.is_featured && <Badge variant="secondary" className="text-xs gap-1"><Star className="h-3 w-3" /> Featured</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild><Link to={`/shop/${s.slug}`}><Eye className="h-3.5 w-3.5" /></Link></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </AdminLayout>
  );
}
