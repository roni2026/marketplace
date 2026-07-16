/**
 * Phase 8 — Messaging System Library
 *
 * Comprehensive messaging utilities:
 * - Conversation management (create, pin, archive, mute, mark unread)
 * - Real-time messaging with Supabase channels
 * - Message types: text, image, file, product card, listing link, store link
 * - Read receipts and delivery status
 * - Typing indicators
 * - User presence (online/offline)
 * - Message editing (with time limit and edit history)
 * - Message deletion (for self and for everyone with time limit)
 * - Message reply and forwarding
 * - Image and file sharing with validation
 * - Product card sharing in chat
 * - Message search
 * - Spam detection and rate limiting
 * - Conversation reporting
 * - User blocking integration
 * - Admin moderation tools
 */

import { supabase } from '@/integrations/supabase/client';
import { isCloudinaryConfigured, uploadToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';
import type {
  ExtendedMessage, Conversation, TypingIndicator, UserPresence,
  MessageReport, MessageReportInsert, MessageEditHistory,
  ConversationMuteSettings, SendMessageData, ConversationListItem,
  SpamCheckResult, MessageType, MessageAttachment,
  CONVERSATION_REPORT_REASONS as _CRR,
} from '@/integrations/supabase/types_v8_messaging';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MAX_IMAGE_SIZE, EDIT_TIME_LIMIT_MINUTES, DELETE_FOR_EVERYONE_LIMIT_MINUTES } from '@/integrations/supabase/types_v8_messaging';
import { sanitizeText } from '@/lib/validation';

// =========================================================================
// Spam Detection
// =========================================================================

const SPAM_KEYWORDS = [
  'click here', 'free money', 'buy now', 'limited offer', 'act now',
  'congratulations you won', 'wire transfer', 'western union',
  'bitcoin investment', 'double your money', 'get rich quick',
];

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

export function checkSpam(message: string, recentMessages: string[] = []): SpamCheckResult {
  const reasons: string[] = [];
  let score = 0;
  const lower = message.toLowerCase();

  // Check spam keywords
  for (const keyword of SPAM_KEYWORDS) {
    if (lower.includes(keyword)) {
      reasons.push(`Contains spam keyword: "${keyword}"`);
      score += 30;
    }
  }

  // Check excessive links
  const urlCount = (message.match(URL_REGEX) || []).length;
  if (urlCount >= 3) {
    reasons.push('Contains multiple links');
    score += 20;
  }

  // Check repeated messages
  const repeatedCount = recentMessages.filter(m => m === message).length;
  if (repeatedCount >= 3) {
    reasons.push('Repeated message');
    score += 25;
  }

  // Check message length (excessively long might be spam)
  if (message.length > 2000) {
    reasons.push('Message too long');
    score += 10;
  }

  // Check for excessive capitalization
  const upperCount = (message.match(/[A-Z]/g) || []).length;
  const letterCount = (message.match(/[a-zA-Z]/g) || []).length;
  if (letterCount > 10 && upperCount / letterCount > 0.7) {
    reasons.push('Excessive capitalization');
    score += 15;
  }

  return { isSpam: score >= 50, reasons, score };
}

// =========================================================================
// File Validation
// =========================================================================

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.type.startsWith('image/')) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: 'Image must be less than 5MB' };
    }
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedImageTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
    }
  } else {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File must be less than 10MB' };
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return { valid: false, error: 'File type not supported' };
    }
  }
  return { valid: true };
}

// =========================================================================
// Conversation Management
// =========================================================================

export async function getOrCreateConversation(
  userId: string,
  otherUserId: string,
  adId?: string | null
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      p_user_1: userId,
      p_user_2: otherUserId,
      p_ad_id: adId || null,
    });
    if (error) { console.error('getOrCreateConversation:', error); return null; }
    return data as string;
  } catch (err) {
    console.error('getOrCreateConversation:', err);
    return null;
  }
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('updated_at', { ascending: false });
  if (error) { console.error('getUserConversations:', error); return []; }
  return (data as Conversation[]) || [];
}

