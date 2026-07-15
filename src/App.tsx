import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PostAd from "./pages/PostAd";
import AdDetails from "./pages/AdDetails";
import Category from "./pages/Category";
import Search from "./pages/Search";
import MyAds from "./pages/MyAds";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Categories from "./pages/Categories";
import Messages from "./pages/Messages";
import SavedSearches from "./pages/SavedSearches";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import SellerDashboard from "./pages/SellerDashboard";
import SellerPortal from "./pages/SellerPortal";
import ShopDashboard from "./pages/ShopDashboard";
import ShopSetup from "./pages/ShopSetup";
import ShopSettings from "./pages/ShopSettings";
import PublicShopPage from "./pages/PublicShopPage";
import SellerListings from "./pages/SellerListings";
import PostAdV4 from "./pages/PostAdV4";
import AdvancedSearch from "./pages/AdvancedSearch";
import Discovery from "./pages/Discovery";
import Collections from "./pages/Collections";
import UserPreferences from "./pages/UserPreferences";
import BlockedSellers from "./pages/BlockedSellers";
import HiddenListings from "./pages/HiddenListings";
import UserActivity from "./pages/UserActivity";
import MessagesV2 from "./pages/MessagesV2";
import Compare from "./pages/Compare";
import PublicProfile from "./pages/PublicProfile";
import MyAddresses from "./pages/MyAddresses";
import MySupport from "./pages/MySupport";
import MyOffers from "./pages/MyOffers";
import BrandManagement from "./pages/admin/BrandManagement";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdModeration from "./pages/admin/AdModeration";
import CategoryManagement from "./pages/admin/CategoryManagement";
import UserManagement from "./pages/admin/UserManagement";
import ReportManagement from "./pages/admin/ReportManagement";
import AuditLogPage from "./pages/admin/AuditLog";
import AnalyticsPage from "./pages/admin/Analytics";
import SettingsPage from "./pages/admin/Settings";
import SupportPage from "./pages/admin/Support";
import TrustVerification from "./pages/admin/TrustVerification";
import FraudDetection from "./pages/admin/FraudDetection";
import PermissionsPage from "./pages/admin/Permissions";
import MediaLibrary from "./pages/admin/MediaLibrary";
import ReviewModeration from "./pages/admin/ReviewModeration";
import MessageMonitoring from "./pages/admin/MessageMonitoring";
import CMSPage from "./pages/admin/CMS";
import SEOPage from "./pages/admin/SEO";
import WorkflowAutomation from "./pages/admin/WorkflowAutomation";
import AdminTools from "./pages/admin/AdminTools";
import Reporting from "./pages/admin/Reporting";
import APILogs from "./pages/admin/APILogs";
import SystemMonitoring from "./pages/admin/SystemMonitoring";
import Compliance from "./pages/admin/Compliance";
import Developer from "./pages/admin/Developer";
import BackupRecovery from "./pages/admin/BackupRecovery";
import Products from "./pages/admin/Products";
import Orders from "./pages/admin/Orders";
import Customers from "./pages/admin/Customers";
import Sellers from "./pages/admin/Sellers";
import Transactions from "./pages/admin/Transactions";
import Payouts from "./pages/admin/Payouts";
import Coupons from "./pages/admin/Coupons";
import Inventory from "./pages/admin/Inventory";
import Campaigns from "./pages/admin/Campaigns";
import ShopManagement from "./pages/admin/ShopManagement";
import ShopVerificationReview from "./pages/admin/ShopVerificationReview";
import ListingManagement from "./pages/admin/ListingManagement";
import ListingAnalytics from "./pages/admin/ListingAnalytics";
import SearchAnalytics from "./pages/admin/SearchAnalytics";
import SponsoredListings from "./pages/admin/SponsoredListings";
import SellerReports from "./pages/admin/SellerReports";
import MessageModeration from "./pages/admin/MessageModeration";
import AdminDashboardV2 from "./pages/admin/AdminDashboardV2";
import AdminActivityLog from "./pages/admin/AdminActivityLog";
import AdminSettingsV2 from "./pages/admin/AdminSettings";
import BulkOperations from "./pages/admin/BulkOperations";
import AdminSearch from "./pages/admin/AdminSearch";
// New customer portal pages
import RecentlyViewedPage from "./pages/RecentlyViewedPage";
import PriceAlertsPage from "./pages/PriceAlertsPage";
import NotificationPreferencesPage from "./pages/NotificationPreferencesPage";

