// BazarBD — Phase 2: ProfileBanner component
// components/profile/ProfileBanner.tsx

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera, Upload, User, BadgeCheck, MapPin, Calendar } from 'lucide-react';
import { VerificationBadges } from './VerificationBadges';
import { formatMemberSince, formatLastActive } from '@/lib/profiles';
import type { PublicProfile } from '@/integrations/supabase/types_v2_profiles';
import { useTranslation } from 'react-i18next';

interface ProfileBannerProps {
  profile: PublicProfile;
  isOwnProfile: boolean;
  isFollowing: boolean;
  isTogglingFollow: boolean;
  onFollowToggle: () => void;
  onBannerUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileBanner({
  profile,
  isOwnProfile,
  isFollowing,
  isTogglingFollow,
  onFollowToggle,
  onBannerUpload,
  onAvatarUpload,
}: ProfileBannerProps) {
  const { t } = useTranslation();
  const initials = (profile.full_name || '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative w-full">
      {/* Banner */}
      <div className="relative h-32 sm:h-40 md:h-56 w-full rounded-xl overflow-hidden bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5">
        {profile.banner_url && (
          <img
            src={profile.banner_url}
            alt="Profile banner"
            className="h-full w-full object-cover"
          />
        )}
        {isOwnProfile && onBannerUpload && (
          <label className="absolute bottom-3 right-3 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={onBannerUpload}
              className="hidden"
            />
            <div className="flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-sm px-3 py-1.5 text-white text-xs font-medium hover:bg-black/70 transition-colors">
              <Camera className="h-3.5 w-3.5" />
              {t('profile.editBanner')}
            </div>
          </label>
        )}
      </div>

      {/* Profile info section */}
      <div className="px-4 sm:px-6 -mt-12 sm:-mt-16 relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background rounded-full">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10">
                {initials || <User className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && onAvatarUpload && (
              <label className="absolute bottom-1 right-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onAvatarUpload}
                  className="hidden"
                />
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors">
                  <Camera className="h-3.5 w-3.5" />
                </div>
              </label>
            )}
          </div>

          {/* Name + badges + actions */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold">
                  {profile.full_name || t('profile.anonymous')}
                </h1>
                {profile.is_verified && (
                  <BadgeCheck className="h-5 w-5 text-primary shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                {profile.division && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.division}
                    {profile.district && `, ${profile.district}`}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('profile.memberSince')} {formatMemberSince(profile.created_at)}
                </span>
              </div>
              {profile.badges.length > 0 && (
                <VerificationBadges badges={profile.badges} size="sm" />
              )}
            </div>

            {/* Follow button */}
            {!isOwnProfile && (
              <Button
                onClick={onFollowToggle}
                disabled={isTogglingFollow}
                variant={isFollowing ? 'outline' : 'default'}
                size="sm"
                className="shrink-0"
              >
                {isTogglingFollow ? '...' : isFollowing ? t('profile.following') : t('profile.follow')}
              </Button>
            )}
          </div>
        </div>

        {/* Last active */}
        <p className="text-xs text-muted-foreground mt-2">
          {t('profile.lastActive')}: {formatLastActive(profile.last_active_at)}
        </p>
      </div>
    </div>
  );
}
