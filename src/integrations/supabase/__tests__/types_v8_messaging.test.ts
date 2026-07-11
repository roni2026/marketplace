import { describe, it, expect } from 'vitest';
import type {
  MessageStatus, MessageType, ConversationReportReason,
  ExtendedMessage, Conversation, TypingIndicator, UserPresence,
  MessageReport, MessageReportInsert, MessageEditHistory,
  ConversationMuteSettings, SendMessageData, ConversationListItem,
  SpamCheckResult, MessageAttachment,
} from '@/integrations/supabase/types_v8_messaging';
import { CONVERSATION_REPORT_REASONS, ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MAX_IMAGE_SIZE, EDIT_TIME_LIMIT_MINUTES, DELETE_FOR_EVERYONE_LIMIT_MINUTES } from '@/integrations/supabase/types_v8_messaging';

describe('Phase 8 Type Definitions', () => {
  it('MessageStatus has all values', () => {
    const statuses: MessageStatus[] = ['sent', 'delivered', 'read'];
    expect(statuses).toHaveLength(3);
  });

  it('MessageType has all 8 values', () => {
    const types: MessageType[] = ['text', 'image', 'file', 'product_card', 'listing_link', 'store_link', 'location', 'contact_card'];
    expect(types).toHaveLength(8);
  });

  it('ConversationReportReason has all 9 values', () => {
    const reasons: ConversationReportReason[] = ['spam', 'scam', 'harassment', 'abuse', 'threats', 'offensive_language', 'fraud', 'fake_products', 'other'];
    expect(reasons).toHaveLength(9);
  });

  it('ExtendedMessage has all Phase 8 fields', () => {
    const msg: ExtendedMessage = {
      id: 'm-1', sender_id: 'u-1', receiver_id: 'u-2', ad_id: null,
      body: 'Hello', is_read: false, read_at: null, created_at: '2024-01-01',
      message_type: 'text', status: 'sent', edited_at: null, edited_body: null,
      deleted_by_sender: false, deleted_by_receiver: false, deleted_for_everyone: false,
      reply_to_id: null, metadata: null,
    };
    expect(msg.message_type).toBe('text');
    expect(msg.status).toBe('sent');
    expect(msg.deleted_for_everyone).toBe(false);
  });

  it('Conversation has all fields including per-participant flags', () => {
    const conv: Conversation = {
      id: 'c-1', participant_1: 'u-1', participant_2: 'u-2', ad_id: null,
      shop_id: null, last_message_id: null, last_message_at: null,
      last_message_preview: null, unread_count_p1: 0, unread_count_p2: 0,
      is_pinned_p1: false, is_pinned_p2: false, is_muted_p1: false, is_muted_p2: false,
      is_archived_p1: false, is_archived_p2: false,
      is_marked_unread_p1: false, is_marked_unread_p2: false,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(conv.participant_1).toBe('u-1');
    expect(conv.is_pinned_p1).toBe(false);
    expect(conv.is_muted_p2).toBe(false);
  });

  it('TypingIndicator has all fields', () => {
    const typing: TypingIndicator = {
      id: 't-1', conversation_id: 'c-1', user_id: 'u-1',
      is_typing: true, updated_at: '2024-01-01',
    };
    expect(typing.is_typing).toBe(true);
  });

  it('UserPresence has all fields', () => {
    const presence: UserPresence = {
      id: 'p-1', user_id: 'u-1', is_online: true,
      last_seen: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(presence.is_online).toBe(true);
  });

  it('MessageReport has all fields', () => {
    const report: MessageReport = {
      id: 'r-1', reporter_id: 'u-1', reported_user_id: 'u-2',
      message_id: null, conversation_id: null, reason: 'spam',
      description: 'Test', screenshot_urls: [], status: 'pending',
      admin_notes: null, resolved_by: null, resolved_at: null,
      is_resolved: false, created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(report.reason).toBe('spam');
    expect(report.status).toBe('pending');
  });

  it('SendMessageData has all fields', () => {
    const data: SendMessageData = {
      receiver_id: 'u-2', body: 'Hello', ad_id: null,
      message_type: 'text', reply_to_id: null, metadata: {},
    };
    expect(data.receiver_id).toBe('u-2');
    expect(data.message_type).toBe('text');
  });

  it('ConversationListItem has all fields', () => {
    const item: ConversationListItem = {
      conversation: {} as Conversation,
      otherUserId: 'u-2', otherUserName: 'John',
      otherUserAvatar: null, otherUserOnline: true,
      otherUserLastSeen: null, adTitle: null,
      lastMessage: 'Hello', lastMessageAt: '2024-01-01',
      unreadCount: 2, isPinned: false, isMuted: false, isArchived: false,
    };
    expect(item.otherUserOnline).toBe(true);
    expect(item.unreadCount).toBe(2);
  });

  it('MessageAttachment has all fields', () => {
    const att: MessageAttachment = {
      id: 'a-1', message_id: 'm-1', file_url: 'https://example.com/file.pdf',
      file_type: 'application/pdf', file_name: 'doc.pdf', file_size: 1024,
      created_at: '2024-01-01',
    };
    expect(att.file_type).toBe('application/pdf');
  });

  it('SpamCheckResult has all fields', () => {
    const result: SpamCheckResult = {
      isSpam: false, reasons: [], score: 0,
    };
    expect(result.isSpam).toBe(false);
  });

  it('CONVERSATION_REPORT_REASONS has 9 reasons', () => {
    expect(CONVERSATION_REPORT_REASONS).toHaveLength(9);
  });

  it('ALLOWED_FILE_TYPES includes images and documents', () => {
    expect(ALLOWED_FILE_TYPES.length).toBeGreaterThan(5);
  });

  it('Constants have correct values', () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    expect(MAX_IMAGE_SIZE).toBe(5 * 1024 * 1024);
    expect(EDIT_TIME_LIMIT_MINUTES).toBe(15);
    expect(DELETE_FOR_EVERYONE_LIMIT_MINUTES).toBe(60);
  });
});