export async function getConversationListItems(userId: string): Promise<ConversationListItem[]> {
  const conversations = await getUserConversations(userId);
  if (conversations.length === 0) return [];

  // Fetch other user profiles
  const otherUserIds = conversations.map(c => c.participant_1 === userId ? c.participant_2 : c.participant_1);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url, is_verified')
    .in('user_id', otherUserIds);
  const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

  // Fetch presence
  const { data: presence } = await supabase
    .from('user_presence')
    .select('user_id, is_online, last_seen')
    .in('user_id', otherUserIds);
  const presenceMap = new Map((presence || []).map((p: any) => [p.user_id, p]));

  // Fetch ad info
  const adIds = conversations.map(c => c.ad_id).filter(Boolean) as string[];
  let adMap = new Map<string, any>();
  if (adIds.length > 0) {
    const { data: ads } = await supabase
      .from('ads')
      .select('id, title, slug, price, price_type, condition, ad_images(image_url)')
      .in('id', adIds);
    adMap = new Map((ads || []).map((a: any) => [a.id, a]));
  }

  // Fetch shop info
  const shopIds = conversations.map(c => c.shop_id).filter(Boolean) as string[];
  let shopMap = new Map<string, any>();
  if (shopIds.length > 0) {
    const { data: shops } = await supabase
      .from('shops')
      .select('id, name, slug, logo_url')
      .in('id', shopIds);
    shopMap = new Map((shops || []).map((s: any) => [s.id, s]));
  }

  return conversations.map(conv => {
    const isP1 = conv.participant_1 === userId;
    const otherUserId = isP1 ? conv.participant_2 : conv.participant_1;
    const profile = profileMap.get(otherUserId);
    const pres = presenceMap.get(otherUserId);

    return {
      conversation: conv,
      otherUserId,
      otherUserName: profile?.full_name || 'Unknown User',
      otherUserAvatar: profile?.avatar_url || null,
      otherUserOnline: pres?.is_online || false,
      otherUserLastSeen: pres?.last_seen || null,
      adTitle: conv.ad_id ? adMap.get(conv.ad_id)?.title : null,
      lastMessage: conv.last_message_preview,
      lastMessageAt: conv.last_message_at,
      unreadCount: isP1 ? conv.unread_count_p1 : conv.unread_count_p2,
      isPinned: isP1 ? conv.is_pinned_p1 : conv.is_pinned_p2,
      isMuted: isP1 ? conv.is_muted_p1 : conv.is_muted_p2,
      isArchived: isP1 ? conv.is_archived_p1 : conv.is_archived_p2,
    };
  });
}

export async function pinConversation(conversationId: string, userId: string, pin: boolean): Promise<boolean> {
  const conv = await getConversationById(conversationId);
  if (!conv) return false;
  const isP1 = conv.participant_1 === userId;
  const updates = isP1 ? { is_pinned_p1: pin } : { is_pinned_p2: pin };
  const { error } = await supabase.from('conversations').update(updates).eq('id', conversationId);
  if (error) { console.error('pinConversation:', error); return false; }
  return true;
}

export async function archiveConversationV2(conversationId: string, userId: string, archive: boolean): Promise<boolean> {
  const conv = await getConversationById(conversationId);
  if (!conv) return false;
  const isP1 = conv.participant_1 === userId;
  const updates = isP1 ? { is_archived_p1: archive } : { is_archived_p2: archive };
  const { error } = await supabase.from('conversations').update(updates).eq('id', conversationId);
  if (error) { console.error('archiveConversationV2:', error); return false; }
  return true;
}

export async function muteConversation(conversationId: string, userId: string, mute: boolean, durationHours: number = 0): Promise<boolean> {
  const conv = await getConversationById(conversationId);
  if (!conv) return false;
  const isP1 = conv.participant_1 === userId;
  const updates: Record<string, unknown> = isP1 ? { is_muted_p1: mute } : { is_muted_p2: mute };
  const { error } = await supabase.from('conversations').update(updates).eq('id', conversationId);
  if (error) { console.error('muteConversation:', error); return false; }

  // Set mute settings
  if (mute && durationHours > 0) {
    const muteUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    await supabase.from('conversation_mute_settings').upsert({
      conversation_id: conversationId,
      user_id: userId,
      mute_duration: durationHours,
      mute_until: muteUntil,
    }, { onConflict: 'conversation_id, user_id' });
  } else if (!mute) {
    await supabase.from('conversation_mute_settings').delete().eq('conversation_id', conversationId).eq('user_id', userId);
  }
  return true;
}

