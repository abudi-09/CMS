import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Menu, GraduationCap, User } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/Sidebar';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';

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
                <p className="text-xs text-muted-foreground">Complaint Management</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <NotificationDropdown />
            <ThemeToggle />
            
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="hidden sm:flex"
            >
              <User className="h-4 w-4" />
            </Button>
            
            <Avatar 
              className="cursor-pointer sm:hidden"
              onClick={() => navigate('/profile')}
            >
              <AvatarFallback>
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 border-r bg-muted/10">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}