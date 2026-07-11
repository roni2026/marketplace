# Phase 14 — Admin Portal

## Overview

Phase 14 implements a modern, enterprise-grade administration portal with customizable dashboard, comprehensive admin activity logging, system health monitoring, admin notifications, bulk operations, admin preferences, global search, and quick actions.

## Architecture

### Database Migration

**File:** `supabase/schema_v14_admin_portal.sql`

### New Enums

| Enum | Values |
|------|--------|
| `widget_type` | stat, chart, table, alert, custom |
| `bulk_operation_type` | 14 types (approve/reject/delete/feature/boost listings, suspend/verify/delete users, assign role, update settings, export/import data, send notification, cleanup expired) |
| `system_health_status` | healthy, warning, critical, down |

### New Tables

| Table | Purpose |
|-------|---------|
| `admin_dashboard_widgets` | Customizable dashboard widgets per admin |
| `admin_activity_log` | Detailed admin action tracking |
| `system_health_metrics` | System health monitoring |
| `admin_notifications` | Admin-specific notifications |
| `admin_bulk_operations` | Bulk operation tracking with success/failure counts |
| `admin_preferences` | Admin UI and notification preferences |

### Database Functions

| Function | Purpose |
|----------|---------|
| `log_admin_activity()` | Log an admin action |
| `get_dashboard_stats()` | Get comprehensive marketplace statistics |
| `get_user_growth_chart()` | User growth data for charts |
| `get_listing_growth_chart()` | Listing growth data for charts |

## Frontend Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/integrations/supabase/types_v14_admin.ts` | TypeScript types + DEFAULT_WIDGETS constant |
| `src/lib/adminPortal.ts` | Core admin portal library (dashboard, widgets, activity, health, notifications, bulk ops, preferences, search, settings, quick actions, export) |
| `src/hooks/useAdminPortal.ts` | React hook wrapping all admin portal functions |
| `src/pages/admin/AdminDashboardV2.tsx` | Redesigned dashboard with customizable widgets, charts, health, quick actions |
| `src/pages/admin/AdminActivityLog.tsx` | Admin activity log with filtering and export |
| `src/pages/admin/AdminSettings.tsx` | Admin settings with 5 tabs (general, notifications, appearance, security, data) |
| `src/pages/admin/BulkOperations.tsx` | Bulk operation execution and history |
| `src/pages/admin/AdminSearch.tsx` | Global admin search across users, listings, shops |
| `src/lib/__tests__/adminPortal.test.ts` | Tests for constants and types |
| `src/integrations/supabase/__tests__/types_v14_admin.test.ts` | Tests for type definitions |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Added routes for new admin pages |
| `src/components/admin/AdminLayout.tsx` | Added nav items for new pages |

### Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/admin/dashboard` | Admin | Redesigned dashboard with widgets |
| `/admin/activity-log` | Admin | Admin activity log |
| `/admin/settings-v2` | Admin | Enhanced admin settings |
| `/admin/bulk-operations` | Admin | Bulk operations |
| `/admin/search` | Admin | Global admin search |

## Features

### Dashboard

- 8 stat cards: Total Users, Active Users, Online Now, New Users Today, Total Listings, Pending Listings, Total Revenue, Pending Reports
- User Growth chart (30 days, area chart with gradient)
- Listing Growth chart (30 days, area chart with gradient)
- System Health status indicator with metric details
- Pending Items cards with quick action links
- Quick Actions grid (Approve, Reject, Feature, Boost, Suspend, Verify, Bulk Ops, Export)
- Recent Admin Activity feed
- Admin Notifications bell with unread count and dropdown
- Customizable Dashboard dialog with widget visibility toggles and reset

### User Management

Existing pages enhanced with quick actions: Verify User, Suspend User, Unsuspend User, Delete User, Assign Role.

### Listing Management

Existing pages enhanced with quick actions: Approve Listing, Reject Listing, Feature Listing, Boost Listing, Delete Listing.

### Bulk Operations

- 10 operation types: Approve/Reject/Delete/Feature/Boost Listings, Suspend/Verify/Delete Users, Assign Role, Cleanup Expired
- Target IDs input (textarea, line or comma-separated)
- Dynamic parameters based on operation type (reason, role, days)
- Confirmation dialog before execution
- Operation history table with status, counts, and error details
- Error details dialog for failed items

### Admin Activity Log

- Stats: Total Actions, Actions Today, Actions This Week, Unique Admins
- Search by action or resource
- Filter by action type
- Activity table with admin info, action, resource, details, timestamp
- CSV export
- Pagination

### System Health

- Overall health status (healthy/warning/critical)
- Individual metric monitoring with thresholds
- Color-coded status indicators

### Admin Notifications

- Notification bell with unread badge
- Dropdown list with severity indicators
- Mark individual or all as read
- Action URLs for navigation

### Admin Preferences

- Theme (light/dark/system)
- Density (comfortable/compact)
- Sidebar collapsed toggle
- Default landing page
- Notification preferences (email, push, critical, warning, info)
- Language selection

### Global Admin Search

- Search across users, listings, and shops simultaneously
- Tabbed results with counts
- Inline quick actions on each result
- Debounced search (300ms)

### Quick Actions

- Approve/Reject Listing
- Feature/Boost Listing
- Suspend/Unsuspend/Verify User
- All actions logged to admin activity log

### Data Export

- Export any table as CSV or JSON
- Download with timestamped filename

## Future Expansion

The architecture supports:
- Multi-marketplace management
- Franchise/Regional administrators
- AI-assisted moderation
- Fraud detection dashboards
- Business intelligence reports
- Heatmaps
- A/B testing
- Advanced workflow automation
- Plugin/extension system
- Multi-tenant architecture
- External ERP/CRM integrations
