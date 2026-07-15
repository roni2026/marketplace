/**
 * AdminBookmarksNotes — Lets admins bookmark entities and add private notes.
 * Also shows admin reminders.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Bookmark, StickyNote, Bell, Plus, Trash2, Check, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Bookmark {
  id: string;
  entity_type: string;
  entity_id: string;
  label: string | null;
  created_at: string;
}

interface AdminNote {
  id: string;
  entity_type: string;
  entity_id: string;
  note: string;
  created_at: string;
}

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  completed: boolean;
  created_at: string;
}

export function AdminBookmarksNotes() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  // New reminder form
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDesc, setReminderDesc] = useState('');
  const [reminderDate, setReminderDate] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [b, n, r] = await Promise.all([
        supabase.from('admin_bookmarks').select('*').eq('admin_id', user.id).order('created_at', { ascending: false }),
        supabase.from('admin_notes').select('*').eq('admin_id', user.id).order('created_at', { ascending: false }),
        supabase.from('admin_reminders').select('*').eq('admin_id', user.id).order('reminder_date', { ascending: true }),
      ]);
      setBookmarks((b.data as Bookmark[]) || []);
      setNotes((n.data as AdminNote[]) || []);
      setReminders((r.data as Reminder[]) || []);
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteBookmark = async (id: string) => {
    await supabase.from('admin_bookmarks').delete().eq('id', id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
    toast.success('Bookmark removed');
  };

  const handleDeleteNote = async (id: string) => {
    await supabase.from('admin_notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
    toast.success('Note deleted');
  };

  const handleAddReminder = async () => {
    if (!user || !reminderTitle.trim() || !reminderDate) return;
    try {
      const { data, error } = await supabase.from('admin_reminders').insert({
        admin_id: user.id,
        title: reminderTitle.trim(),
        description: reminderDesc.trim() || null,
        reminder_date: new Date(reminderDate).toISOString(),
        completed: false,
      }).select().single();
      if (error) throw error;
      setReminders(prev => [...prev, data as Reminder].sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime()));
      setReminderTitle(''); setReminderDesc(''); setReminderDate('');
      toast.success('Reminder added');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add reminder');
    }
  };

  const handleToggleReminder = async (id: string, completed: boolean) => {
    await supabase.from('admin_reminders').update({ completed: !completed }).eq('id', id);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !completed } : r));
  };

  const handleDeleteReminder = async (id: string) => {
    await supabase.from('admin_reminders').delete().eq('id', id);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="reminders">
        <TabsList className="w-full">
          <TabsTrigger value="reminders" className="flex-1 gap-2">
            <Bell className="h-4 w-4" /> Reminders ({reminders.filter(r => !r.completed).length})
          </TabsTrigger>
          <TabsTrigger value="bookmarks" className="flex-1 gap-2">
            <Bookmark className="h-4 w-4" /> Bookmarks ({bookmarks.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 gap-2">
            <StickyNote className="h-4 w-4" /> Notes ({notes.length})
          </TabsTrigger>
        </TabsList>

        {/* Reminders */}
        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Add Reminder</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={reminderTitle} onChange={e => setReminderTitle(e.target.value)} placeholder="e.g. Check user verification" />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea value={reminderDesc} onChange={e => setReminderDesc(e.target.value)} rows={2} placeholder="Details..." />
              </div>
              <div>
                <Label>Reminder Date</Label>
                <Input type="datetime-local" value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
              </div>
              <Button onClick={handleAddReminder} disabled={!reminderTitle.trim() || !reminderDate} className="gap-2">
                <Plus className="h-4 w-4" /> Add Reminder
              </Button>
            </CardContent>
          </Card>

          {reminders.length > 0 && (
            <div className="space-y-2">
              {reminders.map(r => {
                const isOverdue = !r.completed && new Date(r.reminder_date) < new Date();
                return (
                  <Card key={r.id} className={isOverdue ? 'border-destructive/50' : ''}>
                    <CardContent className="p-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Button variant="ghost" size="icon" className="h-6 w-6 mt-0.5" onClick={() => handleToggleReminder(r.id, r.completed)}>
                          {r.completed ? <Check className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4" />}
                        </Button>
                        <div className={r.completed ? 'line-through opacity-60' : ''}>
                          <p className="font-medium text-sm">{r.title}</p>
                          {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-[10px] gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(r.reminder_date), 'MMM d, h:mm a')}
                            </Badge>
                            {isOverdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteReminder(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Bookmarks */}
        <TabsContent value="bookmarks">
          {bookmarks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No bookmarks yet. Bookmark entities from admin pages.</p>
          ) : (
            <div className="space-y-2">
              {bookmarks.map(b => (
                <Card key={b.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{b.label || b.entity_id.slice(0, 12)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{b.entity_type} · {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteBookmark(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notes yet. Add notes from admin pages.</p>
          ) : (
            <div className="space-y-2">
              {notes.map(n => (
                <Card key={n.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm">{n.note}</p>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">{n.entity_type} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteNote(n.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
