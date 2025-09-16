import { ReactNode, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Build absolute avatar URL if backend returned a relative path
  const assetBase = (
    import.meta.env.VITE_API_BASE || "http://localhost:5000/api"
  ).replace(/\/api$/, "");
  const avatarSrc = user?.avatarUrl
    ? user.avatarUrl.startsWith("http")
      ? user.avatarUrl
      : `${assetBase}${user.avatarUrl}`
    : undefined;

  const initials = useMemo(() => {
    if (!user) return "";
    const raw = (user.fullName || user.name || "").trim();
    if (!raw) return "U";
    const parts = raw.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-0 flex h-16 items-center justify-between">
          <div className="flex items-center gap-3 ml-2">
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
                <Link to="/dashboard" className="block hover:underline">
                  <h1 className="text-lg font-semibold">Informatics College</h1>
                  <p className="text-xs text-muted-foreground">
                    Complaint Management
                  </p>
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 mr-2">
            {/* <LanguageSwitcher /> removed */}
            <NotificationDropdown />
            <ThemeToggle />

            {/* Profile Dropdown Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative h-9 w-9 rounded-full p-0"
                    aria-label="User menu"
                  >
                    {/* Key forces remount so Radix Avatar recalculates fallback visibility after avatar removed */}
                    <Avatar
                      key={user?.avatarUrl || "no-avatar"}
                      className="h-8 w-8 bg-muted overflow-hidden relative"
                    >
                      {avatarSrc && (
                        <AvatarImage
                          src={avatarSrc}
                          alt={
                            (user?.fullName ||
                              user?.name ||
                              "User avatar") as string
                          }
                          className="object-cover"
                          onError={(e) => {
                            // Hide broken image so fallback shows immediately
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      )}
                      <AvatarFallback className="flex items-center justify-center h-full w-full text-[11px] font-semibold uppercase tracking-wide select-none text-gray-800 dark:text-gray-200">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <div className="px-3 py-2">
                    <div className="font-medium text-sm">
                      {user.fullName || user.name}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {user.role}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (user.role === "admin") navigate("/dashboard");
                      else if (user.role === "staff") navigate("/dashboard");
                      else navigate("/dashboard");
                    }}
                    className="cursor-pointer"
                  >
                    <span className="mr-2">🏠</span> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (user.role === "admin") navigate("/profile");
                      else if (user.role === "staff") navigate("/profile");
                      else navigate("/profile");
                    }}
                    className="cursor-pointer"
                  >
                    <span className="mr-2">👤</span> Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="cursor-pointer text-red-600 dark:text-red-400"
                  >
                    <span className="mr-2">🚪</span> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
                  {user ? null : (
                    <Link
                      to="/"
                      className="block text-xs hover:text-primary transition-colors"
                    >
                      Home
                    </Link>
                  )}
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
                  <Link
                    to="/privacy"
                    className="block text-xs hover:text-primary transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    to="/terms"
                    className="block text-xs hover:text-primary transition-colors"
                  >
                    Terms of Service
                  </Link>
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
