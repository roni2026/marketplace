// BazarBD — Phase 2: ProfileStats component
// components/profile/ProfileStats.tsx

import { Card, CardContent } from '@/components/ui/card';
import { Star, ShoppingBag, Store, Users, MessageSquare, Shield, Clock, Activity } from 'lucide-react';
import type { PublicProfile } from '@/integrations/supabase/types_v2_profiles';
import { formatResponseTime } from '@/lib/profiles';
import { useTranslation } from 'react-i18next';

interface ProfileStatsProps {
  profile: PublicProfile;
}

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export function ProfileStats({ profile }: ProfileStatsProps) {
  const { t } = useTranslation();

  const stats: StatItem[] = [
    {
      label: t('profile.sellerRating'),
      value: profile.seller_rating > 0 ? profile.seller_rating.toFixed(1) : 'N/A',
      icon: Star,
      color: 'text-amber-500',
    },
    {
      label: t('profile.buyerRating'),
      value: profile.buyer_rating > 0 ? profile.buyer_rating.toFixed(1) : 'N/A',
      icon: ShoppingBag,
      color: 'text-blue-500',
    },
    {
      label: t('profile.totalSales'),
      value: profile.total_sales,
      icon: Store,
      color: 'text-green-500',
    },
    {
      label: t('profile.totalPurchases'),
      value: profile.total_purchases,
      icon: ShoppingBag,
      color: 'text-purple-500',
    },
    {
      label: t('profile.followers'),
      value: profile.total_followers,
      icon: Users,
      color: 'text-indigo-500',
    },
    {
      label: t('profile.following'),
      value: profile.total_following,
      icon: Users,
      color: 'text-cyan-500',
    },
    {
      label: t('profile.reviews'),
      value: profile.total_reviews,
      icon: MessageSquare,
      color: 'text-orange-500',
    },
    {
      label: t('profile.trustScore'),
      value: `${Math.round(profile.trust_score)}/100`,
      icon: Shield,
      color: 'text-teal-500',
    },
    {
      label: t('profile.responseRate'),
      value: profile.response_rate > 0 ? `${Math.round(profile.response_rate)}%` : 'N/A',
      icon: Activity,
      color: 'text-pink-500',
    },
    {
      label: t('profile.avgResponseTime'),
      value: formatResponseTime(profile.avg_response_time_hours),
      icon: Clock,
      color: 'text-rose-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-1">
              <Icon className={`h-5 w-5 ${stat.color}`} />
              <span className="text-lg sm:text-xl font-bold">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
