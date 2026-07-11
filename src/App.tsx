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
import { lazy, Suspense } from "react";
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
import Compare from "./pages/Compare";

// Admin pages - lazy loaded for better performance
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdModeration = lazy(() => import("./pages/admin/AdModeration"));
const CategoryManagement = lazy(() => import("./pages/admin/CategoryManagement"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const ReportManagement = lazy(() => import("./pages/admin/ReportManagement"));
const AuditLogPage = lazy(() => import("./pages/admin/AuditLog"));
const AnalyticsPage = lazy(() => import("./pages/admin/Analytics"));
const SettingsPage = lazy(() => import("./pages/admin/Settings"));
const SupportPage = lazy(() => import("./pages/admin/Support"));
const TrustVerification = lazy(() => import("./pages/admin/TrustVerification"));
const FraudDetection = lazy(() => import("./pages/admin/FraudDetection"));
const PermissionsPage = lazy(() => import("./pages/admin/Permissions"));
const MediaLibrary = lazy(() => import("./pages/admin/MediaLibrary"));
const ReviewModeration = lazy(() => import("./pages/admin/ReviewModeration"));
const MessageMonitoring = lazy(() => import("./pages/admin/MessageMonitoring"));
const CMSPage = lazy(() => import("./pages/admin/CMS"));
const SEOPage = lazy(() => import("./pages/admin/SEO"));
const WorkflowAutomation = lazy(() => import("./pages/admin/WorkflowAutomation"));
const AdminTools = lazy(() => import("./pages/admin/AdminTools"));
const Reporting = lazy(() => import("./pages/admin/Reporting"));
const APILogs = lazy(() => import("./pages/admin/APILogs"));
const SystemMonitoring = lazy(() => import("./pages/admin/SystemMonitoring"));
const Compliance = lazy(() => import("./pages/admin/Compliance"));
const Developer = lazy(() => import("./pages/admin/Developer"));
const BackupRecovery = lazy(() => import("./pages/admin/BackupRecovery"));

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
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/ad/:slug" element={<AdDetails />} />
                <Route path="/category/:slug" element={<Category />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/search" element={<Search />} />
                <Route path="/compare" element={<Compare />} />

                {/* Authenticated Routes */}
                <Route path="/post-ad" element={<ProtectedRoute><PostAd /></ProtectedRoute>} />
                <Route path="/my-ads" element={<ProtectedRoute><MyAds /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                <Route path="/saved-searches" element={<ProtectedRoute><SavedSearches /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/seller-dashboard" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />

                {/* Admin Routes (require admin role) */}
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

                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              <InstallPrompt />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
