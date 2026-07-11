// BazarBD — Phase 2: FollowButton component
// components/profile/FollowButton.tsx

import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FollowButtonProps {
  isFollowing: boolean;
  isToggling: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function FollowButton({ isFollowing, isToggling, onToggle, size = 'md' }: FollowButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      onClick={onToggle}
      disabled={isToggling}
      variant={isFollowing ? 'outline' : 'default'}
      size={size}
      className="gap-2"
    >
      {isToggling ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {isFollowing ? t('profile.following') : t('profile.follow')}
    </Button>
  );
}
