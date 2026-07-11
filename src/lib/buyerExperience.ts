import { supabase } from '@/integrations/supabase/client';

export interface ComparisonProduct {
  id: string;
  title: string;
  price: number | null;
  price_type: string;
  condition: string;
  division: string;
  district: string;
  area: string | null;
  user_id: string;
  seller_name: string | null;
  seller_rating: number;
  image_url: string | null;
  category_name: string | null;
  created_at: string;
}

export interface SellerComparison {
  seller_id: string;
  seller_name: string | null;
  seller_avatar: string | null;
  total_ads: number;
  avg_rating: number;
  total_reviews: number;
  response_rate: number;
  followers: number;
}

// --- Compare Products ---

export async function compareProducts(adIds: string[]) {
  const { data, error } = await supabase
    .from('ads')
    .select(`
      id,
      title,
      price,
      price_type,
      condition,
      division,
      district,
      area,
      user_id,
      created_at,
      categories(name),
      ad_images(image_url, sort_order),
      profiles!ads_user_id_fkey(full_name, avatar_url)
    `)
    .in('id', adIds);

  if (error || !data) return { products: [] as ComparisonProduct[], error };

  const sellerIds = [...new Set(data.map((ad: any) => ad.user_id))];

  let sellerRatingMap = new Map<string, number>();
  if (sellerIds.length > 0) {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('seller_id, rating')
      .in('seller_id', sellerIds)
      .eq('status', 'approved');

    if (reviews) {
      const ratingMap = new Map<string, { sum: number; count: number }>();
      for (const r of reviews) {
        const existing = ratingMap.get(r.seller_id);
        if (existing) {
          existing.sum += r.rating;
          existing.count++;
        } else {
          ratingMap.set(r.seller_id, { sum: r.rating, count: 1 });
        }
      }
      for (const [id, info] of ratingMap) {
        sellerRatingMap.set(id, info.count > 0 ? info.sum / info.count : 0);
      }
    }
  }

  const products: ComparisonProduct[] = data.map((ad: any) => {
    const sortedImages = (ad.ad_images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    return {
      id: ad.id,
      title: ad.title,
      price: ad.price,
      price_type: ad.price_type,
      condition: ad.condition,
      division: ad.division,
      district: ad.district,
      area: ad.area,
      user_id: ad.user_id,
      seller_name: ad.profiles?.full_name || null,
      seller_rating: sellerRatingMap.get(ad.user_id) || 0,
      image_url: sortedImages[0]?.image_url || null,
      category_name: ad.categories?.name || null,
      created_at: ad.created_at,
    };
  });

  return { products, error: null };
}

// --- Compare Sellers ---

export async function compareSellers(sellerIds: string[]) {
  const results: SellerComparison[] = [];

  for (const sellerId of sellerIds) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', sellerId)
      .maybeSingle();

    const { count: totalAds } = await supabase
      .from('ads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', sellerId);

    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('seller_id', sellerId)
      .eq('status', 'approved');

    const totalReviews = (reviews || []).length;
    const avgRating = totalReviews > 0
      ? reviews!.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalReviews
      : 0;

    const { data: messages } = await supabase
      .from('messages')
      .select('is_read')
      .eq('receiver_id', sellerId)
      .limit(200);

    const totalMsgs = (messages || []).length;
    const readMsgs = (messages || []).filter((m: { is_read: boolean | null }) => m.is_read).length;
    const responseRate = totalMsgs > 0 ? (readMsgs / totalMsgs) * 100 : 0;

    const { count: followers } = await supabase
      .from('seller_followers')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId);

    results.push({
      seller_id: sellerId,
      seller_name: profile?.full_name || null,
      seller_avatar: profile?.avatar_url || null,
      total_ads: totalAds || 0,
      avg_rating: Math.round(avgRating * 100) / 100,
      total_reviews: totalReviews,
      response_rate: Math.round(responseRate * 100) / 100,
      followers: followers || 0,
    });
  }

  return { sellers: results, error: null };
}

// --- Get Similar Items ---

