// BazarBD — Phase 2: useFollows hook
// hooks/useFollows.ts

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
} from '@/lib/profiles';

interface FollowUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export function useFollows(targetUserId?: string) {
  const { user } = useAuth();
  const [isFollowingTarget, setIsFollowingTarget] = useState(false);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const checkFollowing = useCallback(async () => {
    if (!user || !targetUserId || targetUserId === user.id) {
      setIsFollowingTarget(false);
      return;
    }
    const result = await isFollowing(user.id, targetUserId);
    setIsFollowingTarget(result);
  }, [user, targetUserId]);

  const toggleFollow = useCallback(async (): Promise<{ error: Error | null }> => {
    if (!user || !targetUserId) return { error: new Error('Not authenticated') };
    if (targetUserId === user.id) return { error: new Error('Cannot follow yourself') };

    setIsToggling(true);
    try {
      if (isFollowingTarget) {
        const { error } = await unfollowUser(user.id, targetUserId);
        if (error) throw error;
        setIsFollowingTarget(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await followUser(user.id, targetUserId);
        if (error) throw error;
        setIsFollowingTarget(true);
        setFollowersCount(prev => prev + 1);
      }
      setIsToggling(false);
      return { error: null };
    } catch (error) {
      setIsToggling(false);
      return { error: error as Error };
    }
  }, [user, targetUserId, isFollowingTarget]);

  const fetchFollowers = useCallback(async (page = 1, perPage = 20) => {
    if (!targetUserId) return;
    setIsLoading(true);
    const { data, total } = await getFollowers(targetUserId, page, perPage);
    setFollowers(data.map(f => ({
      id: f.follower_id,
      full_name: f.full_name,
      avatar_url: f.avatar_url,
      created_at: f.created_at,
    })));
    setFollowersCount(total);
    setIsLoading(false);
  }, [targetUserId]);

  const fetchFollowing = useCallback(async (page = 1, perPage = 20) => {
    if (!targetUserId) return;
    setIsLoading(true);
    const { data, total } = await getFollowing(targetUserId, page, perPage);
    setFollowing(data.map(f => ({
      id: f.following_id,
      full_name: f.full_name,
      avatar_url: f.avatar_url,
      created_at: f.created_at,
    })));
    setFollowingCount(total);
    setIsLoading(false);
  }, [targetUserId]);

  useEffect(() => {
    if (targetUserId) {
      checkFollowing();
      fetchFollowers();
      fetchFollowing();
    }
  }, [targetUserId, checkFollowing, fetchFollowers, fetchFollowing]);

  return {
    isFollowingTarget,
    followers,
    following,
    followersCount,
    followingCount,
    isLoading,
    isToggling,
    toggleFollow,
    checkFollowing,
    fetchFollowers,
    fetchFollowing,
  };
}
