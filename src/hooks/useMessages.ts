import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  ad_id: string | null;
  body: string;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string;
}

interface Conversation {
  otherUserId: string;
  otherUserName: string | null;
  otherUserAvatar: string | null;
  adId: string | null;
  adTitle: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export function useMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationUserId, setActiveConversationUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const allMessages = (data as Message[]) || [];
    const convMap = new Map<string, Conversation>();

    for (const msg of allMessages) {
      const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      const key = `${otherUserId}-${msg.ad_id || 'none'}`;
      const existing = convMap.get(key);
      const isUnread = msg.receiver_id === user.id && !msg.is_read;

      if (!existing) {
        convMap.set(key, {
          otherUserId,
          otherUserName: null,
          otherUserAvatar: null,
          adId: msg.ad_id,
          adTitle: null,
          lastMessage: msg.body,
          lastMessageAt: msg.created_at,
          unreadCount: isUnread ? 1 : 0,
        });
      } else {
        if (isUnread) existing.unreadCount++;
      }
    }

    // Fetch user profiles for conversations
    const otherUserIds = [...new Set([...convMap.values()].map((c) => c.otherUserId))];
    if (otherUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', otherUserIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      for (const conv of convMap.values()) {
        const p = profileMap.get(conv.otherUserId);
        if (p) {
          conv.otherUserName = p.full_name;
          conv.otherUserAvatar = p.avatar_url;
        }
      }
    }

    // Fetch ad titles
    const adIds = [...new Set([...convMap.values()].map((c) => c.adId).filter(Boolean))] as string[];
    if (adIds.length > 0) {
      const { data: ads } = await supabase
        .from('ads')
        .select('id, title')
        .in('id', adIds);
      const adMap = new Map((ads || []).map((a) => [a.id, a.title]));
      for (const conv of convMap.values()) {
        if (conv.adId) conv.adTitle = adMap.get(conv.adId) || null;
      }
    }

    setConversations([...convMap.values()].sort((a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    ));
    setUnreadCount(allMessages.filter((m) => m.receiver_id === user.id && !m.is_read).length);
    setIsLoading(false);
  }, [user]);

  const fetchMessages = useCallback(async (otherUserId: string, adId?: string) => {
    if (!user) return;
    let query = supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (adId) {
      query = query.eq('ad_id', adId);
    }

    const { data } = await query;
    setMessages((data as Message[]) || []);

    // Mark as read
    await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);
  }, [user]);

  const sendMessage = useCallback(async (receiverId: string, body: string, adId?: string) => {
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      body,
      ad_id: adId || null,
    });
    if (!error) {
      fetchConversations();
      if (activeConversationUserId === receiverId) {
        fetchMessages(receiverId, adId);
      }
    }
    return { error };
  }, [user, fetchConversations, fetchMessages, activeConversationUserId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!user) return;
    // Use a unique channel name per hook instance — Header and MobileNav
    // both call useMessages(), so they'd collide on the same channel.
    const instanceId = Math.random().toString(36).slice(2, 10);
    const channelName = `messages:${user.id}:${instanceId}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(channelName)
        .on('postgres_changes',
          { event: 'insert', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
          () => fetchConversations()
        )
        .subscribe();
    } catch (err) {
      console.warn('useMessages: failed to subscribe to realtime channel:', err);
    }
    return () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch {}
      }
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    messages,
    unreadCount,
    isLoading,
    activeConversationUserId,
    setActiveConversationUserId,
    fetchMessages,
    sendMessage,
    refetch: fetchConversations,
  };
}