export async function markConversationUnread(conversationId: string, userId: string, unread: boolean): Promise<boolean> {
  const conv = await getConversationById(conversationId);
  if (!conv) return false;
  const isP1 = conv.participant_1 === userId;
  const updates = isP1 ? { is_marked_unread_p1: unread } : { is_marked_unread_p2: unread };
  const { error } = await supabase.from('conversations').update(updates).eq('id', conversationId);
  if (error) { console.error('markConversationUnread:', error); return false; }
  return true;
}

export async function markConversationRead(conversationId: string, userId: string): Promise<boolean> {
  try {
    await supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
      p_user_id: userId,
    });
    return true;
  } catch (err) {
    console.error('markConversationRead:', err);
    return false;
  }
}

export async function deleteConversation(conversationId: string, userId: string): Promise<boolean> {
  // Soft delete: archive for the user
  return archiveConversationV2(conversationId, userId, true);
}

export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();
  if (error) { console.error('getConversationById:', error); return null; }
  return data as Conversation;
}

// =========================================================================
// Messaging
// =========================================================================

export async function sendMessage(userId: string, data: SendMessageData): Promise<ExtendedMessage | null> {
  // Spam check
  const spamResult = checkSpam(data.body);
  if (spamResult.isSpam) {
    toast.error('Your message was flagged as potential spam');
    return null;
  }

  // Get or create conversation
  const conversationId = await getOrCreateConversation(userId, data.receiver_id, data.ad_id);
  if (!conversationId) { toast.error('Failed to start conversation'); return null; }

  const { data: msgData, error } = await supabase
    .from('messages')
    .insert({
      sender_id: userId,
      receiver_id: data.receiver_id,
      ad_id: data.ad_id || null,
      body: sanitizeText(data.body),
      message_type: data.message_type || 'text',
      status: 'sent',
      reply_to_id: data.reply_to_id || null,
      metadata: data.metadata || {},
    })
    .select()
    .single();

  if (error) { toast.error('Failed to send message'); console.error('sendMessage:', error); return null; }

  const message = msgData as ExtendedMessage;

  // Update conversation last message
  await supabase.rpc('update_conversation_last_message', {
    p_conversation_id: conversationId,
    p_message_id: message.id,
    p_preview: data.body.slice(0, 100),
    p_sender_id: userId,
  });

  // Upload attachments if any
  if (data.attachments && data.attachments.length > 0) {
    for (const file of data.attachments) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        continue;
      }
      await uploadAttachment(message.id, file);
    }
  }

  // Create notification for receiver
  await supabase.from('notifications').insert({
    user_id: data.receiver_id,
    type: 'new_message',
    title: 'New Message',
    message: `You have a new message`,
    data: { conversation_id: conversationId, message_id: message.id },
  });

  return message;
}

