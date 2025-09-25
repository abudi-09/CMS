import { Toaster } from "@/components/ui/toaster";
import "./i18n";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { toast } from "@/hooks/use-toast";
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
import StudentManagement from "@/pages/StudentManagement";
import CategoryManagement from "@/pages/CategoryManagement";
import AdminManagement from "@/pages/AdminManagement";
import DeanRoleManagement from "@/pages/DeanRoleManagement";
import AllComplaints from "@/pages/AllComplaints";
import MyPerformance from "@/pages/MyPerformance";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import { DeanAssignComplaints } from "@/pages/DeanAssignComplaints";
import { HoDDashboard } from "@/pages/HoDDashboard";
import AdminComplaints from "@/pages/AdminComplaints";
import HoDAssignComplaints from "@/pages/HoDAssignComplaints";
import HoDAnalytics from "@/pages/HoDAnalytics";
import HODStaffManagement from "@/pages/HODStaffManagement";
import DepartmentManagement from "@/pages/DepartmentManagement";
import HoDAllComplaints from "@/pages/HoDAllComplaints";
import { Profile } from "@/pages/Profile";
import { Layout } from "@/components/Layout";
import NotFound from "./pages/NotFound";
import { ComplaintProvider } from "@/context/ComplaintContext";
import { CategoryProvider } from "@/context/CategoryContext";
import RequireRole from "@/components/RequireRole";

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
        {/* Logo removed to avoid showing external/lovable icon during refresh */}
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
  const {
    isAuthenticated,
    isCheckingAuth,
    getLogoutReason,
    clearLogoutReason,
  } = useAuth();
  const navigate = useNavigate();

  // Immediately redirect deactivated users and show toast; prevents any dashboard render
  const reason = getLogoutReason?.() || null;
  if (reason) {
    // Synchronously schedule redirect and toast
    queueMicrotask(() => {
      toast({
        title: "",
        description: reason,
        variant: "destructive",
      });
      clearLogoutReason?.();
      navigate("/login", { replace: true });
    });
  }

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
                <Route
                  path="/staff-dashboard"
                  element={
                    <RequireRole allowed={["staff"]}>
                      <StaffDashboard />
                    </RequireRole>
                  }
                />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route
                  path="/dean-dashboard"
                  element={
                    <RequireRole allowed={["dean"]}>
                      <DeanDashboard />
                    </RequireRole>
                  }
                />
                <Route
                  path="/hod-dashboard"
                  element={
                    <RequireRole allowed={["hod"]}>
                      <HoDDashboard />
                    </RequireRole>
                  }
                />
                <Route
                  path="/hod-analytics"
                  element={
                    <RequireRole allowed={["hod"]}>
                      <HoDAnalytics />
                    </RequireRole>
                  }
                />
                <Route
                  path="/hod-staff-performance"
                  element={
                    <RequireRole allowed={["hod"]}>
                      <StaffPerformance />
                    </RequireRole>
                  }
                />
                <Route
                  path="/my-performance"
                  element={
                    <RequireRole allowed={["staff"]}>
                      <MyPerformance />
                    </RequireRole>
                  }
                />
                <Route path="/calendar-view" element={<CalendarView />} />
                <Route
                  path="/dean/calendar"
                  element={
                    <RequireRole allowed={["dean"]}>
                      <CalendarView role="dean" />
                    </RequireRole>
                  }
                />
                <Route path="/admin-analytics" element={<AdminAnalytics />} />
                <Route path="/all-complaints" element={<AllComplaints />} />
                <Route path="/profile" element={<Profile />} />
                <Route
                  path="/dean-user-management"
                  element={
                    <RequireRole allowed={["dean"]}>
                      <DeanUserManagement />
                    </RequireRole>
                  }
                />
                <Route
                  path="/dean-staff-management"
                  element={
                    <RequireRole allowed={["dean"]}>
                      <DeanStaffManagement />
                    </RequireRole>
                  }
                />
                <Route path="/dean-analytics" element={<DeanAnalytics />} />
                <Route
                  path="/dean-department-performance"
                  element={<DeanDepartmentPerformance />}
                />
                <Route
                  path="/department-management"
                  element={
                    <RequireRole allowed={["dean"]}>
                      <DepartmentManagement />
                    </RequireRole>
                  }
                />
                <Route
                  path="/dean/assign-complaints"
                  element={
                    <RequireRole allowed={["dean"]}>
                      <DeanAssignComplaints />
                    </RequireRole>
                  }
                />
                <Route path="/submit-complaint" element={<SubmitComplaint />} />
                <Route path="/my-complaints" element={<MyComplaints />} />
                <Route path="/staff-management" element={<StaffManagement />} />
                <Route path="/feedback-review" element={<FeedbackReview />} />
                <Route
                  path="/my-assigned"
                  element={
                    <RequireRole allowed={["staff"]}>
                      <MyAssignedComplaints />
                    </RequireRole>
                  }
                />
                <Route
                  path="/assign-complaints"
                  element={<AssignComplaints />}
                />
                <Route
                  path="/staff-feedback"
                  element={
                    <RequireRole allowed={["staff", "admin", "dean", "hod"]}>
                      <StaffFeedback />
                    </RequireRole>
                  }
                />
                <Route
                  path="/student-management"
                  element={<StudentManagement />}
                />
                <Route path="/admin-management" element={<AdminManagement />} />
                <Route
                  path="/dean-role-management"
                  element={
                    <RequireRole allowed={["admin"]}>
                      <DeanRoleManagement />
                    </RequireRole>
                  }
                />

                <Route
                  path="/category-management"
                  element={<CategoryManagement />}
                />
                <Route path="/admin-complaints" element={<AdminComplaints />} />
                <Route path="/dean-analytics" element={<DeanAnalytics />} />
                <Route
                  path="/dean-staff-performance"
                  element={
                    <RequireRole allowed={["dean", "admin"]}>
                      <StaffPerformance />
                    </RequireRole>
                  }
                />
                <Route
                  path="/hod/assign-complaints"
                  element={
                    <RequireRole allowed={["hod"]}>
                      <HoDAssignComplaints />
                    </RequireRole>
                  }
                />

                <Route
                  path="/hod/all-complaints"
                  element={
                    <RequireRole allowed={["hod"]}>
                      <HoDAllComplaints />
                    </RequireRole>
                  }
                />
                <Route
                  path="/hod/staff-management"
                  element={
                    <RequireRole allowed={["hod"]}>
                      <HODStaffManagement />
                    </RequireRole>
                  }
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
