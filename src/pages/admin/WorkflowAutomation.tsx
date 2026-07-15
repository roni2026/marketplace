import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useWorkflow } from '@/hooks/useWorkflow';
import { toast } from 'sonner';
import { Zap, Plus, Trash2, Clock, ScrollText, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';
import type { WorkflowRule } from '@/integrations/supabase/types_v2_cms';

const TRIGGER_OPTIONS = [
  { value: 'ad_created', label: 'When Ad is Created' },
  { value: 'ad_approved', label: 'When Ad is Approved' },
  { value: 'ad_rejected', label: 'When Ad is Rejected' },
  { value: 'ad_expired', label: 'When Ad Expires' },
  { value: 'user_registered', label: 'When User Registers' },
  { value: 'message_sent', label: 'When Message is Sent' },
  { value: 'offer_made', label: 'When Offer is Made' },
  { value: 'report_filed', label: 'When Report is Filed' },
];

const ACTION_OPTIONS = [
  { value: 'auto_approve', label: 'Auto Approve' },
  { value: 'auto_reject', label: 'Auto Reject' },
  { value: 'auto_feature', label: 'Auto Feature' },
  { value: 'auto_expire', label: 'Auto Expire' },
  { value: 'send_reminder', label: 'Send Reminder' },
  { value: 'auto_cleanup', label: 'Auto Cleanup' },
];

export default function WorkflowAutomationPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const {
    rules,
    cronJobs,
    logs,
    isLoading,
    createRule,
    toggleRule,
    removeRule,
    addCronJob,
    toggleCronJobState,
    removeCronJob,
    refetch,
  } = useWorkflow();

  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showCronDialog, setShowCronDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);

  const [ruleForm, setRuleForm] = useState({
    name: '',
    trigger: 'ad_created',
    condition: '{}',
    action: 'auto_approve',
    priority: 0,
  });
  const [cronForm, setCronForm] = useState({ name: '', schedule: '', command: '' });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
  }, [user, isAdmin, navigate]);

  const handleRuleSave = async () => {
    if (!ruleForm.name) {
      toast.error('Rule name is required');
      return;
    }
    let condition: Record<string, unknown> = {};
    try {
      condition = ruleForm.condition.trim() ? JSON.parse(ruleForm.condition) : {};
    } catch {
      toast.error('Invalid JSON in condition');
      return;
    }
    await createRule(ruleForm.name, ruleForm.trigger, condition, ruleForm.action);
    toast.success('Workflow rule created');
    setShowRuleDialog(false);
    setRuleForm({ name: '', trigger: 'ad_created', condition: '{}', action: 'auto_approve', priority: 0 });
  };

  const handleCronSave = async () => {
    if (!cronForm.name || !cronForm.schedule || !cronForm.command) {
      toast.error('All fields are required');
      return;
    }
    await addCronJob(cronForm.name, cronForm.schedule, cronForm.command);
    toast.success('Cron job created');
    setShowCronDialog(false);
    setCronForm({ name: '', schedule: '', command: '' });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6" />
          Workflow Automation
        </h1>

        <Tabs defaultValue="rules">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="rules" className="gap-1">
              <Zap className="h-4 w-4" /> Rules
            </TabsTrigger>
            <TabsTrigger value="cron" className="gap-1">
              <Clock className="h-4 w-4" /> Cron Jobs
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1">
              <ScrollText className="h-4 w-4" /> Logs
            </TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingRule(null); setRuleForm({ name: '', trigger: 'ad_created', condition: '{}', action: 'auto_approve', priority: 0 }); setShowRuleDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Rule
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No workflow rules yet</TableCell>
                    </TableRow>
                  ) : (
                    rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {TRIGGER_OPTIONS.find((t) => t.value === rule.trigger)?.label || rule.trigger}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ACTION_OPTIONS.find((a) => a.value === rule.action)?.label || rule.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(checked) => {
                              toggleRule(rule.id, checked);
                              toast.success(checked ? 'Rule enabled' : 'Rule disabled');
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={async () => {
                            await removeRule(rule.id);
                            toast.success('Rule deleted');
                          }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Cron Jobs Tab */}
          <TabsContent value="cron" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setCronForm({ name: '', schedule: '', command: '' }); setShowCronDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Cron Job
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Command</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cronJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No cron jobs yet</TableCell>
                    </TableRow>
                  ) : (
                    cronJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-mono">{job.schedule}</Badge></TableCell>
                        <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground">{job.command}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {job.last_run ? format(new Date(job.last_run), 'MMM d, HH:mm') : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={job.is_active}
                            onCheckedChange={(checked) => {
                              toggleCronJobState(job.id, checked);
                              toast.success(checked ? 'Cron job enabled' : 'Cron job disabled');
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={async () => {
                            await removeCronJob(job.id);
                            toast.success('Cron job deleted');
                          }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => refetch()} className="gap-2">
                <ScrollText className="h-4 w-4" /> Refresh Logs
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Success</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No execution logs yet</TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.workflow_rules?.name || '—'}
                        </TableCell>
                        <TableCell>{log.entity_type || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{log.action_taken || '—'}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={log.success ? 'default' : 'destructive'}>
                            {log.success ? 'Success' : 'Failed'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Rule Dialog */}
        <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Workflow Rule'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input id="rule-name" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder="Auto-approve trusted sellers" />
              </div>
              <div className="space-y-2">
                <Label>Trigger</Label>
                <Select value={ruleForm.trigger} onValueChange={(v) => setRuleForm({ ...ruleForm, trigger: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={ruleForm.action} onValueChange={(v) => setRuleForm({ ...ruleForm, action: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-condition">Condition (JSON)</Label>
                <Textarea id="rule-condition" rows={4} value={ruleForm.condition} onChange={(e) => setRuleForm({ ...ruleForm, condition: e.target.value })} placeholder='{"is_verified": true}' className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground">JSON object of field-value pairs to match against the entity</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-priority">Priority</Label>
                <Input id="rule-priority" type="number" value={ruleForm.priority} onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 0 })} />
                <p className="text-xs text-muted-foreground">Higher priority rules execute first</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRuleDialog(false)}>Cancel</Button>
              <Button onClick={handleRuleSave}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cron Dialog */}
        <Dialog open={showCronDialog} onOpenChange={setShowCronDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Cron Job</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cron-name">Name</Label>
                <Input id="cron-name" value={cronForm.name} onChange={(e) => setCronForm({ ...cronForm, name: e.target.value })} placeholder="Daily cleanup" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cron-schedule">Schedule (Cron Expression)</Label>
                <Input id="cron-schedule" value={cronForm.schedule} onChange={(e) => setCronForm({ ...cronForm, schedule: e.target.value })} placeholder="0 2 * * *" />
                <p className="text-xs text-muted-foreground">Standard cron format: minute hour day month weekday</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cron-command">Command</Label>
                <Textarea id="cron-command" rows={3} value={cronForm.command} onChange={(e) => setCronForm({ ...cronForm, command: e.target.value })} placeholder="autoExpireListings" className="font-mono text-xs" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCronDialog(false)}>Cancel</Button>
              <Button onClick={handleCronSave}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
