# Phase 13 — Notifications & Communication System

## Overview

A professional, enterprise-grade notification system with real-time updates, multi-channel delivery (in-app, push, email, SMS), user preferences, quiet hours, notification templates, and admin notifications.

## Architecture

### Tech Stack
- **Frontend**: React 18 + Vite + TypeScript
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Real-time**: Supabase Realtime (WebSocket)
- **Icons**: Lucide React
- **Date formatting**: date-fns

### Database Migration
**File:** `supabase/schema_v13_notifications.sql`

### New Enums
| Enum | Values |
|------|--------|
| `notification_category` | account, listings, offers, messages, saved_searches, wishlist, reviews, orders, payments, delivery, system, security, promotions, admin |
| `notification_priority` | low, normal, high, urgent |
| `notification_channel` | in_app, push, email, sms |
| `notification_frequency` | instant, daily, weekly, disabled |
| `delivery_status` | pending, sent, delivered, read, failed, bounced |

### New Tables
| Table | Purpose |
|-------|---------|
| `notifications` | Unified notification center with read/archive/delete/pin states |
| `push_subscriptions` | Web Push / FCM / APNs subscription endpoints |
| `email_logs` | Email notification delivery tracking with open/click tracking |
| `sms_logs` | SMS notification delivery tracking |
| `notification_delivery_logs` | Multi-channel delivery tracking with retry support |
| `notification_preferences` | Per-user, per-category, per-channel preferences |
| `quiet_hours` | User-defined quiet hours with timezone support |
| `notification_templates` | System-managed templates with variable interpolation |
| `admin_notifications_v13` | Admin-specific system alerts |
| `notification_summary_queue` | Daily/weekly digest email queue |

### Database Functions
| Function | Purpose |
|----------|---------|
| `create_notification()` | Create a new notification |
| `get_unread_notification_count()` | Get unread count for a user |
| `get_notifications_by_category()` | Get filtered notifications with pagination |
| `mark_notification_read()` | Mark a single notification as read |
| `mark_all_notifications_read()` | Mark all (or by category) as read |
| `archive_notification()` | Archive a notification |
| `delete_notification()` | Soft-delete a notification |
| `pin_notification()` | Pin/unpin a notification |
| `track_notification_click()` | Increment click count |
| `is_in_quiet_hours()` | Check if user is currently in quiet hours |
| `should_send_notification()` | Check preferences + quiet hours for a channel |
| `create_admin_notification_v13()` | Create an admin notification |

### Seeded Templates (60+)
All notification types from the spec are seeded as templates with:
- Title template with `{{variables}}`
- Body template
- Email subject + HTML
- SMS template
- Push title + body
- Icon mapping
- Action URL pattern

## Frontend Implementation

### New Files
| File | Purpose |
|------|---------|
| `src/lib/notifications.ts` | Core notification library (CRUD, realtime, push, preferences, quiet hours, logs, templates, helpers) |
| `src/hooks/useNotifications.ts` | React hook wrapping all notification functions with realtime subscriptions |
| `src/pages/NotificationCenter.tsx` | Full notification center with tabs, filters, bulk actions, infinite scroll |
| `src/pages/NotificationPreferences.tsx` | User preferences with channel toggles, frequency, quiet hours |
| `src/components/NotificationBell.tsx` | Compact bell dropdown for navbar with unread badge |

### Notification Center Features
- **16 tabs**: All, Unread, Read, Archived, Important, Account, Listings, Offers, Messages, Saved Searches, Wishlist, Reviews, Orders, Payments, Delivery, System
- **Real-time updates** via Supabase Realtime
- **Search** by title and body
- **Bulk actions**: Mark read, archive, delete
- **Individual actions**: Mark read, pin, archive, delete (via dropdown)
- **Infinite scrolling** with lazy loading
- **Unread badge** in header
- **Compact UI**: 12px text, small icons, dense rows
- **Loading skeletons** and **empty states**
- **Pinned notifications** sorted first
- **Important flag** with star indicator

### Notification Preferences
- **Channel toggles**: In-App, Push, Email, SMS per category
- **Frequency**: Instant, Daily Summary, Weekly Summary, Disabled
- **Quiet hours**: Enable/disable, start/end time, timezone selector
- **Shop-only categories**: Orders, Payments, Delivery marked with "Shop" badge
- **13 categories** with descriptions

### Notification Bell (Navbar)
- Compact bell icon with unread count badge
- Dropdown with latest 10 notifications
- Mark all read button
- Quick links to full notification center and preferences
- Real-time unread count updates

### Notification Types (60+)
**Account**: welcome, email_verified, phone_verified, password_changed, login_new_device, account_suspended, account_restored
**Listings**: approved, rejected, published, updated, expires_soon, expired, renewed, sold, removed, reported, boosted, featured_expired
**Offers**: received, accepted, rejected, counter_offer, expired, withdrawn
**Messages**: new_message, new_image, voice_message, file_received, mentioned, read_receipt, conversation_archived
**Saved Searches**: new_match, price_match, category_match, location_match
**Wishlist**: price_drop, available, sold, updated
**Reviews**: review_received, seller_replied, buyer_replied
**Orders (Shop)**: new_order, accepted, cancelled, completed
**Payments (Shop)**: received, pending, failed, refund_completed, refund_rejected
**Delivery (Shop)**: packed, courier_assigned, shipped, out_for_delivery, delivered, failed, returned
**System**: maintenance, update
**Promotions**: special_offers

### Admin Notifications
- New user registration
- Seller verification requests
- KYC pending
- Listing pending approval
- Report submitted
- Fraud detected
- Suspicious login
- Copyright complaint
- Payment gateway errors
- System failures
- Backup failures

### Real-time Architecture
- Supabase Realtime channels for `notifications` table
- Auto-subscribe on mount, unsubscribe on unmount
- INSERT events prepend new notifications and increment unread count
- UPDATE events merge changes and recompute unread count
- DELETE events remove from list

### Technical Features
- **Notification templates** with `{{variable}}` interpolation
- **Multi-language support** (template `language` field)
- **Delivery logs** per channel with retry tracking
- **Read receipts** with `read_at` timestamp
- **Click tracking** with `click_count`
- **Error logging** in delivery logs
- **Quiet hours** with timezone-aware computation
- **Scalable architecture** with summary queue for digests

## UI Design
- **Compact layout**: 12px body text, 11px labels, 10px badges
- **Dark mode**: Full `dark:` Tailwind variant support
- **Responsive**: Desktop-first with mobile-friendly tabs
- **Loading skeletons**: For all async sections
- **Empty states**: Contextual messages with icons
- **Color-coded categories**: Each category has unique color
- **Icon mapping**: Each notification type maps to a Lucide icon

## Customer-Facing UI
No existing customer-facing pages are modified. The notification system is additive:
- `NotificationBell` component can be added to the existing navbar
- `/notifications` route shows the full notification center
- `/notifications/preferences` route shows preference settings
