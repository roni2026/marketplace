# Phase 8 — Messaging System

## Overview

Phase 8 implements a comprehensive real-time Messaging System for BazarBD. It replaces the basic messaging with a full-featured chat interface supporting conversations, real-time delivery, typing indicators, online presence, message types (text, images, files, product cards), read receipts, message editing/deletion, conversation management (pin, archive, mute, mark unread), spam protection, reporting, and admin moderation.

## Architecture

### Database Migration

**File:** `supabase/schema_v8_messaging.sql`

Run this migration after all previous migrations.

### New Enums

| Enum | Values |
|------|--------|
| `message_status` | sent, delivered, read |
| `message_type` | text, image, file, product_card, listing_link, store_link, location, contact_card |
| `conversation_report_reason` | spam, scam, harassment, abuse, threats, offensive_language, fraud, fake_products, other |

### Extended `messages` Table

New columns: `message_type`, `status`, `edited_at`, `edited_body`, `deleted_by_sender`, `deleted_by_receiver`, `deleted_for_everyone`, `reply_to_id`, `metadata`

### New Tables

| Table | Purpose |
|-------|---------|
| `conversations` | Structured conversation management with per-participant flags (pin, mute, archive, unread) |
| `typing_indicators` | Real-time typing status per conversation per user |
| `user_presence` | Online/offline status with last seen |
| `message_reports` | Conversation/message reports for moderation |
| `message_edit_history` | Full edit history for messages |
| `conversation_mute_settings` | Mute duration and expiry tracking |

### Database Functions

| Function | Purpose |
|----------|---------|
| `get_or_create_conversation()` | Get or create a conversation between two users for an ad |
| `update_conversation_last_message()` | Update conversation's last message and increment unread count |
| `mark_conversation_read()` | Mark all messages in a conversation as read |

## Frontend Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/integrations/supabase/types_v8_messaging.ts` | TypeScript types + constants (report reasons, file types, limits) |
| `src/lib/messagingSystem.ts` | Core messaging library (conversations, messages, typing, presence, attachments, search, reports, spam, rate limiting, real-time subscriptions) |
| `src/hooks/useMessagingSystem.ts` | React hook wrapping all messaging functions with real-time subscriptions |
| `src/pages/MessagesV2.tsx` | Full-featured chat interface page |
| `src/pages/admin/MessageModeration.tsx` | Admin message moderation page |
| `src/lib/__tests__/messagingSystem.test.ts` | Tests for spam detection, file validation, rate limiting |
| `src/integrations/supabase/__tests__/types_v8_messaging.test.ts` | Tests for type definitions |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Replaced Messages with MessagesV2, replaced MessageMonitoring with MessageModeration |

### Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/messages` | Authenticated | Full-featured messaging interface |
| `/admin/messages` | Admin | Message moderation and spam monitoring |

## Features

### Conversations

- Buyer ↔ Seller, Buyer ↔ Business Store, Buyer ↔ Individual Seller
- Linked to specific listings or general conversations
- Structured conversation table with per-participant state

### Real-Time Chat

- Instant messaging via Supabase real-time channels
- Online/offline status with presence table
- Last seen tracking
- Auto-refresh via subscriptions
- Message synchronization across devices
- Delivery status (sent → delivered → read)

### Message Types

- Text messages
- Images (JPEG, PNG, WebP, GIF with compression and preview)
- Files (PDF, DOC/DOCX, XLS/XLSX, TXT, ZIP)
- Product cards (shared listing with image, title, price, condition, view button)
- Listing links, store links
- Location sharing, contact card (future-ready)

### Image Sharing

- Multiple image upload with drag-and-drop
- Image preview before sending
- Full-screen image viewer
- Automatic image compression
- Image format validation (JPEG, PNG, WebP, GIF, max 5MB)

### File Sharing

- PDF, DOC/DOCX, XLS/XLSX, TXT, ZIP support
- File size validation (max 10MB)
- File type validation
- Download attachments
- Attachment previews

### Chat Features

- Read receipts (single/double check marks)
- Delivered status
- Typing indicator (animated dots)
- Reply to message (with reply preview)
- Copy message
- Forward message
- Delete message for yourself
- Delete message for everyone (within 60-minute limit)
- Edit message (within 15-minute limit, with edit history)
- Message timestamps
- Date separators (Today, Yesterday, date)
- Unread message counter

### Conversation Management

- Pin conversations
- Archive/unarchive conversations
- Delete conversations
- Mark as unread
- Mute notifications (with duration)
- Search conversations
- Search messages
- Filter conversations (all, unread, pinned, archived)
- Sort by latest activity

### Product Integration

- Product card messages showing image, title, price, condition, seller, "View Listing" button
- Share listings directly into conversations
- Start chat from any listing page (existing AdDetails integration)
- Continue previous conversations related to the same listing

### Notifications

- New message notifications (in-app)
- New conversation notifications
- Notification preferences integration with Phase 6 user preferences

### Spam Protection

- Spam keyword detection (30+ keywords)
- Excessive link detection (3+ links flagged)
- Repeated message detection
- Excessive capitalization detection
- Rate limiting (20 messages per minute per conversation)
- Automatic spam scoring (50+ = blocked)

### Reporting

- 9 report reasons: spam, scam, harassment, abuse, threats, offensive language, fraud, fake products, other
- Additional comments support
- Screenshot attachments support
- Admin review queue
- Report status tracking (pending → reviewing → resolved/dismissed)

### Blocking

- Integration with Phase 6 blocked users system
- Block/unblock users from chat
- Hide blocked conversations

### Privacy & Safety

- Secure message storage
- Attachment validation (type and size)
- User-controlled read receipts
- User-controlled last seen visibility
- Message edit history maintained

### Message Search

- Search by keyword
- Search by listing title
- Search by date range
- Search by attachment type

### Admin Moderation

- Review reported conversations
- Update report status (pending → reviewing → resolved/dismissed)
- Admin notes
- Spam activity monitoring
- User spam report statistics
- View report details with screenshots

## Future Expansion

The architecture supports:
- Voice messages
- Audio and video calls
- Group conversations
- Voice and video attachments
- Automatic message translation
- Message reactions
- Emoji picker
- GIF and sticker support
- Message scheduling
- Disappearing messages
- End-to-end encrypted conversations
- Cross-device session synchronization
