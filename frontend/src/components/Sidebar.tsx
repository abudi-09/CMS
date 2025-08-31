import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Home,
  PlusCircle,
  FileText,
  MessageSquare,
  Users,
  Settings,
  TrendingUp,
  UserCheck,
  UserPlus,
  GraduationCap,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userMenuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard", active: true },
    { icon: PlusCircle, label: "Submit Complaint", href: "/submit-complaint" },
    { icon: FileText, label: "My Complaints", href: "/my-complaints" },
    { icon: Settings, label: "Profile", href: "/profile" },
  ];

  const staffMenuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: FileText, label: "My Assigned", href: "/my-assigned" },
    { icon: FileText, label: "All Complaints", href: "/all-complaints" },
    { icon: Calendar, label: "Calendar View", href: "/calendar-view" },
    { icon: GraduationCap, label: "My Performance", href: "/my-performance" },
    { icon: MessageSquare, label: "Student Feedback", href: "/staff-feedback" },
    { icon: Settings, label: "Profile", href: "/profile" },
  ];

  const adminMenuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },

    // { icon: UserPlus, label: "Assign Complaints", href: "/assign" },
    { icon: FileText, label: "All Complaints", href: "/all-complaints" },

    { icon: FileText, label: "Direct Complaints", href: "/admin-complaints" },

    {
      icon: TrendingUp,
      label: "Category Management",
      href: "/category-management",
    },
    { icon: MessageSquare, label: "Student Feedback", href: "/staff-feedback" },
    { icon: TrendingUp, label: "Admin Analytics", href: "/admin-analytics" },
    { icon: Users, label: "Admin Management", href: "/admin-management" },
    {
      icon: GraduationCap,
      label: "Dean Role Management",
      href: "/dean-role-management",
    },
    { icon: Calendar, label: "Calendar View", href: "/calendar-view" }, // Removed due to missing export

    { icon: Settings, label: "Profile", href: "/profile" },
  ];

  const deanMenuItems = [
    { icon: Home, label: "Dashboard", href: "/dean-dashboard" },
    {
      icon: UserPlus,
      label: "Assign Complaints",
      href: "/dean/assign-complaints",
    },
    {
      icon: Users,
      label: "Department Management",
      href: "/department-management",
    },

    { icon: FileText, label: "All Complaints", href: "/all-complaints" },
    { icon: TrendingUp, label: "Dean Analytics", href: "/dean-analytics" },
    {
      icon: GraduationCap,
      label: "Department Performance",
      href: "/dean-department-performance",
    },
    { icon: Calendar, label: "Calendar View", href: "/calendar-view" },
    { icon: MessageSquare, label: "Student Feedback", href: "/staff-feedback" },
    { icon: Settings, label: "Profile", href: "/profile" },
  ];

  const hodMenuItems = [
    { icon: Home, label: "Dashboard", href: "/hod-dashboard" },
    {
      icon: UserPlus,
      label: "Assign Complaints",
      href: "/hod/assign-complaints",
    },
    { icon: FileText, label: "All Complaints", href: "/hod/all-complaints" },
    {
      icon: GraduationCap,
      label: "Staff Performance",
      href: "/hod-staff-performance",
    },
    { icon: Users, label: "Student Management", href: "/student-management" },
    { icon: Users, label: "Staff Management", href: "/hod/staff-management" },
    { icon: TrendingUp, label: "HOD Analytics", href: "/hod-analytics" },
    { icon: Calendar, label: "Calendar View", href: "/calendar-view" },
    { icon: MessageSquare, label: "Student Feedback", href: "/staff-feedback" },
    { icon: Settings, label: "Profile", href: "/profile" },
  ];

  const role = (user?.role || "").toLowerCase();
  const isHod =
    role === "hod" ||
    role === "headofdepartment" ||
    role === "headofdepartment".toLowerCase();

  const getMenuItems = () => {
    if (role === "dean") return deanMenuItems;
    if (isHod) return hodMenuItems;
    if (role === "admin") return adminMenuItems;
    if (role === "staff") return staffMenuItems;
    return userMenuItems;
  };

  const menuItems = getMenuItems();

  return (
    <div className={cn("flex flex-col h-full p-4", className)}>
      {/* Removed role heading and welcome text as per request */}

      <nav className="space-y-2 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Button
              key={item.label}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start",
                isActive && "bg-primary text-primary-foreground"
              )}
              onClick={() => navigate(item.href)}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
