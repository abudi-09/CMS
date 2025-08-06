import { Toaster } from "@/components/ui/toaster";
import "./i18n";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Login } from "@/pages/Login";
import { Signup } from "@/pages/Signup";
import { UserDashboard } from "@/pages/UserDashboard";
import { StaffDashboard } from "@/pages/StaffDashboard";
import { AdminDashboard } from "@/pages/AdminDashboard";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import HelpPage from "./pages/HelpPage";
import CalendarView from "@/pages/CalendarView";
import StaffPerformance from "@/pages/StaffPerformance";
import { SubmitComplaint } from "@/pages/SubmitComplaint";
import { MyComplaints } from "@/pages/MyComplaints";
import { StaffManagement } from "@/pages/StaffManagement";
import { FeedbackReview } from "@/pages/FeedbackReview";
import { AssignComplaints } from "@/pages/AssignComplaints";
import { StaffFeedback } from "@/pages/StaffFeedback";
import { MyAssignedComplaints } from "@/pages/MyAssignedComplaints";
import AdminAnalytics from "@/pages/AdminAnalytics";
import UserManagement from "@/pages/UserManagement";
import { CategoryManagement } from "@/pages/CategoryManagement";
import AllComplaints from "@/pages/AllComplaints";

import { Profile } from "@/pages/Profile";
import { Layout } from "@/components/Layout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function DashboardRouter() {
  const { user } = useAuth();

  switch (user?.role) {
    case "staff":
      return <StaffDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      return <UserDashboard />;
  }
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes */}
      {isAuthenticated ? (
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<DashboardRouter />} />
                <Route path="/submit-complaint" element={<SubmitComplaint />} />
                <Route path="/my-complaints" element={<MyComplaints />} />
                <Route path="/staff-management" element={<StaffManagement />} />
                <Route path="/feedback-review" element={<FeedbackReview />} />
                <Route path="/assign" element={<AssignComplaints />} />
                <Route path="/staff-feedback" element={<StaffFeedback />} />
                <Route path="/my-assigned" element={<MyAssignedComplaints />} />
                <Route path="/user-management" element={<UserManagement />} />
                <Route
                  path="/category-management"
                  element={<CategoryManagement />}
                />
                <Route
                  path="/staff-performance"
                  element={<StaffPerformance />}
                />
                <Route path="/calendar-view" element={<CalendarView />} />
                <Route path="/admin-analytics" element={<AdminAnalytics />} />
                <Route path="/all-complaints" element={<AllComplaints />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          }
        />
      ) : (
        <Route path="*" element={<Login />} />
      )}
    </Routes>
  );
}

const App = () => (
  <I18nextProvider i18n={i18n}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="complaint-system-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </I18nextProvider>
);

export default App;
