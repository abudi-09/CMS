import { Toaster } from "@/components/ui/toaster";
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
import { SubmitComplaint } from "@/pages/SubmitComplaint";
import { MyComplaints } from "@/pages/MyComplaints";
import { StaffManagement } from "@/pages/StaffManagement";
import { FeedbackReview } from "@/pages/FeedbackReview";
import { AssignComplaints } from "@/pages/AssignComplaints";
import { StaffFeedback } from "@/pages/StaffFeedback";
import { PublicLayout } from "@/components/PublicLayout";
import { MyAssignedComplaints } from "@/pages/MyAssignedComplaints";

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
      <Route
        path="/"
        element={
          <PublicLayout>
            <HomePage />
          </PublicLayout>
        }
      />
      <Route
        path="/about"
        element={
          <PublicLayout>
            <AboutPage />
          </PublicLayout>
        }
      />
      <Route
        path="/help"
        element={
          <PublicLayout>
            <HelpPage />
          </PublicLayout>
        }
      />
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
);

export default App;
