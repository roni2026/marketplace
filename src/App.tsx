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
import Compare from "./pages/Compare";
import PublicProfile from "./pages/PublicProfile";

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
                <Route path="/search" element={<Search />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/user/:userId" element={<PublicProfile />} />

                {/* Authenticated Routes */}
                <Route path="/post-ad" element={<ProtectedRoute><PostAd /></ProtectedRoute>} />
                <Route path="/my-ads" element={<ProtectedRoute><MyAds /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                <Route path="/saved-searches" element={<ProtectedRoute><SavedSearches /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/seller-dashboard" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
                <Route path="/seller-portal" element={<ProtectedRoute><SellerPortal /></ProtectedRoute>} />
                <Route path="/shop-setup" element={<ProtectedRoute><ShopSetup /></ProtectedRoute>} />
                <Route path="/shop-dashboard" element={<ProtectedRoute><ShopDashboard /></ProtectedRoute>} />
                <Route path="/shop-settings" element={<ProtectedRoute><ShopSettings /></ProtectedRoute>} />
                <Route path="/shop/:slug" element={<PublicShopPage />} />

                {/* Admin Routes - /admin shows the admin portal with its own login */}
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/ads" element={<AdminRoute><AdModeration /></AdminRoute>} />
                <Route path="/admin/categories" element={<AdminRoute><CategoryManagement /></AdminRoute>} />
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
                <Route path="/admin/messages" element={<AdminRoute><MessageMonitoring /></AdminRoute>} />
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
