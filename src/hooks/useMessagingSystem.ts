/**
 * Phase 8 — Messaging System Hook
 *
 * Reactive wrapper for all Phase 8 messaging features:
 * - Conversation management (create, pin, archive, mute, mark unread)
 * - Real-time messaging with Supabase channels
 * - Message CRUD (send, edit, delete, forward, copy)
 * - Typing indicators
 * - User presence
 * - Attachments (images, files)
 * - Product card sharing
 * - Message search
 * - Message reports
 * - Spam detection and rate limiting
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getOrCreateConversation, getConversationListItems, getUserConversations,
  pinConversation, archiveConversationV2, muteConversation,
  markConversationUnread, markConversationRead, deleteConversation,
  getConversationById,
  sendMessage, getConversationMessages,
  editMessage, deleteMessageForSelf, deleteMessageForEveryone,
  forwardMessage, copyMessage,
  uploadAttachment, getMessageAttachments,
  setTyping, getTypingIndicator,
  updatePresence, getUserPresence, getBatchPresence,
  searchMessages,
  createMessageReport, getUserMessageReports,
  getMessageEditHistory,
  shareProductInChat,
  checkRateLimit, checkSpam, validateFile,
  subscribeToMessages, subscribeToTyping, subscribeToPresence, subscribeToConversations,
} from '@/lib/messagingSystem';
import type {
  ExtendedMessage, Conversation, ConversationListItem,
  TypingIndicator, UserPresence, MessageReport, MessageReportInsert,
  MessageEditHistory, SendMessageData, SpamCheckResult,
} from '@/integrations/supabase/types_v8_messaging';

export function useMessagingSystem() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [messageReports, setMessageReports] = useState<MessageReport[]>([]);
  const [editHistory, setEditHistory] = useState<MessageEditHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelsRef = useRef<Record<string, ReturnType<typeof supabase.channel>>>({});

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const data = await getConversationListItems(user.id);
    setConversations(data);
    setIsLoading(false);
  }, [user]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string, page?: number) => {
    setIsLoadingMessages(true);
    const data = await getConversationMessages(conversationId, page || 1);
    setMessages(data);
    setIsLoadingMessages(false);
    // Mark as read
    if (user) await markConversationRead(conversationId, user.id);
  }, [user]);

  // Select conversation
  const selectConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    await fetchMessages(conversationId);
    // Subscribe to real-time messages
    if (user) {
      const channel = subscribeToMessages(conversationId, user.id, (msg) => {
        setMessages(prev => [...prev, msg]);
      });
      if (channel) channelsRef.current[`msg-${conversationId}`] = channel;

      // Subscribe to typing
      const typingChannel = subscribeToTyping(conversationId, (indicators) => {
        setTypingIndicators(indicators);
      });
      if (typingChannel) channelsRef.current[`typing-${conversationId}`] = typingChannel;
    }
  }, [user, fetchMessages]);

  // Send message
  const handleSendMessage = useCallback(async (data: SendMessageData): Promise<ExtendedMessage | null> => {
    if (!user) return null;
    const convKey = `${user.id}-${data.receiver_id}`;
    if (!checkRateLimit(convKey)) {
      setError('You are sending messages too fast. Please slow down.');
      return null;
    }
    setIsSending(true);
    setError(null);
    try {
      const result = await sendMessage(user.id, data);
      if (result && activeConversationId) {
        setMessages(prev => [...prev, result]);
        fetchConversations();
      }
      return result;
    } catch (err) {
      setError('Failed to send message');
      return null;
    } finally {
      setIsSending(false);
    }
  }, [user, activeConversationId, fetchConversations]);

  // Edit message
  const handleEditMessage = useCallback(async (messageId: string, newBody: string) => {
    if (!user) return false;
    const success = await editMessage(messageId, user.id, newBody);
    if (success && activeConversationId) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, body: newBody, edited_at: new Date().toISOString() } : m));
    }
    return success;
  }, [user, activeConversationId]);

  // Delete message for self
  const handleDeleteForSelf = useCallback(async (messageId: string, isSender: boolean) => {
    if (!user) return false;
    const success = await deleteMessageForSelf(messageId, user.id, isSender);
    if (success) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    }
    return success;
  }, [user]);

  // Delete message for everyone
  const handleDeleteForEveryone = useCallback(async (messageId: string) => {
    if (!user) return false;
    const success = await deleteMessageForEveryone(messageId, user.id);
    if (success) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deleted_for_everyone: true, body: 'This message was deleted' } : m));
    }
    return success;
  }, [user]);

  // Forward message
  const handleForward = useCallback(async (messageId: string, receiverId: string, adId?: string) => {
    if (!user) return null;
    return forwardMessage(messageId, user.id, receiverId, adId);
  }, [user]);

  // Copy message
  const handleCopyMessage = useCallback(async (messageId: string) => {
    return copyMessage(messageId);
  }, []);

  // Pin conversation
  const handlePinConversation = useCallback(async (conversationId: string, pin: boolean) => {
    if (!user) return false;
    const success = await pinConversation(conversationId, user.id, pin);
    if (success) fetchConversations();
    return success;
  }, [user, fetchConversations]);

  // Archive conversation
  const handleArchiveConversation = useCallback(async (conversationId: string, archive: boolean) => {
    if (!user) return false;
    const success = await archiveConversationV2(conversationId, user.id, archive);
    if (success) fetchConversations();
    return success;
  }, [user, fetchConversations]);

  // Mute conversation
  const handleMuteConversation = useCallback(async (conversationId: string, mute: boolean, durationHours?: number) => {
    if (!user) return false;
    const success = await muteConversation(conversationId, user.id, mute, durationHours);
    if (success) fetchConversations();
    return success;
  }, [user, fetchConversations]);

  // Mark unread
  const handleMarkUnread = useCallback(async (conversationId: string, unread: boolean) => {
    if (!user) return false;
    const success = await markConversationUnread(conversationId, user.id, unread);
    if (success) fetchConversations();
    return success;
  }, [user, fetchConversations]);

  // Delete conversation
  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return false;
    const success = await deleteConversation(conversationId, user.id);
    if (success) {
      fetchConversations();
      if (activeConversationId === conversationId) setActiveConversationId(null);
    }
    return success;
  }, [user, fetchConversations, activeConversationId]);

  // Typing indicator
  const handleSetTyping = useCallback(async (isTyping: boolean) => {
    if (!user || !activeConversationId) return;
    await setTyping(activeConversationId, user.id, isTyping);
  }, [user, activeConversationId]);

  // Share product
  const handleShareProduct = useCallback(async (receiverId: string, adId: string, message?: string) => {
    if (!user) return null;
    return shareProductInChat(user.id, receiverId, adId, message);
  }, [user]);

  // Search messages
  const handleSearchMessages = useCallback(async (query: string, filters?: {
    adId?: string; dateFrom?: string; dateTo?: string; attachmentType?: string;
  }) => {
    if (!user) return [];
    return searchMessages(user.id, query, filters);
  }, [user]);

  // Reports
  const handleCreateReport = useCallback(async (report: Omit<MessageReportInsert, 'reporter_id'>) => {
    if (!user) return false;
    return createMessageReport({ ...report, reporter_id: user.id });
  }, [user]);

  const fetchMessageReports = useCallback(async () => {
    if (!user) return;
    const data = await getUserMessageReports(user.id);
    setMessageReports(data);
  }, [user]);

  // Edit history
  const fetchEditHistory = useCallback(async (messageId: string) => {
    const data = await getMessageEditHistory(messageId);
    setEditHistory(data);
  }, []);

  // Presence
  const handleUpdatePresence = useCallback(async (isOnline: boolean) => {
    if (!user) return;
    await updatePresence(user.id, isOnline);
  }, [user]);

  const fetchPresence = useCallback(async (userId: string) => {
    const data = await getUserPresence(userId);
    setPresence(data);
  }, []);

  // Initialize: fetch conversations, set online, subscribe
  useEffect(() => {
    if (user) {
      fetchConversations();
      handleUpdatePresence(true);

      const channel = subscribeToConversations(user.id, () => {
        fetchConversations();
      });
      if (channel) channelsRef.current['conversations'] = channel;
    }

    return () => {
      // Cleanup channels
      Object.values(channelsRef.current).forEach(ch => {
        try { supabase.removeChannel(ch); } catch {}
      });
      channelsRef.current = {};
      if (user) handleUpdatePresence(false);
    };
  }, [user, fetchConversations, handleUpdatePresence]);

  return {
    // State
    conversations, messages, activeConversationId, typingIndicators,
    presence, messageReports, editHistory,
    isLoading, isLoadingMessages, isSending, error,

    // Conversation management
    fetchConversations, selectConversation, fetchMessages,
    pinConversation: handlePinConversation,
    archiveConversation: handleArchiveConversation,
    muteConversation: handleMuteConversation,
    markConversationUnread: handleMarkUnread,
    markConversationRead,
    deleteConversation: handleDeleteConversation,
    getOrCreateConversation,
    getConversationById,

    // Messaging
    sendMessage: handleSendMessage,
    editMessage: handleEditMessage,
    deleteMessageForSelf: handleDeleteForSelf,
    deleteMessageForEveryone: handleDeleteForEveryone,
    forwardMessage: handleForward,
    copyMessage: handleCopyMessage,

    // Attachments
    uploadAttachment, getMessageAttachments,

    // Typing
    setTyping: handleSetTyping,

    // Presence
    updatePresence: handleUpdatePresence,
    fetchPresence, getBatchPresence,

    // Product sharing
    shareProductInChat: handleShareProduct,

    // Search
    searchMessages: handleSearchMessages,

    // Reports
    createReport: handleCreateReport,
    fetchMessageReports,

    // Edit history
    fetchEditHistory,

    // Utilities
    checkSpam, validateFile,
  };
}

// Need to import supabase for channel cleanup
import { supabase } from '@/integrations/supabase/client';