// New admin pages
import FeatureFlags from "./pages/admin/FeatureFlags";
import AdminEmailQueue from "./pages/admin/AdminEmailQueue";
import AdminFailedJobs from "./pages/admin/AdminFailedJobs";
import AdminWebhooks from "./pages/admin/AdminWebhooks";
import AdminScheduledReports from "./pages/admin/AdminScheduledReports";
import AdminComplianceDashboard from "./pages/admin/AdminComplianceDashboard";
import AdminRevenueAnalytics from "./pages/admin/AdminRevenueAnalytics";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner richColors closeButton position="top-center" />
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/ad/:slug" element={<AdDetails />} />
                <Route path="/category/:slug" element={<Category />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/search" element={<AdvancedSearch />} />
                <Route path="/discover" element={<Discovery />} />
                <Route path="/collections" element={<ProtectedRoute><Collections /></ProtectedRoute>} />
                <Route path="/preferences" element={<ProtectedRoute><UserPreferences /></ProtectedRoute>} />
                <Route path="/blocked-sellers" element={<ProtectedRoute><BlockedSellers /></ProtectedRoute>} />
                <Route path="/hidden-listings" element={<ProtectedRoute><HiddenListings /></ProtectedRoute>} />
                <Route path="/activity" element={<ProtectedRoute><UserActivity /></ProtectedRoute>} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/user/:userId" element={<PublicProfile />} />

                {/* Authenticated Routes */}
                <Route path="/post-ad" element={<ProtectedRoute><PostAd /></ProtectedRoute>} />
                <Route path="/post-ad-v4" element={<ProtectedRoute><PostAdV4 /></ProtectedRoute>} />
                <Route path="/seller-listings" element={<ProtectedRoute><SellerListings /></ProtectedRoute>} />
                <Route path="/my-ads" element={<ProtectedRoute><MyAds /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><MessagesV2 /></ProtectedRoute>} />
                <Route path="/saved-searches" element={<ProtectedRoute><SavedSearches /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/seller-dashboard" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
                <Route path="/seller-portal" element={<ProtectedRoute><SellerPortal /></ProtectedRoute>} />
                <Route path="/shop-setup" element={<ProtectedRoute><ShopSetup /></ProtectedRoute>} />
                <Route path="/shop-dashboard" element={<ProtectedRoute><ShopDashboard /></ProtectedRoute>} />
                <Route path="/shop-settings" element={<ProtectedRoute><ShopSettings /></ProtectedRoute>} />
                <Route path="/shop/:slug" element={<PublicShopPage />} />

                {/* Admin Routes - /admin shows the admin portal with its own login */}
                <Route path="/admin" element={<AdminRoute><AdminDashboardV2 /></AdminRoute>} />
                <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardV2 /></AdminRoute>} />
                <Route path="/admin/activity-log" element={<AdminRoute><AdminActivityLog /></AdminRoute>} />
                <Route path="/admin/settings-v2" element={<AdminRoute><AdminSettingsV2 /></AdminRoute>} />
                <Route path="/admin/bulk-operations" element={<AdminRoute><BulkOperations /></AdminRoute>} />
                <Route path="/admin/search" element={<AdminRoute><AdminSearch /></AdminRoute>} />
                <Route path="/admin/ads" element={<AdminRoute><AdModeration /></AdminRoute>} />
                <Route path="/admin/categories" element={<AdminRoute><CategoryManagement /></AdminRoute>} />
                <Route path="/admin/brands" element={<AdminRoute><BrandManagement /></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
                <Route path="/admin/reports" element={<AdminRoute><ReportManagement /></AdminRoute>} />
                <Route path="/admin/audit" element={<AdminRoute><AuditLogPage /></AdminRoute>} />
                <Route path="/admin/analytics" element={<AdminRoute><AnalyticsPage /></AdminRoute>} />
                <Route path="/admin/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
                <Route path="/admin/support" element={<AdminRoute><SupportPage /></AdminRoute>} />
                <Route path="/admin/trust" element={<AdminRoute><TrustVerification /></AdminRoute>} />
                <Route path="/admin/fraud" element={<AdminRoute><FraudDetection /></AdminRoute>} />
                <Route path="/admin/permissions" element={<AdminRoute><PermissionsPage /></AdminRoute>} />
                <Route path="/admin/media" element={<AdminRoute><MediaLibrary /></AdminRoute>} />
                <Route path="/admin/reviews" element={<AdminRoute><ReviewModeration /></AdminRoute>} />
                <Route path="/admin/messages" element={<AdminRoute><MessageModeration /></AdminRoute>} />
                <Route path="/admin/cms" element={<AdminRoute><CMSPage /></AdminRoute>} />
                <Route path="/admin/seo" element={<AdminRoute><SEOPage /></AdminRoute>} />
                <Route path="/admin/workflow" element={<AdminRoute><WorkflowAutomation /></AdminRoute>} />
                <Route path="/admin/tools" element={<AdminRoute><AdminTools /></AdminRoute>} />
                <Route path="/admin/reporting" element={<AdminRoute><Reporting /></AdminRoute>} />
                <Route path="/admin/api-logs" element={<AdminRoute><APILogs /></AdminRoute>} />
                <Route path="/admin/monitoring" element={<AdminRoute><SystemMonitoring /></AdminRoute>} />
                <Route path="/admin/compliance" element={<AdminRoute><Compliance /></AdminRoute>} />
                <Route path="/admin/developer" element={<AdminRoute><Developer /></AdminRoute>} />
                <Route path="/admin/backup" element={<AdminRoute><BackupRecovery /></AdminRoute>} />
                <Route path="/admin/products" element={<AdminRoute><Products /></AdminRoute>} />
                <Route path="/admin/orders" element={<AdminRoute><Orders /></AdminRoute>} />
                <Route path="/admin/customers" element={<AdminRoute><Customers /></AdminRoute>} />
                <Route path="/admin/sellers" element={<AdminRoute><Sellers /></AdminRoute>} />
                <Route path="/admin/transactions" element={<AdminRoute><Transactions /></AdminRoute>} />
                <Route path="/admin/payouts" element={<AdminRoute><Payouts /></AdminRoute>} />
                <Route path="/admin/coupons" element={<AdminRoute><Coupons /></AdminRoute>} />
                <Route path="/admin/inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
                <Route path="/admin/campaigns" element={<AdminRoute><Campaigns /></AdminRoute>} />
                <Route path="/admin/shops" element={<AdminRoute><ShopManagement /></AdminRoute>} />
                <Route path="/admin/shop-verifications" element={<AdminRoute><ShopVerificationReview /></AdminRoute>} />
                <Route path="/admin/listing-management" element={<AdminRoute><ListingManagement /></AdminRoute>} />
                <Route path="/admin/listing-analytics" element={<AdminRoute><ListingAnalytics /></AdminRoute>} />
                <Route path="/admin/search-analytics" element={<AdminRoute><SearchAnalytics /></AdminRoute>} />
                <Route path="/admin/sponsored-listings" element={<AdminRoute><SponsoredListings /></AdminRoute>} />
                <Route path="/admin/seller-reports" element={<AdminRoute><SellerReports /></AdminRoute>} />

                
                {/* New Customer Portal Routes */}
                <Route path="/recently-viewed" element={<ProtectedRoute><RecentlyViewedPage /></ProtectedRoute>} />
                <Route path="/price-alerts" element={<ProtectedRoute><PriceAlertsPage /></ProtectedRoute>} />
                <Route path="/notification-preferences" element={<ProtectedRoute><NotificationPreferencesPage /></ProtectedRoute>} />

                <Route path="/my/addresses" element={<ProtectedRoute><MyAddresses /></ProtectedRoute>} />
          <Route path="/my/support" element={<ProtectedRoute><MySupport /></ProtectedRoute>} />
          <Route path="/my/offers" element={<ProtectedRoute><MyOffers /></ProtectedRoute>} />
          
                {/* New Admin Routes */}
                <Route path="/admin/feature-flags" element={<AdminRoute><FeatureFlags /></AdminRoute>} />
                <Route path="/admin/email-queue" element={<AdminRoute><AdminEmailQueue /></AdminRoute>} />
                <Route path="/admin/failed-jobs" element={<AdminRoute><AdminFailedJobs /></AdminRoute>} />
                <Route path="/admin/webhooks" element={<AdminRoute><AdminWebhooks /></AdminRoute>} />
                <Route path="/admin/scheduled-reports" element={<AdminRoute><AdminScheduledReports /></AdminRoute>} />
                <Route path="/admin/compliance-dashboard" element={<AdminRoute><AdminComplianceDashboard /></AdminRoute>} />
                <Route path="/admin/revenue-analytics" element={<AdminRoute><AdminRevenueAnalytics /></AdminRoute>} />
                <Route path="/admin/system-health" element={<AdminRoute><AdminSystemHealth /></AdminRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
              <InstallPrompt />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
