import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import {
  Bar, BarChart, LineChart, Line, Area, AreaChart, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  getCustomReports, createCustomReport, generateReport,
  getScheduledReports, scheduleReport,
  getFunnelAnalysis, getCohortAnalysis, getRetentionAnalysis,
  getChurnMetrics, getLifetimeValue, exportDashboard,
} from '@/lib/reporting';
import { BarChart3, Calendar, Download, TrendingDown, Users, DollarSign, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function Reporting() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [customReports, setCustomReports] = useState<unknown[]>([]);
  const [scheduledReports, setScheduledReports] = useState<unknown[]>([]);
  const [funnelData, setFunnelData] = useState<{ step: number; name: string; count: number; conversionRate: number }[]>([]);
  const [cohortData, setCohortData] = useState<{ cohortType: string; cohorts: { cohort: string; size: number; retention: { week: number; rate: number }[] }[] } | null>(null);
  const [retentionData, setRetentionData] = useState<{ data: { period: string; retention: number; users: number }[] } | null>(null);
  const [churnData, setChurnData] = useState<{ churnRate: number; lostUsers: number; totalUsers: number; newUsers: number; netGrowth: number } | null>(null);
  const [ltvData, setLtvData] = useState<{ averageLTV: number; medianLTV: number; totalRevenue: number; totalCustomers: number; avgPurchaseValue: number; avgPurchaseFrequency: number; customerLifespan: number } | null>(null);
  const [newReportName, setNewReportName] = useState('');
  const [newReportTable, setNewReportTable] = useState('ads');
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleFreq, setScheduleFreq] = useState('daily');
  const [scheduleRecipients, setScheduleRecipients] = useState('');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) fetchAll();
  }, [user, isAdmin, navigate]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [cr, sr, funnel, cohort, retention, churn, ltv] = await Promise.all([
        getCustomReports().catch(() => []),
        getScheduledReports().catch(() => []),
        getFunnelAnalysis(['Visit', 'Search', 'View Ad', 'Contact', 'Purchase']).catch(() => ({ steps: [] })),
        getCohortAnalysis('signup', 'monthly').catch(() => null),
        getRetentionAnalysis('weekly').catch(() => null),
        getChurnMetrics('monthly').catch(() => null),
        getLifetimeValue().catch(() => null),
      ]);
      setCustomReports(cr ?? []);
      setScheduledReports(sr ?? []);
      setFunnelData((funnel as { steps?: typeof funnelData })?.steps ?? (funnel as unknown[]) ?? []);
      setCohortData(cohort as typeof cohortData);
      setRetentionData(retention as typeof retentionData);
      setChurnData(churn as typeof churnData);
      setLtvData(ltv as typeof ltvData);
    } catch {
      // tables may not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReport = async () => {
    if (!newReportName) return;
    try {
      await createCustomReport(newReportName, { table: newReportTable });
      const cr = await getCustomReports();
      setCustomReports(cr ?? []);
      setNewReportName('');
      toast.success('Report created');
    } catch {
      toast.error('Failed to create report');
    }
  };

  const handleGenerate = async (id: string) => {
    try {
      await generateReport(id);
      toast.success('Report generated');
    } catch {
      toast.error('Failed to generate report');
    }
  };

  const handleSchedule = async () => {
    if (!scheduleName || !scheduleRecipients) return;
    try {
      await scheduleReport(
        scheduleName,
        { type: 'summary' },
        scheduleFreq,
        scheduleRecipients.split(',').map((e) => e.trim())
      );
      const sr = await getScheduledReports();
      setScheduledReports(sr ?? []);
      setScheduleName('');
      setScheduleRecipients('');
      toast.success('Report scheduled');
    } catch {
      toast.error('Failed to schedule report');
    }
  };

  const handleExport = async (id: string) => {
    try {
      const result = await exportDashboard(id, 'csv');
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported');
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
      <h1 className="text-2xl font-bold mb-6">Reporting & Analytics</h1>

      <Tabs defaultValue="custom">
        <TabsList className="mb-4">
          <TabsTrigger value="custom" className="gap-2"><BarChart3 className="h-4 w-4" /> Custom Reports</TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2"><Calendar className="h-4 w-4" /> Scheduled</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="cohort">Cohort</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="churn" className="gap-2"><TrendingDown className="h-4 w-4" /> Churn</TabsTrigger>
          <TabsTrigger value="ltv" className="gap-2"><DollarSign className="h-4 w-4" /> LTV</TabsTrigger>
        </TabsList>

        <TabsContent value="custom">
          <Card>
            <CardHeader><CardTitle>Custom Reports</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 mb-4 sm:flex-row">
                <Input placeholder="Report name" value={newReportName} onChange={(e) => setNewReportName(e.target.value)} />
                <Select value={newReportTable} onValueChange={setNewReportTable}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ads">Ads</SelectItem>
                    <SelectItem value="profiles">Users</SelectItem>
                    <SelectItem value="offers">Offers</SelectItem>
                    <SelectItem value="messages">Messages</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateReport}><Plus className="h-4 w-4" /> Create</Button>
              </div>
              {customReports.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customReports.map((r: Record<string, unknown>, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{r.name as string}</TableCell>
                          <TableCell className="text-sm">{format(new Date(r.created_at as string), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleGenerate(r.id as string)}>Generate</Button>
                              <Button size="sm" variant="ghost" onClick={() => handleExport(r.id as string)}><Download className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No custom reports</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader><CardTitle>Scheduled Reports</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 mb-4 sm:flex-row">
                <Input placeholder="Report name" value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} />
                <Select value={scheduleFreq} onValueChange={setScheduleFreq}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Recipients (comma-separated emails)" value={scheduleRecipients} onChange={(e) => setScheduleRecipients(e.target.value)} className="flex-1" />
                <Button onClick={handleSchedule}><Plus className="h-4 w-4" /> Schedule</Button>
              </div>
              {scheduledReports.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Last Sent</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scheduledReports.map((r: Record<string, unknown>, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{r.name as string}</TableCell>
                          <TableCell><Badge variant="secondary">{r.frequency as string}</Badge></TableCell>
                          <TableCell className="text-sm">{r.last_sent ? format(new Date(r.last_sent as string), 'MMM d, yyyy') : 'Never'}</TableCell>
                          <TableCell>{r.is_active as boolean ? <Badge className="bg-green-600 hover:bg-green-600 text-white">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No scheduled reports</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel">
          <Card>
            <CardHeader><CardTitle>Funnel Analysis</CardTitle></CardHeader>
            <CardContent>
              {funnelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No funnel data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cohort">
          <Card>
            <CardHeader><CardTitle>Cohort Analysis</CardTitle></CardHeader>
            <CardContent>
              {cohortData?.cohorts?.length ? (
                <div className="space-y-4">
                  {cohortData.cohorts.map((c, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{c.cohort}</span>
                        <Badge variant="secondary">{c.size} users</Badge>
                      </div>
                      <ResponsiveContainer width="100%" height={80}>
                        <LineChart data={c.retention}>
                          <XAxis dataKey="week" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="rate" stroke="#82ca9d" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No cohort data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention">
          <Card>
            <CardHeader><CardTitle>Retention Analysis</CardTitle></CardHeader>
            <CardContent>
              {retentionData?.data?.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={retentionData.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="retention" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Retention %" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No retention data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="churn">
          <Card>
            <CardHeader><CardTitle>Churn Metrics</CardTitle></CardHeader>
            <CardContent>
              {churnData ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Churn Rate</p>
                    <p className="text-2xl font-bold text-red-500">{churnData.churnRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Lost Users</p>
                    <p className="text-2xl font-bold">{churnData.lostUsers}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{churnData.totalUsers}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">New Users</p>
                    <p className="text-2xl font-bold text-green-500">{churnData.newUsers}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Net Growth</p>
                    <p className="text-2xl font-bold">+{churnData.netGrowth}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No churn data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ltv">
          <Card>
            <CardHeader><CardTitle>Lifetime Value</CardTitle></CardHeader>
            <CardContent>
              {ltvData ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Average LTV</p>
                    <p className="text-2xl font-bold">৳{ltvData.averageLTV.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Median LTV</p>
                    <p className="text-2xl font-bold">৳{ltvData.medianLTV.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">৳{ltvData.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Total Customers</p>
                    <p className="text-2xl font-bold">{ltvData.totalCustomers.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Avg Purchase Value</p>
                    <p className="text-2xl font-bold">৳{ltvData.avgPurchaseValue}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Customer Lifespan</p>
                    <p className="text-2xl font-bold">{ltvData.customerLifespan} mo</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No LTV data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
