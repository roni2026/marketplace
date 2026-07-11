import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import {
  globalSearch,
  getAdminBookmarks,
  addBookmark,
  removeBookmark,
  getAdminNotes,
  addAdminNote,
  getAdminReminders,
  addAdminReminder,
  completeReminder,
  impersonateUser,
  stopImpersonation,
  getImpersonationLogs,
  bulkExport,
} from '@/lib/adminTools';
import { Search, Bookmark, StickyNote, Bell, UserCog, Download, Trash2, Plus, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminTools() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ type: string; id: string; title: string; subtitle: string; href: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [bookmarks, setBookmarks] = useState<unknown[]>([]);
  const [notes, setNotes] = useState<unknown[]>([]);
  const [noteEntityType, setNoteEntityType] = useState('ad');
  const [noteEntityId, setNoteEntityId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [reminders, setReminders] = useState<unknown[]>([]);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [impersonationLogs, setImpersonationLogs] = useState<unknown[]>([]);
  const [impersonationTarget, setImpersonationTarget] = useState('');
  const [impersonationReason, setImpersonationReason] = useState('');
  const [showImpersonationDialog, setShowImpersonationDialog] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) {
      navigate('/');
      return;
    }
    if (isAdmin && user) {
      fetchAll();
    }
  }, [user, isAdmin, navigate]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [bm, rems, impLogs] = await Promise.all([
        getAdminBookmarks(user!.id),
        getAdminReminders(user!.id),
        getImpersonationLogs(),
      ]);
      setBookmarks(bm ?? []);
      setReminders(rems ?? []);
      setImpersonationLogs(impLogs ?? []);
    } catch {
      // tables may not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setIsSearching(true);
    try {
      const results = await globalSearch(searchQuery);
      setSearchResults(results);
    } catch {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddBookmark = async (entityType: string, entityId: string, label: string) => {
    try {
      await addBookmark(user!.id, entityType, entityId, label);
      const bm = await getAdminBookmarks(user!.id);
      setBookmarks(bm ?? []);
      toast.success('Bookmark added');
    } catch {
      toast.error('Failed to add bookmark');
    }
  };

  const handleRemoveBookmark = async (id: string) => {
    try {
      await removeBookmark(id);
      const bm = await getAdminBookmarks(user!.id);
      setBookmarks(bm ?? []);
      toast.success('Bookmark removed');
    } catch {
      toast.error('Failed to remove bookmark');
    }
  };

  const handleAddNote = async () => {
    if (!noteEntityId || !noteText) return;
    try {
      await addAdminNote(user!.id, noteEntityType, noteEntityId, noteText);
      const n = await getAdminNotes(user!.id, noteEntityType, noteEntityId);
      setNotes(n ?? []);
      setNoteText('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  };

  const handleFetchNotes = async () => {
    if (!noteEntityId) return;
    try {
      const n = await getAdminNotes(user!.id, noteEntityType, noteEntityId);
      setNotes(n ?? []);
    } catch {
      setNotes([]);
    }
  };

  const handleAddReminder = async () => {
    if (!reminderTitle || !reminderDate) return;
    try {
      await addAdminReminder(user!.id, reminderTitle, reminderDate);
      const rems = await getAdminReminders(user!.id);
      setReminders(rems ?? []);
      setReminderTitle('');
      setReminderDate('');
      toast.success('Reminder added');
    } catch {
      toast.error('Failed to add reminder');
    }
  };

  const handleCompleteReminder = async (id: string) => {
    try {
      await completeReminder(id);
      const rems = await getAdminReminders(user!.id);
      setReminders(rems ?? []);
      toast.success('Reminder completed');
    } catch {
      toast.error('Failed to complete reminder');
    }
  };

  const handleImpersonate = async () => {
    if (!impersonationTarget || !impersonationReason) return;
    try {
      await impersonateUser(user!.id, impersonationTarget, impersonationReason);
      const logs = await getImpersonationLogs();
      setImpersonationLogs(logs ?? []);
      setShowImpersonationDialog(false);
      setImpersonationTarget('');
      setImpersonationReason('');
      toast.success('Impersonation started');
    } catch {
      toast.error('Failed to start impersonation');
    }
  };

  const handleStopImpersonation = async (logId: string) => {
    try {
      await stopImpersonation(logId);
      const logs = await getImpersonationLogs();
      setImpersonationLogs(logs ?? []);
      toast.success('Impersonation stopped');
    } catch {
      toast.error('Failed to stop impersonation');
    }
  };

  const handleExport = async (type: string) => {
    try {
      const data = await bulkExport(type);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data?.length ?? 0} records`);
    } catch {
      toast.error('Export failed');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Admin Tools</h1>

      <Tabs defaultValue="search">
        <TabsList className="mb-4">
          <TabsTrigger value="search" className="gap-2"><Search className="h-4 w-4" /> Search</TabsTrigger>
          <TabsTrigger value="bookmarks" className="gap-2"><Bookmark className="h-4 w-4" /> Bookmarks</TabsTrigger>
          <TabsTrigger value="notes" className="gap-2"><StickyNote className="h-4 w-4" /> Notes</TabsTrigger>
          <TabsTrigger value="reminders" className="gap-2"><Bell className="h-4 w-4" /> Reminders</TabsTrigger>
          <TabsTrigger value="impersonation" className="gap-2"><UserCog className="h-4 w-4" /> Impersonation</TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2"><Download className="h-4 w-4" /> Import/Export</TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Global Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search ads, users, reports, categories, tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      onClick={() => navigate(r.href)}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{r.type}</Badge>
                          <span className="font-medium">{r.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{r.subtitle}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddBookmark(r.type.toLowerCase(), r.id, r.title);
                        }}
                      >
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.length === 0 && searchQuery && !isSearching && (
                <p className="text-muted-foreground text-center py-8">No results found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookmarks">
          <Card>
            <CardHeader>
              <CardTitle>Saved Bookmarks</CardTitle>
            </CardHeader>
            <CardContent>
              {bookmarks.length > 0 ? (
                <div className="space-y-2">
                  {bookmarks.map((bm: Record<string, string>, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Badge variant="secondary">{bm.entity_type}</Badge>
                        <span className="ml-2 font-medium">{bm.label}</span>
                        <p className="text-xs text-muted-foreground">{format(new Date(bm.created_at), 'MMM d, yyyy')}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveBookmark(bm.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No bookmarks saved</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Select value={noteEntityType} onValueChange={setNoteEntityType}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ad">Ad</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="ticket">Ticket</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Entity ID"
                  value={noteEntityId}
                  onChange={(e) => setNoteEntityId(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleFetchNotes}>Fetch Notes</Button>
              </div>
              <div className="flex gap-2 mb-4">
                <Textarea
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddNote}><Plus className="h-4 w-4" /> Add</Button>
              </div>
              {notes.length > 0 ? (
                <div className="space-y-2">
                  {notes.map((n: Record<string, string>, i) => (
                    <div key={i} className="p-3 rounded-lg border">
                      <p className="text-sm">{n.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), 'MMM d, yyyy HH:mm')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No notes for this entity</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders">
          <Card>
            <CardHeader>
              <CardTitle>Task Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 mb-4 sm:flex-row">
                <Input
                  placeholder="Reminder title"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                />
                <Input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                />
                <Button onClick={handleAddReminder}><Plus className="h-4 w-4" /> Add</Button>
              </div>
              {reminders.length > 0 ? (
                <div className="space-y-2">
                  {reminders.map((rem: Record<string, unknown>, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <span className="font-medium">{rem.title as string}</span>
                        {rem.completed as boolean && <Badge className="ml-2 bg-green-600 hover:bg-green-600 text-white">Done</Badge>}
                        <p className="text-xs text-muted-foreground">
                          Due: {format(new Date(rem.reminder_date as string), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {!(rem.completed as boolean) && (
                        <Button size="icon" variant="ghost" onClick={() => handleCompleteReminder(rem.id as string)}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No reminders</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impersonation">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Impersonation</CardTitle>
                <Dialog open={showImpersonationDialog} onOpenChange={setShowImpersonationDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm"><UserCog className="h-4 w-4" /> Start Impersonation</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Impersonate User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Target User ID</Label>
                        <Input
                          placeholder="User UUID"
                          value={impersonationTarget}
                          onChange={(e) => setImpersonationTarget(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Reason</Label>
                        <Textarea
                          placeholder="Reason for impersonation..."
                          value={impersonationReason}
                          onChange={(e) => setImpersonationReason(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowImpersonationDialog(false)}>Cancel</Button>
                      <Button onClick={handleImpersonate}>Start</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {impersonationLogs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admin</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Ended</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {impersonationLogs.map((log: Record<string, unknown>, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{(log.admin_id as string)?.substring(0, 8)}...</TableCell>
                          <TableCell className="text-sm">{(log.target_user_id as string)?.substring(0, 8)}...</TableCell>
                          <TableCell className="text-sm">{log.reason as string ?? '-'}</TableCell>
                          <TableCell className="text-sm">{format(new Date(log.started_at as string), 'MMM d, HH:mm')}</TableCell>
                          <TableCell className="text-sm">{log.ended_at ? format(new Date(log.ended_at as string), 'MMM d, HH:mm') : <Badge>Active</Badge>}</TableCell>
                          <TableCell>
                            {!log.ended_at && (
                              <Button size="sm" variant="outline" onClick={() => handleStopImpersonation(log.id as string)}>
                                Stop
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No impersonation logs</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Import / Export</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Export data from any table as JSON.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleExport('ads')}><Download className="h-4 w-4" /> Export Ads</Button>
                <Button variant="outline" onClick={() => handleExport('profiles')}><Download className="h-4 w-4" /> Export Users</Button>
                <Button variant="outline" onClick={() => handleExport('categories')}><Download className="h-4 w-4" /> Export Categories</Button>
                <Button variant="outline" onClick={() => handleExport('reports')}><Download className="h-4 w-4" /> Export Reports</Button>
                <Button variant="outline" onClick={() => handleExport('support_tickets')}><Download className="h-4 w-4" /> Export Tickets</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