export async function getConversationMessages(conversationId: string, page: number = 1, perPage: number = 50): Promise<ExtendedMessage[]> {
  const conv = await getConversationById(conversationId);
  if (!conv) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${conv.participant_1},receiver_id.eq.${conv.participant_2}),and(sender_id.eq.${conv.participant_2},receiver_id.eq.${conv.participant_1})`)
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) { console.error('getConversationMessages:', error); return []; }

  const messages = ((data as ExtendedMessage[]) || []).reverse();

  // Fetch attachments for these messages
  const messageIds = messages.map(m => m.id);
  if (messageIds.length > 0) {
    const { data: attachments } = await supabase
      .from('message_attachments')
      .select('*')
      .in('message_id', messageIds);
    if (attachments) {
      const attMap = new Map<string, MessageAttachment[]>();
      (attachments as MessageAttachment[]).forEach(att => {
        if (!attMap.has(att.message_id)) attMap.set(att.message_id, []);
        attMap.get(att.message_id)!.push(att);
      });
      messages.forEach(m => {
        m.attachments = attMap.get(m.id) || [];
      });
    }
  }

  return messages;
}

export async function editMessage(messageId: string, userId: string, newBody: string): Promise<boolean> {
  // Check time limit
  const { data: msg } = await supabase.from('messages').select('created_at, sender_id').eq('id', messageId).single();
  if (!msg) { toast.error('Message not found'); return false; }
  if (msg.sender_id !== userId) { toast.error('You can only edit your own messages'); return false; }

  const ageMinutes = (Date.now() - new Date(msg.created_at).getTime()) / (1000 * 60);
  if (ageMinutes > EDIT_TIME_LIMIT_MINUTES) {
    toast.error(`Messages can only be edited within ${EDIT_TIME_LIMIT_MINUTES} minutes`);
    return false;
  }

  // Save edit history
  const { data: currentMsg } = await supabase.from('messages').select('body').eq('id', messageId).single();
  if (currentMsg) {
    await supabase.from('message_edit_history').insert({
      message_id: messageId,
      old_body: currentMsg.body,
      edited_by: userId,
    });
  }

  const { error } = await supabase
    .from('messages')
    .update({
      body: sanitizeText(newBody),
      edited_at: new Date().toISOString(),
      edited_body: newBody,
    })
    .eq('id', messageId)
    .eq('sender_id', userId);

  if (error) { toast.error('Failed to edit message'); return false; }
  return true;
}

export async function deleteMessageForSelf(messageId: string, userId: string, isSender: boolean): Promise<boolean> {
  const updates = isSender ? { deleted_by_sender: true } : { deleted_by_receiver: true };
  const { error } = await supabase
    .from('messages')
    .update(updates)
    .eq('id', messageId);
  if (error) { toast.error('Failed to delete message'); return false; }
  return true;
}

export async function deleteMessageForEveryone(messageId: string, userId: string): Promise<boolean> {
  const { data: msg } = await supabase.from('messages').select('created_at, sender_id').eq('id', messageId).single();
  if (!msg) { toast.error('Message not found'); return false; }
  if (msg.sender_id !== userId) { toast.error('You can only delete your own messages'); return false; }

  const ageMinutes = (Date.now() - new Date(msg.created_at).getTime()) / (1000 * 60);
  if (ageMinutes > DELETE_FOR_EVERYONE_LIMIT_MINUTES) {
    toast.error(`Messages can only be deleted for everyone within ${DELETE_FOR_EVERYONE_LIMIT_MINUTES} minutes`);
    return false;
  }

  const { error } = await supabase
    .from('messages')
    .update({
      deleted_for_everyone: true,
      body: 'This message was deleted',
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('sender_id', userId);

  if (error) { toast.error('Failed to delete message'); return false; }
  return true;
}

export async function forwardMessage(messageId: string, userId: string, receiverId: string, adId?: string): Promise<ExtendedMessage | null> {
  const { data: original } = await supabase.from('messages').select('body, message_type, metadata').eq('id', messageId).single();
  if (!original) { toast.error('Message not found'); return null; }

  return sendMessage(userId, {
    receiver_id: receiverId,
    body: original.body,
    ad_id: adId,
    message_type: original.message_type as MessageType,
    metadata: original.metadata as Record<string, unknown>,
  });
}

export async function copyMessage(messageId: string): Promise<string | null> {
  const { data } = await supabase.from('messages').select('body').eq('id', messageId).single();
  if (!data) return null;
  try {
    await navigator.clipboard.writeText(data.body);
    toast.success('Message copied');
    return data.body;
  } catch {
    return null;
  }
}

// =========================================================================
// Attachments
// =========================================================================

export async function uploadAttachment(messageId: string, file: File): Promise<MessageAttachment | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'file';
  const filePath = `message-attachments/${messageId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  let fileUrl = '';
  if (isCloudinaryConfigured()) {
    try {
      const up = await uploadToCloudinary(file, {
        folder: `bazarbd/messages/${messageId}`,
        tags: ['message', messageId],
      });
      fileUrl = up.secure_url;
    } catch (err) {
      console.error('Cloudinary uploadAttachment:', err);
    }
  }
  if (!fileUrl) {
    const { error: uploadError } = await supabase.storage
      .from('ad-images')
      .upload(filePath, file);
    if (uploadError) { console.error('uploadAttachment:', uploadError); return null; }
    const { data: urlData } = supabase.storage.from('ad-images').getPublicUrl(filePath);
    fileUrl = urlData.publicUrl;
  }

  const { data, error } = await supabase
    .from('message_attachments')
    .insert({
      message_id: messageId,
      file_url: fileUrl,
      file_type: file.type,
      file_name: file.name,
      file_size: file.size,
    })
    .select()
    .single();

  if (error) { console.error('uploadAttachment insert:', error); return null; }
  return data as MessageAttachment;
}

