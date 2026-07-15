/**
 * PriceHistoryChart — Line chart showing price changes over time for a listing.
 * Shown on the AdDetails page.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatDistanceToNow, format } from 'date-fns';

interface PriceHistoryChartProps {
  adId: string;
  currentPrice: number | null;
}

interface PricePoint {
  changed_at: string;
  old_price: number | null;
  new_price: number | null;
}

export function PriceHistoryChart({ adId, currentPrice }: PriceHistoryChartProps) {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('price_history')
          .select('changed_at, old_price, new_price')
          .eq('ad_id', adId)
          .order('changed_at', { ascending: true });

        if (error) throw error;

        // Build chart data: include current price as the latest point
        const points = (data || []).map((p: PricePoint) => ({
          date: p.changed_at,
          price: p.new_price,
          oldPrice: p.old_price,
        }));

        // Add current price as final point if different from last history entry
        if (currentPrice !== null && currentPrice !== undefined) {
          const lastPrice = points.length > 0 ? points[points.length - 1].price : null;
          if (lastPrice !== currentPrice) {
            points.push({ date: new Date().toISOString(), price: currentPrice, oldPrice: lastPrice });
          }
        }

        setHistory(points as any);
      } catch {
        setHistory([]);
      }
      setLoading(false);
    };
    fetchHistory();
  }, [adId, currentPrice]);

  if (loading) {
    return <Skeleton className="h-48 rounded-lg" />;
  }

  if (history.length === 0) {
    return null; // Don't show the chart if there's no price history
  }

  if (history.length === 1) {
    return null; // Only one price point — no chart needed
  }

  const firstPrice = history[0].price || history[0].oldPrice || 0;
  const lastPrice = history[history.length - 1].price || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? Math.round((priceChange / firstPrice) * 100) : 0;

  const isDecrease = priceChange < 0;
  const isIncrease = priceChange > 0;

  const chartData = history.map(p => ({
    date: format(new Date(p.date), 'MMM d'),
    price: p.price || 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Price History
          </CardTitle>
          {isDecrease ? (
            <Badge className="bg-green-600 hover:bg-green-600 gap-1">
              <TrendingDown className="h-3 w-3" /> ৳{Math.abs(priceChange).toLocaleString()} ({Math.abs(priceChangePercent)}%) dropped
            </Badge>
          ) : isIncrease ? (
            <Badge className="bg-orange-600 hover:bg-orange-600 gap-1">
              <TrendingUp className="h-3 w-3" /> ৳{priceChange.toLocaleString()} ({priceChangePercent}%) increased
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Minus className="h-3 w-3" /> No change
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isDecrease ? '#10b981' : isIncrease ? '#f97316' : '#6366f1'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isDecrease ? '#10b981' : isIncrease ? '#f97316' : '#6366f1'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              tickFormatter={(v) => `৳${v.toLocaleString()}`}
              width={70}
            />
            <Tooltip
              formatter={(v: number) => [`৳${v.toLocaleString()}`, 'Price']}
              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isDecrease ? '#10b981' : isIncrease ? '#f97316' : '#6366f1'}
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">
          {history.length} price {history.length === 1 ? 'change' : 'changes'} recorded
          {history[0].date && ` · since ${formatDistanceToNow(new Date(history[0].date), { addSuffix: true })}`}
        </p>
      </CardContent>
    </Card>
  );
}
