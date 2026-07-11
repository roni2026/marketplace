import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import {
  logConsent, getConsentLogs, requestDataExport, requestDataDeletion,
  getTermsAcceptance, getPrivacyControls, updatePrivacyControls,
  checkCookieConsent, getComplianceReport,
} from '@/lib/compliance';
import { Shield, FileText, Cookie, Download, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function Compliance() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [consentLogs, setConsentLogs] = useState<unknown[]>([]);
  const [termsHistory, setTermsHistory] = useState<unknown[]>([]);
  const [privacyControls, setPrivacyControls] = useState<Record<string, unknown> | null>(null);
  const [cookieConsent, setCookieConsent] = useState<{ consented: boolean; categories: string[] } | null>(null);
  const [complianceReport, setComplianceReport] = useState<{ gdprCompliant: boolean; totalConsentRecords: number; pendingDataDeletions: number; termsVersion: string; privacyPolicyVersion: string; cookiePolicyVersion: string; lastAuditDate: string; dataProcessingAgreements: number; issues: string[] } | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exportUserId, setExportUserId] = useState('');
  const [deleteUserId, setDeleteUserId] = useState('');
  const [exportResult, setExportResult] = useState<unknown>(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { navigate('/'); return; }
    if (isAdmin) fetchAll();
  }, [user, isAdmin, navigate]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [cc, th, pc, cookie, report] = await Promise.all([
        getConsentLogs(user!.id).catch(() => []),
        getTermsAcceptance(user!.id).catch(() => []),
        getPrivacyControls(user!.id).catch(() => null),
        checkCookieConsent().catch(() => null),
        getComplianceReport().catch(() => null),
      ]);
      setConsentLogs(cc ?? []);
      setTermsHistory(th ?? []);
      setPrivacyControls(pc as typeof privacyControls);
      setCookieConsent(cookie as typeof cookieConsent);
      setComplianceReport(report as typeof complianceReport);
    } catch {
      // tables may not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataExport = async () => {
    if (!exportUserId) return;
    try {
      const result = await requestDataExport(exportUserId);
      setExportResult(result);
      toast.success('Data export completed');
    } catch {
      toast.error('Data export failed');
    }
  };

  const handleDataDeletion = async () => {
    if (!deleteUserId) return;
    try {
      await requestDataDeletion(deleteUserId);
      setShowDeleteDialog(false);
      setDeleteUserId('');
      toast.success('Data deletion scheduled');
    } catch {
      toast.error('Data deletion failed');
    }
  };

  const handleUpdatePrivacy = async (key: string, value: boolean) => {
    try {
      await updatePrivacyControls(user!.id, { [key]: value });
      const pc = await getPrivacyControls(user!.id);
      setPrivacyControls(pc as typeof privacyControls);
      toast.success('Privacy settings updated');
    } catch {
      toast.error('Failed to update privacy settings');
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
      <h1 className="text-2xl font-bold mb-6">Compliance</h1>

      <Tabs defaultValue="gdpr">
        <TabsList className="mb-4">
          <TabsTrigger value="gdpr" className="gap-2"><Shield className="h-4 w-4" /> GDPR</TabsTrigger>
          <TabsTrigger value="consent" className="gap-2"><CheckCircle className="h-4 w-4" /> Consent Logs</TabsTrigger>
          <TabsTrigger value="terms" className="gap-2"><FileText className="h-4 w-4" /> Terms</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="cookies" className="gap-2"><Cookie className="h-4 w-4" /> Cookies</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="gdpr">
          <Card>
            <CardHeader><CardTitle>GDPR Data Requests</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><Download className="h-4 w-4" /> Data Export Request</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>GDPR Data Export</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>User ID</Label>
                        <Input placeholder="User UUID" value={exportUserId} onChange={(e) => setExportUserId(e.target.value)} />
                      </div>
                      {exportResult && (
                        <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950">
                          <p className="text-sm font-medium mb-1">Export completed:</p>
                          <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(exportResult, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowExportDialog(false)}>Close</Button>
                      <Button onClick={handleDataExport}>Export</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive"><Trash2 className="h-4 w-4" /> Data Deletion Request</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>GDPR Data Deletion</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>User ID</Label>
                        <Input placeholder="User UUID" value={deleteUserId} onChange={(e) => setDeleteUserId(e.target.value)} />
                      </div>
                      <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          ⚠️ This will schedule deletion of all user data within 24 hours. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={handleDataDeletion}>Schedule Deletion</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent">
          <Card>
            <CardHeader><CardTitle>Consent Logs</CardTitle></CardHeader>
            <CardContent>
              {consentLogs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Consent Type</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Accepted</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(consentLogs as Record<string, unknown>[]).slice(0, 50).map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.consent_type as string}</TableCell>
                          <TableCell><Badge variant="secondary">{c.version as string}</Badge></TableCell>
                          <TableCell>
                            {c.accepted as boolean
                              ? <Badge className="bg-green-600 hover:bg-green-600 text-white">Accepted</Badge>
                              : <Badge variant="destructive">Declined</Badge>}
                          </TableCell>
                          <TableCell className="text-sm font-mono">{c.ip_address as string ?? '-'}</TableCell>
                          <TableCell className="text-sm">{format(new Date(c.created_at as string), 'MMM d, yyyy HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No consent logs</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms">
          <Card>
            <CardHeader><CardTitle>Terms Acceptance History</CardTitle></CardHeader>
            <CardContent>
              {termsHistory.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Terms Version</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Accepted At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(termsHistory as Record<string, unknown>[]).map((t, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium"><Badge variant="secondary">{t.terms_version as string}</Badge></TableCell>
                          <TableCell className="text-sm font-mono">{t.ip_address as string ?? '-'}</TableCell>
                          <TableCell className="text-sm">{format(new Date(t.accepted_at as string), 'MMM d, yyyy HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No terms acceptance records</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader><CardTitle>Privacy Controls</CardTitle></CardHeader>
            <CardContent>
              {privacyControls ? (
                <div className="space-y-3">
                  {Object.entries(privacyControls).filter(([k]) => k !== 'userId').map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/([A-Z])/g, ' $1')}</p>
                      </div>
                      <Badge variant={value ? 'default' : 'secondary'}>
                        {value ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No privacy controls data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cookies">
          <Card>
            <CardHeader><CardTitle>Cookie Consent Status</CardTitle></CardHeader>
            <CardContent>
              {cookieConsent ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge className={cookieConsent.consented ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-yellow-600 hover:bg-yellow-600 text-white'}>
                      {cookieConsent.consented ? 'Consented' : 'Not Consented'}
                    </Badge>
                  </div>
                  {cookieConsent.categories?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Consented Categories:</p>
                      <div className="flex flex-wrap gap-2">
                        {cookieConsent.categories.map((cat, i) => (
                          <Badge key={i} variant="secondary">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No cookie consent data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader><CardTitle>Compliance Report</CardTitle></CardHeader>
            <CardContent>
              {complianceReport ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">GDPR Compliant:</span>
                    {complianceReport.gdprCompliant
                      ? <Badge className="bg-green-600 hover:bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" /> Yes</Badge>
                      : <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> No</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Consent Records</p>
                      <p className="text-2xl font-bold">{complianceReport.totalConsentRecords}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Pending Deletions</p>
                      <p className="text-2xl font-bold">{complianceReport.pendingDataDeletions}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">DPAs</p>
                      <p className="text-2xl font-bold">{complianceReport.dataProcessingAgreements}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="p-3 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Terms Version</p>
                      <Badge variant="secondary">{complianceReport.termsVersion}</Badge>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Privacy Policy</p>
                      <Badge variant="secondary">{complianceReport.privacyPolicyVersion}</Badge>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Cookie Policy</p>
                      <Badge variant="secondary">{complianceReport.cookiePolicyVersion}</Badge>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Last Audit</p>
                    <p className="font-medium">{complianceReport.lastAuditDate}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No compliance report available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
