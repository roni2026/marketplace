import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan' | 'orange' | 'pink';
  loading?: boolean;
  subtitle?: string;
}

const colorMap: Record<string, { icon: string; bg: string }> = {
  blue: { icon: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  green: { icon: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
  yellow: { icon: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10' },
  red: { icon: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
  purple: { icon: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  cyan: { icon: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10' },
  orange: { icon: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
  pink: { icon: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10' },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'blue',
  loading = false,
  subtitle,
}: StatCardProps) {
  const c = colorMap[color];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
          <Skeleton className="h-5 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <div className={cn('flex h-6 w-6 items-center justify-center rounded', c.bg)}>
            <Icon className={cn('h-3.5 w-3.5', c.icon)} />
          </div>
        </div>
        <p className="text-lg font-bold tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {trend !== undefined && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-[10px] font-medium',
                trend >= 0 ? 'text-green-600' : 'text-red-600',
              )}
            >
              {trend >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
              {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && <span className="text-[10px] text-muted-foreground">{trendLabel}</span>}
          {subtitle && !trendLabel && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{children}</div>;
}
