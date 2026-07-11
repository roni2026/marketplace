// BazarBD — Phase 2: TrustScoreBadge component
// components/profile/TrustScoreBadge.tsx

import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
  if (score >= 60) return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
  if (score >= 40) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800';
  if (score >= 20) return 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800';
  return 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Low';
  return 'Poor';
}

export function TrustScoreBadge({ score, size = 'md', showLabel = true }: TrustScoreBadgeProps) {
  const colorClass = getScoreColor(score);
  const label = getScoreLabel(score);
  const sizes = {
    sm: { icon: 'h-3.5 w-3.5', text: 'text-xs', padding: 'px-2 py-0.5' },
    md: { icon: 'h-4 w-4', text: 'text-sm', padding: 'px-3 py-1' },
    lg: { icon: 'h-5 w-5', text: 'text-base', padding: 'px-4 py-1.5' },
  };
  const s = sizes[size];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        colorClass,
        s.padding,
        s.text
      )}
      title={`Trust Score: ${Math.round(score)}/100 — ${label}`}
    >
      <Shield className={s.icon} />
      <span>{Math.round(score)}</span>
      {showLabel && <span className="hidden sm:inline opacity-70">· {label}</span>}
    </div>
  );
}
