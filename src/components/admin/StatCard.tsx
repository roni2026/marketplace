import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan' | 'orange' | 'pink';
  sparkline?: { value: number }[];
  loading?: boolean;
  subtitle?: string;
}

const colorMap = {
  blue: { icon: 'text-blue-500', bg: 'bg-blue-500/10', stroke: 'hsl(220 70% 56%)' },
  green: { icon: 'text-green-500', bg: 'bg-green-500/10', stroke: 'hsl(142 71% 45%)' },
  yellow: { icon: 'text-yellow-500', bg: 'bg-yellow-500/10', stroke: 'hsl(45 93% 47%)' },
  red: { icon: 'text-red-500', bg: 'bg-red-500/10', stroke: 'hsl(0 72% 50%)' },
  purple: { icon: 'text-purple-500', bg: 'bg-purple-500/10', stroke: 'hsl(280 65% 60%)' },
  cyan: { icon: 'text-cyan-500', bg: 'bg-cyan-500/10', stroke: 'hsl(180 70% 45%)' },
  orange: { icon: 'text-orange-500', bg: 'bg-orange-500/10', stroke: 'hsl(25 95% 53%)' },
  pink: { icon: 'text-pink-500', bg: 'bg-pink-500/10', stroke: 'hsl(340 75% 55%)' },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'blue',
  sparkline,
  loading,
  subtitle,
}: StatCardProps) {
  const c = colorMap[color];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <div className={`p-1.5 rounded-lg ${c.bg}`}>
            <Icon className={`h-4 w-4 ${c.icon}`} />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            {trend !== undefined && (
              <span
                className={`flex items-center text-xs font-medium ${
                  trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(trend)}%
              </span>
            )}
            {trendLabel && (
              <span className="text-xs text-muted-foreground">{trendLabel}</span>
            )}
            {subtitle && !trendLabel && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
          {sparkline && sparkline.length > 1 && (
            <div className="h-8 w-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkline}>
                  <defs>
                    <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c.stroke} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={c.stroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={c.stroke}
                    strokeWidth={1.5}
                    fill={`url(#spark-${title})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
      {children}
    </div>
  );
}
