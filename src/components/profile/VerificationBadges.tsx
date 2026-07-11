// BazarBD — Phase 2: VerificationBadges component
// components/profile/VerificationBadges.tsx

import { Badge } from '@/components/ui/badge';
import { BadgeCheck, Mail, Phone, MapPin, Building, Crown, Star, ShieldCheck, IdCard } from 'lucide-react';
import type { VerificationBadge as BadgeType, BadgeType as BadgeTypeEnum } from '@/integrations/supabase/types_v2_profiles';
import { getBadgeInfo } from '@/lib/profiles';
import { useTranslation } from 'react-i18next';

interface VerificationBadgesProps {
  badges: BadgeType[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'mail-check': Mail,
  'phone': Phone,
  'id-card': IdCard,
  'map-pin': MapPin,
  'building': Building,
  'crown': Crown,
  'star': Star,
  'shield-check': ShieldCheck,
  'badge-check': BadgeCheck,
};

export function VerificationBadges({ badges, size = 'md', showLabels = true }: VerificationBadgesProps) {
  const { t } = useTranslation();

  if (!badges || badges.length === 0) return null;

  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => {
        const info = getBadgeInfo(badge.badge_type as BadgeTypeEnum);
        const Icon = iconMap[info.icon] || BadgeCheck;
        return (
          <Badge
            key={badge.id}
            variant="secondary"
            className={`gap-1 ${info.color} bg-opacity-10`}
            title={info.label}
          >
            <Icon className={iconSize} />
            {showLabels && <span className="text-xs">{info.label}</span>}
          </Badge>
        );
      })}
    </div>
  );
}
