/**
 * TypeScript types for Phase 8: Messaging System.
 */

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'file' | 'product_card' | 'listing_link' | 'store_link' | 'location' | 'contact_card';
export type ConversationReportReason = 'spam' | 'scam' | 'harassment' | 'abuse' | 'threats' | 'offensive_language' | 'fraud' | 'fake_products' | 'other';

// =========================================================================
// Extended Message (with Phase 8 fields)
// =========================================================================

export interface ExtendedMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  ad_id: string | null;
  body: string;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string;
  message_type: MessageType;
  status: MessageStatus;
  edited_at: string | null;
  edited_body: string | null;
  deleted_by_sender: boolean;
  deleted_by_receiver: boolean;
  deleted_for_everyone: boolean;
  reply_to_id: string | null;
  metadata: Record<string, unknown> | null;
  reply_to?: ExtendedMessage | null;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_type: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

// =========================================================================
// Conversation
// =========================================================================

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  ad_id: string | null;
  shop_id: string | null;
  last_message_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count_p1: number;
  unread_count_p2: number;
  is_pinned_p1: boolean;
  is_pinned_p2: boolean;
  is_muted_p1: boolean;
  is_muted_p2: boolean;
  is_archived_p1: boolean;
  is_archived_p2: boolean;
  is_marked_unread_p1: boolean;
  is_marked_unread_p2: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  other_user?: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
  } | null;
  ad?: {
    id: string;
    title: string;
    slug: string;
    price: number | null;
    price_type: string;
    condition: string;
    ad_images: { image_url: string }[];
  } | null;
  shop?: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
}

// =========================================================================
// Typing Indicator
// =========================================================================

export interface TypingIndicator {
  id: string;
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at: string;
}

// =========================================================================
// User Presence
// =========================================================================

export interface UserPresence {
  id: string;
  user_id: string;
  is_online: boolean;
  last_seen: string | null;
  updated_at: string;
}

// =========================================================================
// Message Report
// =========================================================================

export interface MessageReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  message_id: string | null;
  conversation_id: string | null;
  reason: ConversationReportReason;
  description: string | null;
  screenshot_urls: string[];
  status: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageReportInsert {
  reporter_id: string;
  reported_user_id: string;
  message_id?: string | null;
  conversation_id?: string | null;
  reason: ConversationReportReason;
  description?: string | null;
  screenshot_urls?: string[];
}

// =========================================================================
// Message Edit History
// =========================================================================

export interface MessageEditHistory {
  id: string;
  message_id: string;
  old_body: string;
  edited_by: string;
  edited_at: string;
}

// =========================================================================
// Conversation Mute Settings
// =========================================================================

export interface ConversationMuteSettings {
  id: string;
  conversation_id: string;
  user_id: string;
  mute_duration: number;
  mute_until: string | null;
  created_at: string;
}

// =========================================================================
// Send Message Data
// =========================================================================

export interface SendMessageData {
  receiver_id: string;
  body: string;
  ad_id?: string | null;
  shop_id?: string | null;
  message_type?: MessageType;
  reply_to_id?: string | null;
  metadata?: Record<string, unknown>;
  attachments?: File[];
}

// =========================================================================
// Conversation List Item (for display)
// =========================================================================

export interface ConversationListItem {
  conversation: Conversation;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  otherUserOnline: boolean;
  otherUserLastSeen: string | null;
  adTitle: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
}

// =========================================================================
// Spam Detection Result
// =========================================================================

export interface SpamCheckResult {
  isSpam: boolean;
  reasons: string[];
  score: number;
}

// =========================================================================
// Report Reasons Constants
// =========================================================================

export const CONVERSATION_REPORT_REASONS = [
  { code: 'spam', label: 'Spam' },
  { code: 'scam', label: 'Scam' },
  { code: 'harassment', label: 'Harassment' },
  { code: 'abuse', label: 'Abuse' },
  { code: 'threats', label: 'Threats' },
  { code: 'offensive_language', label: 'Offensive Language' },
  { code: 'fraud', label: 'Fraud' },
  { code: 'fake_products', label: 'Fake Products' },
  { code: 'other', label: 'Other' },
] as const;

// =========================================================================
// Allowed File Types
// =========================================================================

export const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const EDIT_TIME_LIMIT_MINUTES = 15;
export const DELETE_FOR_EVERYONE_LIMIT_MINUTES = 60;