export async function getMessageAttachments(messageId: string): Promise<MessageAttachment[]> {
  const { data, error } = await supabase
    .from('message_attachments')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: true });
  if (error) { console.error('getMessageAttachments:', error); return []; }
  return (data as MessageAttachment[]) || [];
}

// =========================================================================
// Typing Indicators
// =========================================================================

export async function setTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
  await supabase.from('typing_indicators').upsert({
    conversation_id: conversationId,
    user_id: userId,
    is_typing: isTyping,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'conversation_id, user_id' });
}

export async function getTypingIndicator(conversationId: string): Promise<TypingIndicator[]> {
  const { data, error } = await supabase
    .from('typing_indicators')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('is_typing', true);
  if (error) { console.error('getTypingIndicator:', error); return []; }
  return (data as TypingIndicator[]) || [];
}

// =========================================================================
// User Presence
// =========================================================================

export async function updatePresence(userId: string, isOnline: boolean): Promise<void> {
  await supabase.from('user_presence').upsert({
    user_id: userId,
    is_online: isOnline,
    last_seen: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

export async function getUserPresence(userId: string): Promise<UserPresence | null> {
  const { data, error } = await supabase
    .from('user_presence')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('getUserPresence:', error); return null; }
  return data as UserPresence | null;
}

export async function getBatchPresence(userIds: string[]): Promise<Map<string, UserPresence>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('user_presence')
    .select('*')
    .in('user_id', userIds);
  if (error) { console.error('getBatchPresence:', error); return new Map(); }
  return new Map((data || []).map((p: any) => [p.user_id, p]));
}

// =========================================================================
// Message Search
// =========================================================================

export async function searchMessages(userId: string, query: string, filters?: {
  adId?: string;
  dateFrom?: string;
  dateTo?: string;
  attachmentType?: string;
}): Promise<ExtendedMessage[]> {
  let queryBuilder = supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .ilike('body', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (filters?.adId) queryBuilder = queryBuilder.eq('ad_id', filters.adId);
  if (filters?.dateFrom) queryBuilder = queryBuilder.gte('created_at', filters.dateFrom);
  if (filters?.dateTo) queryBuilder = queryBuilder.lte('created_at', filters.dateTo);

  const { data, error } = await queryBuilder;
  if (error) { console.error('searchMessages:', error); return []; }
  return (data as ExtendedMessage[]) || [];
}

// =========================================================================
// Message Reports
// =========================================================================

export async function createMessageReport(report: MessageReportInsert): Promise<boolean> {
  const { error } = await supabase.from('message_reports').insert(report);
  if (error) { toast.error('Failed to submit report'); console.error('createMessageReport:', error); return false; }
  toast.success('Report submitted. We will review it shortly.');
  return true;
}

export async function getUserMessageReports(userId: string): Promise<MessageReport[]> {
  const { data, error } = await supabase
    .from('message_reports')
    .select('*')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getUserMessageReports:', error); return []; }
  return (data as MessageReport[]) || [];
}

export async function getAllMessageReports(): Promise<MessageReport[]> {
  const { data, error } = await supabase
    .from('message_reports')
    .select('*, reporter:profiles!message_reports_reporter_id_fkey(full_name), reported:profiles!message_reports_reported_user_id_fkey(full_name)')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAllMessageReports:', error); return []; }
  return (data as MessageReport[]) || [];
}

export async function updateMessageReportStatus(
  reportId: string,
  status: string,
  adminNotes?: string,
  resolvedBy?: string
): Promise<boolean> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (adminNotes !== undefined) updates.admin_notes = adminNotes;
  if (status === 'resolved' || status === 'dismissed') {
    updates.is_resolved = true;
    updates.resolved_at = new Date().toISOString();
    if (resolvedBy) updates.resolved_by = resolvedBy;
  }
  const { error } = await supabase.from('message_reports').update(updates).eq('id', reportId);
  if (error) { console.error('updateMessageReportStatus:', error); return false; }
  return true;
}

// =========================================================================
// Message Edit History
// =========================================================================

export async function getMessageEditHistory(messageId: string): Promise<MessageEditHistory[]> {
  const { data, error } = await supabase
    .from('message_edit_history')
    .select('*')
    .eq('message_id', messageId)
    .order('edited_at', { ascending: false });
  if (error) { console.error('getMessageEditHistory:', error); return []; }
  return (data as MessageEditHistory[]) || [];
}

// =========================================================================
// Product Card Sharing
// =========================================================================

export async function shareProductInChat(
  userId: string,
  receiverId: string,
  adId: string,
  message?: string
): Promise<ExtendedMessage | null> {
  // Fetch ad details for metadata
  const { data: ad } = await supabase
    .from('ads')
    .select('id, title, slug, price, price_type, condition, ad_images(image_url)')
    .eq('id', adId)
    .single();

  if (!ad) { toast.error('Listing not found'); return null; }

  return sendMessage(userId, {
    receiver_id: receiverId,
    body: message || `Check out this listing: ${ad.title}`,
    ad_id: adId,
    message_type: 'product_card',
    metadata: {
      ad_id: ad.id,
      ad_title: ad.title,
      ad_slug: ad.slug,
      ad_price: ad.price,
      ad_price_type: ad.price_type,
      ad_condition: ad.condition,
      ad_image: (ad as any).ad_images?.[0]?.image_url,
    },
  });
}

// =========================================================================
// Rate Limiting (client-side)
// =========================================================================

const messageTimestamps: Map<string, number[]> = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_MESSAGES = 20; // max 20 messages per minute per conversation

export function checkRateLimit(conversationKey: string): boolean {
  const now = Date.now();
  const timestamps = messageTimestamps.get(conversationKey) || [];
  const recent = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_MESSAGES) {
    return false; // Rate limited
  }
  recent.push(now);
  messageTimestamps.set(conversationKey, recent);
  return true;
}

