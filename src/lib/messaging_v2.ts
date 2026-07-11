import { supabase } from '@/integrations/supabase/client';

// --- Archive ---

export async function archiveConversation(conversationId: string, userId: string) {
  const { data, error } = await supabase
    .from('conversation_archive')
    .insert({ conversation_id: conversationId, user_id: userId });
  return { data, error };
}

export async function unarchiveConversation(conversationId: string, userId: string) {
  const { data, error } = await supabase
    .from('conversation_archive')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  return { data, error };
}

export async function getArchivedConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversation_archive')
    .select('*')
    .eq('user_id', userId)
    .order('archived_at', { ascending: false });
  return { data, error };
}

// --- Search ---

export async function searchConversations(userId: string, query: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .ilike('body', `%${query}%`)
    .order('created_at', { ascending: false });
  return { data, error };
}

// --- Reactions ---

export async function addMessageReaction(messageId: string, userId: string, emoji: string) {
  const { data, error } = await supabase
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji });
  return { data, error };
}

export async function removeMessageReaction(messageId: string, userId: string, emoji: string) {
  const { data, error } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);
  return { data, error };
}

export async function getMessageReactions(messageId: string) {
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('message_id', messageId);
  return { data, error };
}

// --- Attachments ---

export async function sendMessageAttachment(messageId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${messageId}/${Date.now()}.${fileExt}`;
  const filePath = `message-attachments/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('ad-images')
    .upload(filePath, file);

  if (uploadError) return { data: null, error: uploadError };

  const { data: urlData } = supabase.storage
    .from('ad-images')
    .getPublicUrl(filePath);

  const { data, error } = await supabase
    .from('message_attachments')
    .insert({
      message_id: messageId,
      file_url: urlData.publicUrl,
      file_type: file.type,
      file_name: file.name,
      file_size: file.size,
    })
    .select()
    .single();

  return { data, error };
}

export async function getMessageAttachments(messageId: string) {
  const { data, error } = await supabase
    .from('message_attachments')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: true });
  return { data, error };
}

// --- Quick Replies ---

export async function createQuickReply(userId: string, title: string, body: string) {
  const { data, error } = await supabase
    .from('quick_replies')
    .insert({ user_id: userId, title, body })
    .select()
    .single();
  return { data, error };
}

export async function getQuickReplies(userId: string) {
  const { data, error } = await supabase
    .from('quick_replies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function deleteQuickReply(id: string, userId: string) {
  const { data, error } = await supabase
    .from('quick_replies')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return { data, error };
}

// --- Auto Responses ---

export async function createAutoResponse(userId: string, keyword: string, response: string) {
  const { data, error } = await supabase
    .from('auto_responses')
    .insert({ user_id: userId, keyword, response, is_active: true })
    .select()
    .single();
  return { data, error };
}

export async function getAutoResponses(userId: string) {
  const { data, error } = await supabase
    .from('auto_responses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function toggleAutoResponse(id: string, userId: string, isActive: boolean) {
  const { data, error } = await supabase
    .from('auto_responses')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', userId);
  return { data, error };
}

export async function deleteAutoResponse(id: string, userId: string) {
  const { data, error } = await supabase
    .from('auto_responses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return { data, error };
}

// --- Spam Detection ---

const SPAM_KEYWORDS = [
  'click here', 'free money', 'buy now', 'limited offer', 'act now',
  'congratulations you won', 'lottery', 'crypto giveaway', 'double your',
  'investment opportunity', 'send money', 'wire transfer', 'bitcoin bonus',
];

const SUSPICIOUS_PATTERNS = [
  /https?:\/\/(bit\.ly|tinyurl|t\.co|shorturl)/i,
  /\b\d{16}\b/,
  /(.)\1{10,}/,
];

export function detectMessageSpam(message: string): { isSpam: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const lower = message.toLowerCase();

  for (const keyword of SPAM_KEYWORDS) {
    if (lower.includes(keyword)) {
      reasons.push(`Spam keyword detected: "${keyword}"`);
    }
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(message)) {
      reasons.push('Suspicious pattern detected');
    }
  }

  if (message.length > 2000) {
    reasons.push('Message exceeds maximum length');
  }

  const urlCount = (message.match(/https?:\/\//g) || []).length;
  if (urlCount > 3) {
    reasons.push('Too many URLs in message');
  }

  return { isSpam: reasons.length > 0, reasons };
}

const INAPPROPRIATE_WORDS = [
  'spam', 'scam', 'fraud', 'fake',
];

export function filterMessage(message: string): { filtered: string; wasFiltered: boolean } {
  let filtered = message;
  let wasFiltered = false;

  for (const word of INAPPROPRIATE_WORDS) {
    const regex = new RegExp(word, 'gi');
    if (regex.test(filtered)) {
      filtered = filtered.replace(regex, '*'.repeat(word.length));
      wasFiltered = true;
    }
  }

  return { filtered, wasFiltered };
}

// --- Admin Message Monitoring ---

export interface MessageMonitorFilters {
  status?: string;
  senderId?: string;
  receiverId?: string;
  startDate?: string;
  endDate?: string;
  flaggedOnly?: boolean;
  searchQuery?: string;
}

export async function adminMonitorMessages(filters: MessageMonitorFilters) {
  let query = supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(full_name, avatar_url),
      receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (filters.senderId) {
    query = query.eq('sender_id', filters.senderId);
  }
  if (filters.receiverId) {
    query = query.eq('receiver_id', filters.receiverId);
  }
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters.searchQuery) {
    query = query.ilike('body', `%${filters.searchQuery}%`);
  }

  const { data, error } = await query.limit(200);

  if (error) return { data: [], error, flagged: [] };

  const flagged = (data || []).filter((msg: { body: string }) => {
    const { isSpam } = detectMessageSpam(msg.body);
    return isSpam;
  });

  return { data: data || [], error: null, flagged };
}
