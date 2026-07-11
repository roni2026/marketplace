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
import { logUserAction } from '@/lib/audit';
import {
  ALL_ADVANCED_PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_GROUPS,
  getDefaultPermissionsForRole,
  grantPermission,
  revokePermission,
  getPermissionsForUser,
  type AdvancedPermission,
} from '@/lib/permissions_v2';
import { ROLE_LABELS, type AppRole } from '@/lib/permissions';
import { Search, Shield, Key, Check, X } from 'lucide-react';

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  email: string | null;
  user_roles: { role: string }[];
}

export default function Permissions() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<AdvancedPermission, boolean>>({} as Record<AdvancedPermission, boolean>);
  const [selectedRole, setSelectedRole] = useState<string>('super_admin');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isAdmin === false) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          user_roles ( role )
        `)
        .order('full_name', { ascending: true });

      if (error) throw error;

      // Get emails from auth - not available via client, use user_id as fallback
      const mapped = (data || []).map((p: Record<string, unknown>) => ({
        user_id: p.user_id as string,
        full_name: p.full_name as string | null,
        email: null,
        user_roles: p.user_roles as { role: string }[],
      }));

      setUsers(mapped);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = async (userId: string) => {
    setSelectedUserId(userId);
    setIsLoading(true);
    try {
      const perms = await getPermissionsForUser(userId);
      setUserPermissions(perms);
    } catch {
      toast.error('Failed to load user permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePermission = async (permission: AdvancedPermission, currentValue: boolean) => {
    if (!selectedUserId || !user?.id) return;

    setIsUpdating(true);
    try {
      if (currentValue) {
        const { error } = await revokePermission(selectedUserId, permission, user.id);
        if (error) throw error;
        setUserPermissions((prev) => ({ ...prev, [permission]: false }));
        toast.success(`Revoked: ${PERMISSION_LABELS[permission]}`);
      } else {
        const { error } = await grantPermission(selectedUserId, permission, user.id);
        if (error) throw error;
        setUserPermissions((prev) => ({ ...prev, [permission]: true }));
        toast.success(`Granted: ${PERMISSION_LABELS[permission]}`);
      }

      await logUserAction('update', selectedUserId, {
        type: 'permission_override',
        permission,
        action: currentValue ? 'revoked' : 'granted',
      });
    } catch {
      toast.error('Failed to update permission');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(term) ||
      u.user_id.toLowerCase().includes(term)
    );
  });

  const selectedUser = users.find((u) => u.user_id === selectedUserId);

  if (isAdmin === null) {
    return (
      <AdminLayout>
        <Skeleton className="h-96" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Tabs defaultValue="user" className="mt-6">
        <TabsList>
          <TabsTrigger value="user">User Permissions</TabsTrigger>
          <TabsTrigger value="roles">Role Defaults</TabsTrigger>
        </TabsList>

        {/* User Permissions Tab */}
        <TabsContent value="user">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* User Search & List */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Select User
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <Input
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {isLoading && !selectedUserId ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.user_id}
                        onClick={() => handleSelectUser(u.user_id)}
                        className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent ${
                          selectedUserId === u.user_id ? 'border-primary bg-accent' : 'border-border'
                        }`}
                      >
                        <div className="font-medium">
                          {u.full_name || u.user_id.slice(0, 8) + '...'}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {u.user_roles?.map((r) => (
                            <Badge key={r.role} variant="outline" className="text-xs">
                              {ROLE_LABELS[r.role as AppRole] || r.role}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No users found.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Permission Toggles */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  {selectedUser ? (
                    <>
                      Permissions: {selectedUser.full_name || selectedUser.user_id.slice(0, 8) + '...'}
                    </>
                  ) : (
                    'Permissions'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedUserId ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Select a user to manage their permissions.
                  </p>
                ) : isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.label}>
                        <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                          {group.label}
                        </h4>
                        <div className="space-y-2">
                          {group.permissions.map((perm) => {
                            const isGranted = userPermissions[perm] ?? false;
                            return (
                              <div
                                key={perm}
                                className="flex items-center justify-between rounded-md border px-3 py-2"
                              >
                                <span className="text-sm">{PERMISSION_LABELS[perm]}</span>
                                <Button
                                  variant={isGranted ? 'default' : 'outline'}
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleTogglePermission(perm, isGranted)}
                                  className="h-8"
                                >
                                  {isGranted ? (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      Granted
                                    </>
                                  ) : (
                                    <>
                                      <X className="h-3.5 w-3.5" />
                                      Revoked
                                    </>
                                  )}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Role Defaults Tab */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Default Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <Label>Select role:</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="customer_support">Customer Support</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                    <SelectItem value="buyer">Buyer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-6">
                {PERMISSION_GROUPS.map((group) => {
                  const rolePerms = getDefaultPermissionsForRole(selectedRole as AppRole);
                  const groupPermsInRole = group.permissions.filter((p) => rolePerms.includes(p));
                  return (
                    <div key={group.label}>
                      <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                        {group.label}
                      </h4>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Permission</TableHead>
                              <TableHead className="w-24">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.permissions.map((perm) => {
                              const has = rolePerms.includes(perm);
                              return (
                                <TableRow key={perm}>
                                  <TableCell className="text-sm">
                                    {PERMISSION_LABELS[perm]}
                                  </TableCell>
                                  <TableCell>
                                    {has ? (
                                      <Badge className="bg-green-600 hover:bg-green-600 text-white">
                                        <Check className="h-3 w-3" />
                                        Granted
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">Not granted</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