// =========================================================================
// Real-time Subscriptions
// =========================================================================

export function subscribeToMessages(
  conversationId: string,
  userId: string,
  onMessage: (message: ExtendedMessage) => void
) {
  const channelName = `conversation:${conversationId}:${userId}`;
  // Remove any existing channel with the same name
  supabase.getChannels()
    .filter(ch => ch.topic === channelName)
    .forEach(ch => { try { supabase.removeChannel(ch); } catch {} });
  try {
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        {
          event: 'insert',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          onMessage(payload.new as ExtendedMessage);
        }
      )
      .on('postgres_changes',
        {
          event: 'update',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          // Message updated (read status, edit, delete)
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn('subscribeToMessages: failed:', err);
    return null as any;
  }
}

export function subscribeToTyping(
  conversationId: string,
  onTyping: (indicators: TypingIndicator[]) => void
) {
  const channelName = `typing:${conversationId}`;
  supabase.getChannels()
    .filter(ch => ch.topic === channelName)
    .forEach(ch => { try { supabase.removeChannel(ch); } catch {} });
  try {
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          const indicators = await getTypingIndicator(conversationId);
          onTyping(indicators);
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn('subscribeToTyping: failed:', err);
    return null as any;
  }
}

export function subscribeToPresence(
  userId: string,
  onPresenceChange: (presence: UserPresence | null) => void
) {
  const channelName = `presence:${userId}`;
  supabase.getChannels()
    .filter(ch => ch.topic === channelName)
    .forEach(ch => { try { supabase.removeChannel(ch); } catch {} });
  try {
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onPresenceChange(payload.new as UserPresence);
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn('subscribeToPresence: failed:', err);
    return null as any;
  }
}

export function subscribeToConversations(
  userId: string,
  onChange: () => void
) {
  const channelName = `conversations:${userId}`;
  supabase.getChannels()
    .filter(ch => ch.topic === channelName)
    .forEach(ch => { try { supabase.removeChannel(ch); } catch {} });
  try {
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => onChange()
      )
      .on('postgres_changes',
        {
          event: 'insert',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        () => onChange()
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn('subscribeToConversations: failed:', err);
    return null as any;
  }
}
