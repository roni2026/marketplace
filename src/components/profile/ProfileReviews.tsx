// BazarBD — Phase 2: ProfileReviews component
// components/profile/ProfileReviews.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, User } from 'lucide-react';
import { useProfileReviews } from '@/hooks/useProfileReviews';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

interface ProfileReviewsProps {
  userId: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({
  reviewerName,
  reviewerAvatar,
  rating,
  title,
  body,
  adTitle,
  isVerified,
  createdAt,
}: {
  reviewerName: string | null;
  reviewerAvatar: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  adTitle: string | null;
  isVerified: boolean;
  createdAt: string;
}) {
  const initials = (reviewerName || '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="border-b border-border last:border-0 pb-4 last:pb-0">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={reviewerAvatar || undefined} />
          <AvatarFallback className="text-xs">
            {initials || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-medium text-sm">{reviewerName || 'Anonymous'}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
          </div>
          <StarRating rating={rating} />
          {title && <p className="text-sm font-medium mt-1">{title}</p>}
          {body && <p className="text-sm text-muted-foreground">{body}</p>}
          {adTitle && (
            <p className="text-xs text-muted-foreground italic">
              {adTitle}
            </p>
          )}
          {isVerified && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Star className="h-3 w-3 fill-green-500 text-green-500" />
              Verified
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProfileReviews({ userId }: ProfileReviewsProps) {
  const { t } = useTranslation();
  const {
    sellerReviews,
    buyerReviews,
    sellerReviewsTotal,
    buyerReviewsTotal,
    isLoading,
    activeTab,
    setActiveTab,
  } = useProfileReviews(userId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('profile.reviews')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'seller' | 'buyer')}>
          <TabsList className="w-full">
            <TabsTrigger value="seller" className="flex-1">
              {t('profile.sellerReviews')} ({sellerReviewsTotal})
            </TabsTrigger>
            <TabsTrigger value="buyer" className="flex-1">
              {t('profile.buyerReviews')} ({buyerReviewsTotal})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seller" className="space-y-4 mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading')}</p>
            ) : sellerReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('profile.noReviews')}</p>
            ) : (
              sellerReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  reviewerName={review.reviewer?.full_name || null}
                  reviewerAvatar={review.reviewer?.avatar_url || null}
                  rating={review.rating}
                  title={review.title}
                  body={review.body}
                  adTitle={review.ad?.title || null}
                  isVerified={review.is_verified_purchase}
                  createdAt={review.created_at}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="buyer" className="space-y-4 mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading')}</p>
            ) : buyerReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('profile.noReviews')}</p>
            ) : (
              buyerReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  reviewerName={review.buyer?.full_name || null}
                  reviewerAvatar={review.buyer?.avatar_url || null}
                  rating={review.rating}
                  title={review.title}
                  body={review.body}
                  adTitle={review.ad?.title || null}
                  isVerified={review.is_verified_transaction}
                  createdAt={review.created_at}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
