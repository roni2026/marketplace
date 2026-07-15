/**
 * AdminSystemHealth — Real-time system health with threshold alerts.
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Server, Cpu, HardDrive, Activity, AlertTriangle, CheckCircle, RefreshCw, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HealthMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  status: string;
  threshold_warning: number | null;
  threshold_critical: number | null;
  recorded_at: string;
}

export default function AdminSystemHealth() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<HealthMetric[]>([]);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('system_health_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(20);

      const allMetrics = (data as HealthMetric[]) || [];

      // Get latest per metric name
      const latest: Record<string, HealthMetric> = {};
      allMetrics.forEach(m => {
        if (!latest[m.metric_name] || new Date(m.recorded_at) > new Date(latest[m.metric_name].recorded_at)) {
          latest[m.metric_name] = m;
        }
      });

      const latestList = Object.values(latest);
      setMetrics(latestList);

      // Find alerts (metrics exceeding thresholds)
      const alertList = latestList.filter(m => {
        if (m.status === 'critical' || m.status === 'down') return true;
        if (m.threshold_warning && m.metric_value >= m.threshold_warning) return true;
        return false;
      });
      setAlerts(alertList);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'down': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, any> = {
      healthy: 'default', warning: 'secondary', critical: 'destructive', down: 'destructive',
    };
    return <Badge variant={map[status] || 'secondary'} className="capitalize gap-1">{statusIcon(status)} {status}</Badge>;
  };

  const MetricCard = ({ metric, icon: Icon }: { metric: HealthMetric; icon: any }) => (
    <Card className={metric.status === 'critical' || metric.status === 'down' ? 'border-destructive/50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          {statusBadge(metric.status)}
        </div>
        <p className="text-2xl font-bold">{metric.metric_value}{metric.metric_name.includes('percentage') || metric.metric_name.includes('rate') ? '%' : ''}</p>
        <p className="text-xs text-muted-foreground capitalize">{metric.metric_name.replace(/_/g, ' ')}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(metric.recorded_at), { addSuffix: true })}</p>
        {metric.threshold_warning && (
          <div className="mt-2 text-[10px] text-muted-foreground">
            Warning: {metric.threshold_warning} · Critical: {metric.threshold_critical || 'N/A'}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const getIcon = (name: string) => {
    if (name.includes('cpu')) return Cpu;
    if (name.includes('memory') || name.includes('disk')) return HardDrive;
    if (name.includes('response') || name.includes('latency')) return Activity;
    return Server;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">System Health</h1>
              <p className="text-muted-foreground flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Auto-refreshing every 30s
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={loadMetrics}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <Bell className="h-5 w-5" /> Active Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium capitalize">{alert.metric_name.replace(/_/g, ' ')}</span>
                    <span className="text-sm">= {alert.metric_value}</span>
                  </div>
                  {statusBadge(alert.status)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Metrics Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : metrics.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><Server className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No health metrics recorded yet</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map(m => <MetricCard key={m.id} metric={m} icon={getIcon(m.metric_name)} />)}
          </div>
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
