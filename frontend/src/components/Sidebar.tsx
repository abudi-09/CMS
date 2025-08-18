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
    { icon: Calendar, label: "Calendar View", href: "/calendar-view" },
    { icon: GraduationCap, label: "My Performance", href: "/my-performance" },
    { icon: MessageSquare, label: "Student Feedback", href: "/staff-feedback" },
    { icon: Settings, label: "Profile", href: "/profile" },
  ];

  const adminMenuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: UserCheck, label: "Dean Management", href: "/staff-management" },

    // { icon: UserPlus, label: "Assign Complaints", href: "/assign" },
    { icon: FileText, label: "All Complaints", href: "/all-complaints" },

    { icon: FileText, label: "Direct Complaints", href: "/admin-complaints" },

    {
      icon: TrendingUp,
      label: "Category Management",
      href: "/category-management",
    },
    { icon: MessageSquare, label: "Feedback Review", href: "/feedback-review" },
    { icon: TrendingUp, label: "Admin Analytics", href: "/admin-analytics" },
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
      icon: UserCheck,
      label: "Staff Management",
      href: "/dean-staff-management",
    },
    { icon: Users, label: "User Management", href: "/dean-user-management" },
    { icon: FileText, label: "All Complaints", href: "/all-complaints" },
    { icon: TrendingUp, label: "Dean Analytics", href: "/dean-analytics" },
    {
      icon: GraduationCap,
      label: "Staff Performance",
      href: "/dean-staff-performance",
    },
    { icon: Calendar, label: "Calendar View", href: "/calendar-view" },
    { icon: Settings, label: "Profile", href: "/profile" },
  ];

  const hodMenuItems = [
    { icon: Home, label: "Dashboard", href: "/hod-dashboard" },
    { icon: UserPlus, label: "Assign Complaints", href: "/hod/assign-complaints" },
    { icon: FileText, label: "All Complaints", href: "/all-complaints" },
    { icon: Users, label: "Staff Management", href: "/hod-staff-management" },
    { icon: TrendingUp, label: "HOD Analytics", href: "/hod-analytics" },
    { icon: Calendar, label: "Calendar View", href: "/calendar-view" },
    { icon: Settings, label: "Profile", href: "/profile" },
  ];

  const getMenuItems = () => {
    if (user?.role === "dean") return deanMenuItems;
    if (user?.role === "headOfDepartment") return hodMenuItems;
    if (user?.role === "admin") return adminMenuItems;
    if (user?.role === "staff") return staffMenuItems;
    return userMenuItems;
  };

  const menuItems = getMenuItems();

  return (
    <div className={cn("flex flex-col h-full p-4", className)}>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">
          {user?.role === "dean"
            ? "Dean Dashboard"
            : user?.role === "headOfDepartment"
            ? "HOD Dashboard"
            : user?.role === "admin"
            ? "Admin Panel"
            : user?.role === "staff"
            ? "Staff Portal"
            : "Student Portal"}
        </h2>
        <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
      </div>

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
