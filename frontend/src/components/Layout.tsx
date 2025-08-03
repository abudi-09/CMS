import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut,
  Menu,
  GraduationCap,
  User,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/Sidebar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <Sidebar />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold">Gondar University</h1>
                <p className="text-xs text-muted-foreground">
                  Complaint Management
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <NotificationDropdown />
            <ThemeToggle />

            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {user?.role}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="hidden sm:flex"
            >
              <User className="h-4 w-4" />
            </Button>

            <Avatar
              className="cursor-pointer sm:hidden"
              onClick={() => navigate("/profile")}
            >
              <AvatarFallback>
                {user?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-8rem)] flex-col">
        <div className="flex flex-1">
          {/* Desktop Sidebar */}
          <div className="hidden md:block w-64 border-r bg-muted/10">
            <Sidebar />
          </div>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>

        {/* Footer */}
        <footer className="border-t bg-gray-100 dark:bg-gray-900 text-gray-500 text-sm py-8 mt-auto">
          <div className="container">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {/* University Branding */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-primary" />
                    <span className="text-lg font-semibold text-foreground">
                      University of Gondar
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Excellence in Education
                  </p>
                </div>
                <p className="text-xs leading-relaxed">
                  Committed to providing quality education and ensuring student
                  voices are heard through our complaint management system.
                </p>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Contact Us</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs">
                      P.O. Box 196, Gondar, Ethiopia
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-xs">+251-58-114-1240</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-xs">info@uog.edu.et</span>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Quick Links</h3>
                <div className="space-y-2">
                  <Link
                    to="/about"
                    className="block text-xs hover:text-primary transition-colors"
                  >
                    About Us
                  </Link>
                  <Link
                    to="/help"
                    className="block text-xs hover:text-primary transition-colors"
                  >
                    Help & Support
                  </Link>
                  <a
                    href="#"
                    className="block text-xs hover:text-primary transition-colors"
                  >
                    Privacy Policy
                  </a>
                  <a
                    href="#"
                    className="block text-xs hover:text-primary transition-colors"
                  >
                    Terms of Service
                  </a>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">System Info</h3>
                <div className="space-y-1 text-xs">
                  <p>Complaint Management System</p>
                  <p className="text-success">System Status: Online</p>
                  <p>Last Updated: January 2025</p>
                </div>
              </div>
            </div>

            {/* Footer Bottom */}
            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-xs">
                © 2025 University of Gondar. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
