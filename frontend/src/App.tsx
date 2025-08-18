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
import { DeanDashboard } from "@/pages/DeanDashboard";
import DeanUserManagement from "@/pages/DeanUserManagement";
import DeanStaffManagement from "@/pages/DeanStaffManagement";
import DeanAnalytics from "@/pages/DeanAnalytics";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import HelpPage from "./pages/HelpPage";
import CalendarView from "@/pages/CalendarView";
import StaffPerformance from "@/pages/StaffPerformance";
import DeanDepartmentPerformance from "@/pages/DeanDepartmentPerformance";
import { SubmitComplaint } from "@/pages/SubmitComplaint";
import { MyComplaints } from "@/pages/MyComplaints";
import StaffManagement from "@/pages/StaffManagement";
import { FeedbackReview } from "@/pages/FeedbackReview";
import { AssignComplaints } from "@/pages/AssignComplaints";
import { StaffFeedback } from "@/pages/StaffFeedback";
import { MyAssignedComplaints } from "@/pages/MyAssignedComplaints";
import AdminAnalytics from "@/pages/AdminAnalytics";
import UserManagement from "@/pages/UserManagement";
import CategoryManagement from "@/pages/CategoryManagement";
import AllComplaints from "@/pages/AllComplaints";
import MyPerformance from "@/pages/MyPerformance";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import { DeanAssignComplaints } from "@/pages/DeanAssignComplaints";
import { HoDDashboard } from "@/pages/HoDDashboard";
import AdminComplaints from "@/pages/AdminComplaints";
import { HoDAssignComplaints } from "@/pages/HoDAssignComplaints";
import HoDAnalytics from "@/pages/HoDAnalytics";
import HODStaffManagement from "@/pages/HODStaffManagement";

import { Profile } from "@/pages/Profile";
import { Layout } from "@/components/Layout";
import NotFound from "./pages/NotFound";
import { ComplaintProvider } from "@/context/ComplaintContext";
import { CategoryProvider } from "@/context/CategoryContext";

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

function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col items-center gap-4">
        <img
          src="/public/favicon.ico"
          alt="Gondar University Logo"
          className="w-16 h-16 mb-2"
        />
        <h1 className="text-3xl font-bold text-blue-900 dark:text-yellow-300">
          Gondar University
        </h1>
        <p className="text-lg text-blue-800 dark:text-yellow-200">
          Complaint Management System
        </p>
        <div className="mt-6 animate-spin-slow">
          <svg
            className="w-8 h-8 text-blue-700 dark:text-yellow-300"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            ></path>
          </svg>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isCheckingAuth } = useAuth();

  if (isCheckingAuth) {
    return <SplashScreen />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes */}
      {isAuthenticated ? (
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<DashboardRouter />} />
                <Route path="/user-dashboard" element={<UserDashboard />} />
                <Route path="/staff-dashboard" element={<StaffDashboard />} />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route path="/dean-dashboard" element={<DeanDashboard />} />
                <Route path="/hod-dashboard" element={<HoDDashboard />} />
                <Route path="/hod-analytics" element={<HoDAnalytics />} />
                <Route
                  path="/hod-staff-performance"
                  element={<StaffPerformance />}
                />
                <Route path="/my-performance" element={<MyPerformance />} />
                <Route path="/calendar-view" element={<CalendarView />} />
                <Route path="/admin-analytics" element={<AdminAnalytics />} />
                <Route path="/all-complaints" element={<AllComplaints />} />
                <Route path="/profile" element={<Profile />} />
                <Route
                  path="/dean-user-management"
                  element={<DeanUserManagement />}
                />
                <Route
                  path="/dean-staff-management"
                  element={<DeanStaffManagement />}
                />
                <Route path="/dean-analytics" element={<DeanAnalytics />} />
                <Route
                  path="/dean-department-performance"
                  element={<DeanDepartmentPerformance />}
                />
                <Route
                  path="/dean/assign-complaints"
                  element={<DeanAssignComplaints />}
                />
                <Route path="/submit-complaint" element={<SubmitComplaint />} />
                <Route path="/my-complaints" element={<MyComplaints />} />
                <Route path="/staff-management" element={<StaffManagement />} />
                <Route path="/feedback-review" element={<FeedbackReview />} />
                <Route path="/my-assigned" element={<MyAssignedComplaints />} />
                <Route
                  path="/assign-complaints"
                  element={<AssignComplaints />}
                />
                <Route path="/staff-feedback" element={<StaffFeedback />} />
                <Route path="/user-management" element={<UserManagement />} />

                <Route
                  path="/category-management"
                  element={<CategoryManagement />}
                />
                <Route path="/admin-complaints" element={<AdminComplaints />} />
                <Route path="/dean-analytics" element={<DeanAnalytics />} />
                <Route
                  path="/dean-staff-performance"
                  element={<StaffPerformance />}
                />
                <Route
                  path="/hod/assign-complaints"
                  element={<HoDAssignComplaints />}
                />

                <Route
                  path="/hod/staff-management"
                  element={<HODStaffManagement />}
                />

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
            <ComplaintProvider>
              <CategoryProvider>
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
              </CategoryProvider>
            </ComplaintProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </I18nextProvider>
);

export default App;
