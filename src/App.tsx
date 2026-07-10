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
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/Dashboard";
import AdModeration from "./pages/admin/AdModeration";
import CategoryManagement from "./pages/admin/CategoryManagement";
import UserManagement from "./pages/admin/UserManagement";
import ReportManagement from "./pages/admin/ReportManagement";

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

                {/* Authenticated Routes */}
                <Route path="/post-ad" element={<ProtectedRoute><PostAd /></ProtectedRoute>} />
                <Route path="/my-ads" element={<ProtectedRoute><MyAds /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                {/* Admin Routes (require admin role) */}
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/ads" element={<AdminRoute><AdModeration /></AdminRoute>} />
                <Route path="/admin/categories" element={<AdminRoute><CategoryManagement /></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
                <Route path="/admin/reports" element={<AdminRoute><ReportManagement /></AdminRoute>} />

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
