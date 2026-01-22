import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Dumbbell, LayoutDashboard, Settings, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <Dumbbell className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight">HevyGoals</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/">
                <Button 
                  variant={isActive("/") ? "secondary" : "ghost"} 
                  size="sm"
                  className="gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/settings">
                <Button 
                  variant={isActive("/settings") ? "secondary" : "ghost"} 
                  size="sm"
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border border-white/10">
                    <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {user.firstName?.[0] || <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}
