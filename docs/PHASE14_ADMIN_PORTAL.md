# Phase 14 — Enterprise Admin Portal (Complete Redesign)

## Overview

The Admin Portal has been completely redesigned into a modern enterprise-grade marketplace administration system, comparable to Amazon Seller Central, Shopify Admin, Stripe Dashboard, and similar enterprise platforms.

## Architecture

### Tech Stack
- **Frontend**: React 18 + Vite + TypeScript
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State**: TanStack React Query
- **Charts**: Recharts
- **Icons**: Lucide React
- **Toasts**: Sonner
- **Routing**: React Router DOM v6

### Database Migration
**File:** `supabase/schema_v14_admin_portal.sql`

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

## Redesigned Components

### Core Infrastructure (`src/components/admin/`)
| File | Purpose |
|------|---------|
| `AdminLayout.tsx` | Collapsible sidebar with 9 nav sections, search filter, mobile sheet, compact 12px text, dark mode |
| `DataTable.tsx` | Reusable table with sort, search, pagination, selection, bulk actions, export, loading skeletons, empty states |
| `PageHeader.tsx` | Compact title with breadcrumbs and actions |
| `StatCard.tsx` | Compact stat cards with trend indicators and color coding |

### Redesigned Admin Pages (`src/pages/admin/`)
| File | Features |
|------|----------|
| `AdminDashboardV2.tsx` | 8 stat cards, area charts, activity feed, pending listings queue, reports, system health, quick actions, customizable widgets, notifications dialog |
| `UserManagement.tsx` | Data table with search/filter/sort/pagination, bulk suspend/verify/delete, confirmation dialogs, CSV export, stat cards |
| `AdModeration.tsx` | Tabbed view (pending/all/approved/rejected/featured), bulk approve/reject/feature/delete, reject reason dialog, CSV export |
| `Analytics.tsx` | Tabbed analytics (overview/users/listings/revenue), 6 stat cards, area/bar/pie/composed charts, date range selector |
| `AdminSettings.tsx` | 5 tabs (general/commission/security/notifications/roles), system settings management, per-tab save, roles table |
| `ReportManagement.tsx` | Report queue with type/status filters, resolve/escalate/close actions, resolution notes, CSV export |
| `CategoryManagement.tsx` | Nested category CRUD with tree view, SEO fields, sort order, active toggle, create/edit/delete dialogs |
| `AdminActivityLog.tsx` | Activity log with action type filter, color-coded badges, stat cards, CSV export |
| `Transactions.tsx` | Transactions list with status/type filters, color-coded amounts, stat cards, CSV export |
| `Payouts.tsx` | Payout management with status filter, process/complete/fail actions, failure reason dialog, stat cards |

## UI Design

- **Compact layout**: Dense information display with minimal whitespace
- **Enterprise typography**: 22px titles, 14px card titles, 12px body, 11px labels, 10px badges
- **Dark mode**: Full dark mode support via Tailwind `dark:` classes
- **Responsive**: Desktop-first with mobile sidebar sheet
- **Collapsible sidebar**: 9 navigation sections with icon-based items and search filter
- **Data tables**: Sortable, searchable, paginated with bulk selection and CSV export
- **Loading states**: Skeleton loaders for all data tables and stat cards
- **Empty states**: Contextual empty state messages with icons
- **Confirmation dialogs**: For all destructive actions (delete, suspend, reject, fail)
- **Toast notifications**: Success/error feedback via Sonner
- **Export**: CSV export on all data-heavy pages
- **Role-based access**: All admin routes protected with `AdminRoute` component
- **Audit logging**: All admin actions logged to `admin_activity_log` table

## Customer-Facing UI

The customer-facing UI (homepage, product detail, checkout, orders, seller dashboard, messages, etc.) remains completely unchanged. Admin routes are additive and do not modify any existing routes or components.

## File Structure

```
src/
├── components/admin/
│   ├── AdminLayout.tsx          # Collapsible sidebar + topbar layout
│   ├── DataTable.tsx            # Reusable data table component
│   ├── PageHeader.tsx           # Page title with breadcrumbs
│   └── StatCard.tsx             # Compact stat cards
├── pages/admin/
│   ├── AdminDashboardV2.tsx     # Enterprise dashboard
│   ├── UserManagement.tsx       # User management with bulk actions
│   ├── AdModeration.tsx         # Listing moderation with tabs
│   ├── Analytics.tsx            # Analytics with charts
│   ├── AdminSettings.tsx        # Settings with 5 tabs
│   ├── ReportManagement.tsx     # Report queue
│   ├── CategoryManagement.tsx   # Category CRUD
│   ├── AdminActivityLog.tsx     # Activity log
│   ├── Transactions.tsx         # Transactions list
│   └── Payouts.tsx              # Payout management
├── lib/
│   └── adminPortal.ts           # Admin portal library (existing)
├── hooks/
│   └── useAdminPortal.ts        # Admin portal hook (existing)
└── integrations/supabase/
    └── types_v14_admin.ts       # TypeScript types (existing)

supabase/
└── schema_v14_admin_portal.sql  # Database migration (existing)
```
