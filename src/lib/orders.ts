import { supabase } from '@/integrations/supabase/client';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'meetup_set'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type PaymentStatus = 'unpaid' | 'paid_outside' | 'paid' | 'refunded';

export interface MarketplaceOrder {
  id: string;
  order_number: string;
  offer_id: string | null;
  ad_id: string | null;
  buyer_id: string;
  seller_id: string;
  amount: number;
  currency: string;
  status: OrderStatus | string;
  payment_status: PaymentStatus | string;
  payment_method: string | null;
  meetup_location: string | null;
  meetup_at: string | null;
  buyer_notes: string | null;
  seller_notes: string | null;
  cancel_reason: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  ads?: {
    title: string | null;
    slug: string | null;
    price: number | null;
    ad_images?: { image_url: string }[] | null;
  } | null;
  buyer?: { full_name: string | null; avatar_url: string | null; phone_number?: string | null } | null;
  seller?: { full_name: string | null; avatar_url: string | null; phone_number?: string | null } | null;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  meetup_set: 'Meetup set',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: 'Unpaid',
  paid_outside: 'Paid offline',
  paid: 'Paid',
  refunded: 'Refunded',
};

export function generateOrderNumber() {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString(36).toUpperCase().slice(-4);
  return `ORD-${time}${part}`;
}

/** Platform fee rate for sale ledger (display + transaction fee). */
export const PLATFORM_FEE_RATE = 0.05;

export function calcFee(amount: number) {
  return Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
}

export async function createOrderFromOffer(offer: {
  id: string;
  ad_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
}) {
  // Idempotent: return existing order for this offer
  const { data: existing } = await supabase
    .from('marketplace_orders')
    .select('*')
    .eq('offer_id', offer.id)
    .maybeSingle();
  if (existing) return { order: existing as MarketplaceOrder, created: false };

  const order_number = generateOrderNumber();
  const { data, error } = await supabase
    .from('marketplace_orders')
    .insert({
      order_number,
      offer_id: offer.id,
      ad_id: offer.ad_id,
      buyer_id: offer.buyer_id,
      seller_id: offer.seller_id,
      amount: offer.amount,
      currency: 'BDT',
      status: 'pending',
      payment_status: 'unpaid',
    })
    .select('*')
    .single();

  if (error) throw error;
  return { order: data as MarketplaceOrder, created: true };
}

export async function updateOrderStatus(
  orderId: string,
  patch: Partial<{
    status: string;
    payment_status: string;
    payment_method: string | null;
    meetup_location: string | null;
    meetup_at: string | null;
    buyer_notes: string | null;
    seller_notes: string | null;
    cancel_reason: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
  }>,
) {
  const { data, error } = await supabase
    .from('marketplace_orders')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select('*')
    .single();
  if (error) throw error;
  return data as MarketplaceOrder;
}

/** Mark deal complete: order + optional sale transaction for seller + mark ad sold. */
export async function completeOrder(order: MarketplaceOrder, actorId: string) {
  const fee = calcFee(Number(order.amount) || 0);
  const net = Math.round((Number(order.amount) - fee) * 100) / 100;

  const updated = await updateOrderStatus(order.id, {
    status: 'completed',
    payment_status: order.payment_status === 'unpaid' ? 'paid_outside' : order.payment_status,
    completed_at: new Date().toISOString(),
  });

  // Sale ledger for seller (idempotent-ish via reference_id)
  const ref = `order:${order.id}`;
  const { data: existingTx } = await supabase
    .from('transactions')
    .select('id')
    .eq('reference_id', ref)
    .maybeSingle();

  if (!existingTx) {
    await supabase.from('transactions').insert({
      user_id: order.seller_id,
      ad_id: order.ad_id,
      transaction_type: 'sale',
      status: 'completed',
      amount: order.amount,
      fee,
      net_amount: net,
      currency: order.currency || 'BDT',
      payment_method: order.payment_method || 'offline',
      reference_id: ref,
      description: `Sale from order ${order.order_number}`,
      metadata: {
        order_id: order.id,
        buyer_id: order.buyer_id,
        completed_by: actorId,
      },
    });
  }

  if (order.ad_id) {
    await supabase
      .from('ads')
      .update({ status: 'sold', updated_at: new Date().toISOString() })
      .eq('id', order.ad_id)
      .in('status', ['approved', 'boosted', 'premium', 'pending']);
  }

  // Notify the other party
  const otherId = actorId === order.buyer_id ? order.seller_id : order.buyer_id;
  await supabase.from('notifications').insert({
    user_id: otherId,
    type: 'system',
    title: 'Order completed',
    message: `Order ${order.order_number} was marked completed.`,
    data: { order_id: order.id },
  });

  return updated;
}

export async function notifyOrderParty(
  userId: string,
  title: string,
  message: string,
  orderId: string,
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'system',
    title,
    message,
    data: { order_id: orderId },
  });
}

export const ORDER_SELECT = `
  *,
  ads:ad_id (title, slug, price, ad_images(image_url))
`;