export async function getSimilarItems(adId: string) {
  const { data: ad } = await supabase
    .from('ads')
    .select('category_id, price, division')
    .eq('id', adId)
    .single();

  if (!ad) return { items: [], error: null };

  let query = supabase
    .from('ads')
    .select(`
      id,
      title,
      price,
      price_type,
      condition,
      division,
      district,
      created_at,
      ad_images(image_url, sort_order),
      categories(name)
    `)
    .neq('id', adId)
    .eq('status', 'approved')
    .limit(8);

  if (ad.category_id) {
    query = query.eq('category_id', ad.category_id);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error || !data) return { items: [], error };

  const items = data.map((item: any) => {
    const sortedImages = (item.ad_images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    return {
      id: item.id,
      title: item.title,
      price: item.price,
      price_type: item.price_type,
      condition: item.condition,
      division: item.division,
      district: item.district,
      image_url: sortedImages[0]?.image_url || null,
      category_name: item.categories?.name || null,
      created_at: item.created_at,
    };
  });

  return { items, error: null };
}

// --- Get Recommended Items ---

export async function getRecommendedItems(userId: string) {
  const { data: recommendations } = await supabase
    .from('recommendations')
    .select(`
      ad_id,
      score,
      reason,
      ads(
        id,
        title,
        price,
        price_type,
        condition,
        division,
        district,
        created_at,
        ad_images(image_url, sort_order),
        categories(name)
      )
    `)
    .eq('user_id', userId)
    .order('score', { ascending: false })
    .limit(10);

  if (recommendations && recommendations.length > 0) {
    const items = recommendations.map((rec: any) => {
      const ad = rec.ads;
      if (!ad) return null;
      const sortedImages = (ad.ad_images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      return {
        id: ad.id,
        title: ad.title,
        price: ad.price,
        price_type: ad.price_type,
        condition: ad.condition,
        division: ad.division,
        district: ad.district,
        image_url: sortedImages[0]?.image_url || null,
        category_name: ad.categories?.name || null,
        reason: rec.reason,
        score: rec.score,
        created_at: ad.created_at,
      };
    }).filter(Boolean);

    if (items.length > 0) return { items, error: null };
  }

  const { data: favorites } = await supabase
    .from('favorites')
    .select('ad_id, ads(category_id)')
    .eq('user_id', userId);

  const categoryIds = [...new Set((favorites || []).map((f: any) => f.ads?.category_id).filter(Boolean))] as string[];

  let query = supabase
    .from('ads')
    .select(`
      id,
      title,
      price,
      price_type,
      condition,
      division,
      district,
      created_at,
      ad_images(image_url, sort_order),
      categories(name)
    `)
    .eq('status', 'approved')
    .limit(10);

  if (categoryIds.length > 0) {
    query = query.in('category_id', categoryIds);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error || !data) return { items: [], error };

  const items = data.map((ad: any) => {
    const sortedImages = (ad.ad_images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    return {
      id: ad.id,
      title: ad.title,
      price: ad.price,
      price_type: ad.price_type,
      condition: ad.condition,
      division: ad.division,
      district: ad.district,
      image_url: sortedImages[0]?.image_url || null,
      category_name: ad.categories?.name || null,
      reason: 'Based on your favorites',
      score: 0,
      created_at: ad.created_at,
    };
  });

  return { items, error: null };
}

// --- Get Recently Sold Items ---

export async function getRecentlySoldItems(categoryId?: string) {
  let query = supabase
    .from('recently_sold')
    .select(`
      ad_id,
      sold_at,
      sold_price,
      ads(
        id,
        title,
        price,
        price_type,
        condition,
        division,
        district,
        category_id,
        ad_images(image_url, sort_order),
        categories(name)
      )
    `)
    .order('sold_at', { ascending: false })
    .limit(12);

  const { data, error } = await query;

  if (error || !data) return { items: [], error };

  let items = data.filter((row: any) => row.ads).map((row: any) => {
    const ad = row.ads;
    const sortedImages = (ad.ad_images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    return {
      id: ad.id,
      title: ad.title,
      price: row.sold_price || ad.price,
      price_type: ad.price_type,
      condition: ad.condition,
      division: ad.division,
      district: ad.district,
      image_url: sortedImages[0]?.image_url || null,
      category_name: ad.categories?.name || null,
      sold_at: row.sold_at,
    };
  });

  if (categoryId) {
    items = items.filter((item: any) => item.category_id === categoryId);
  }

  return { items, error: null };
}

// --- Get Recently Price Dropped ---

export async function getRecentlyPriceDropped() {
  const { data, error } = await supabase
    .from('price_drops')
    .select(`
      ad_id,
      old_price,
      new_price,
      dropped_at,
      ads(
        id,
        title,
        price,
        price_type,
        condition,
        division,
        district,
        ad_images(image_url, sort_order),
        categories(name)
      )
    `)
    .order('dropped_at', { ascending: false })
    .limit(12);

  if (error || !data) return { items: [], error };

  const items = data.filter((row: any) => row.ads).map((row: any) => {
    const ad = row.ads;
    const sortedImages = (ad.ad_images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    const dropPercent = row.old_price > 0
      ? Math.round(((row.old_price - row.new_price) / row.old_price) * 100)
      : 0;
    return {
      id: ad.id,
      title: ad.title,
      price: row.new_price,
      old_price: row.old_price,
      price_type: ad.price_type,
      condition: ad.condition,
      division: ad.division,
      district: ad.district,
      image_url: sortedImages[0]?.image_url || null,
      category_name: ad.categories?.name || null,
      drop_percent: dropPercent,
      dropped_at: row.dropped_at,
    };
  });

  return { items, error: null };
}

// --- Get Continue Browsing ---

export async function getContinueBrowsing(userId: string) {
  const { data: recentlyViewed } = await supabase
    .from('recently_viewed')
    .select('ad_id, viewed_at')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(20);

  if (!recentlyViewed || recentlyViewed.length === 0) return { items: [], error: null };

  const adIds = recentlyViewed.map((rv: any) => rv.ad_id);

  const { data, error } = await supabase
    .from('ads')
    .select(`
      id,
      title,
      price,
      price_type,
      condition,
      division,
      district,
      created_at,
      ad_images(image_url, sort_order),
      categories(name)
    `)
    .in('id', adIds)
    .eq('status', 'approved')
    .limit(8);

  if (error || !data) return { items: [], error };

  const viewedAtMap = new Map(recentlyViewed.map((rv: any) => [rv.ad_id, rv.viewed_at]));

  const items = data.map((ad: any) => {
    const sortedImages = (ad.ad_images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    return {
      id: ad.id,
      title: ad.title,
      price: ad.price,
      price_type: ad.price_type,
      condition: ad.condition,
      division: ad.division,
      district: ad.district,
      image_url: sortedImages[0]?.image_url || null,
      category_name: ad.categories?.name || null,
      viewed_at: viewedAtMap.get(ad.id),
      created_at: ad.created_at,
    };
  });

  return { items, error: null };
}

// --- Saved Carts ---

export async function saveCart(userId: string, adIds: string[]) {
  const { data: existing } = await supabase
    .from('saved_carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('saved_carts')
      .update({ ad_ids: adIds })
      .eq('user_id', userId)
      .select()
      .single();
    return { data, error };
  }

  const { data, error } = await supabase
    .from('saved_carts')
    .insert({ user_id: userId, ad_ids: adIds })
    .select()
    .single();

  return { data, error };
}

export async function getSavedCart(userId: string) {
  const { data, error } = await supabase
    .from('saved_carts')
    .select('ad_ids')
    .eq('user_id', userId)
    .maybeSingle();

  return { data, error };
}

// --- Buying Reminders ---

export async function createBuyingReminder(userId: string, adId: string, reminderDate: string) {
  const { data, error } = await supabase
    .from('buying_reminders')
    .insert({
      user_id: userId,
      ad_id: adId,
      reminder_date: reminderDate,
    })
    .select()
    .single();

  return { data, error };
}

export async function getBuyingReminders(userId: string) {
  const { data, error } = await supabase
    .from('buying_reminders')
    .select(`
      id,
      ad_id,
      reminder_date,
      notified,
      created_at,
      ads(id, title, price, price_type, ad_images(image_url, sort_order))
    `)
    .eq('user_id', userId)
    .order('reminder_date', { ascending: true });

  if (error || !data) return { reminders: [], error };

  const reminders = data.map((row: any) => {
    const ad = row.ads;
    const sortedImages = ad ? (ad.ad_images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)) : [];
    return {
      id: row.id,
      ad_id: row.ad_id,
      reminder_date: row.reminder_date,
      notified: row.notified,
      created_at: row.created_at,
      ad: ad ? {
        id: ad.id,
        title: ad.title,
        price: ad.price,
        price_type: ad.price_type,
        image_url: sortedImages[0]?.image_url || null,
      } : null,
    };
  });

  return { reminders, error: null };
}

export async function deleteBuyingReminder(reminderId: string, userId: string) {
  const { data, error } = await supabase
    .from('buying_reminders')
    .delete()
    .eq('id', reminderId)
    .eq('user_id', userId);

  return { data, error };
}
