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
    { icon: MessageSquare, label: "Student Feedback", href: "/staff-feedback" },
    { icon: Settings, label: "Profile", href: "/profile" },
  ];

  const adminMenuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: UserCheck, label: "Staff Management", href: "/staff-management" },

    { icon: UserPlus, label: "Assign Complaints", href: "/assign" },
    { icon: FileText, label: "All Complaints", href: "/all-complaints" },
    { icon: Users, label: "User Management", href: "/user-management" },
    {
      icon: TrendingUp,
      label: "Category Management",
      href: "/category-management",
    },
    { icon: MessageSquare, label: "Feedback Review", href: "/feedback-review" },
    { icon: TrendingUp, label: "Admin Analytics", href: "/admin-analytics" },
    { icon: Settings, label: "Profile", href: "/profile" },
  ];

  const getMenuItems = () => {
    switch (user?.role) {
      case "staff":
        return staffMenuItems;
      case "admin":
        return adminMenuItems;
      default:
        return userMenuItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className={cn("flex flex-col h-full p-4", className)}>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">
          {user?.role === "admin"
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
