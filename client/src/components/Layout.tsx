import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  LogOut,
  Settings,
  Moon,
  Sun,
  Home,
  Search,
  CreditCard,
  MessageSquare,
  Key,
  FileText,
  Menu,
  X,
  Star,
  Users,
  User,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import ChatWidget from "@/components/ChatWidget";

function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/heartbeat", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setCount(data.online);
        }
      } catch {}
    };

    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return count;
}

const ROLE_DISPLAY: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  admin: { label: "Admin", variant: "destructive" },
  free: { label: "Free", variant: "secondary" },
  vip: { label: "VIP", variant: "outline" },
  pro: { label: "PRO", variant: "default" },
  business: { label: "Business", variant: "default" },
  api: { label: "API", variant: "outline" },
};

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Recherche", href: "/search", icon: Search },
  { label: "Avis", href: "/avis", icon: Star },
  { label: "Utilisateurs", href: "/users", icon: Users },
  { label: "Prix", href: "/pricing", icon: CreditCard },
  { label: "Contact", href: "/contact", icon: MessageSquare },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, role, frozen, signOut, displayName } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const onlineCount = useOnlineCount();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-[999] w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto h-14 flex items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer" data-testid="link-logo">
                <div className="bg-primary/10 p-1.5 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight hidden sm:inline">
                  Di<span className="text-primary">screen</span>
                </span>
              </div>
            </Link>
            {onlineCount !== null && (
              <div
                className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full border border-border/50"
                data-testid="status-online-count"
                title={`${onlineCount} utilisateur${onlineCount > 1 ? "s" : ""} en ligne`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Users className="w-3.5 h-3.5" />
                <span className="font-medium tabular-nums">{onlineCount}</span>
              </div>
            )}
          </div>

          <nav className="hidden lg:flex items-center gap-1" data-testid="nav-main">
            {NAV_ITEMS.map((item) => {
              const pathname = location.split("?")[0].split("#")[0];
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-1.5"
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              data-testid="button-theme-toggle"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === "light" ? "Mode sombre" : "Mode clair"}
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </Button>
            {user && frozen ? (
              <div className="hidden xl:flex items-center text-xs font-medium text-red-500 dark:text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/30" data-testid="status-frozen">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                Compte gele
              </div>
            ) : (
              <div className="hidden xl:flex items-center text-xs font-medium text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full border border-border/50" data-testid="status-operational">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Operationnel
              </div>
            )}
            {user && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-user-menu">
                      <User className="w-4 h-4" />
                      <span className="hidden md:inline truncate max-w-[120px] text-xs" title={displayName || user.email || ""}>
                        {displayName || user.email?.split("@")[0]}
                      </span>
                      {role && (
                        <Badge
                          variant={(ROLE_DISPLAY[role] || ROLE_DISPLAY.free).variant}
                          data-testid="badge-user-role"
                          className="no-default-hover-elevate no-default-active-elevate"
                        >
                          {(ROLE_DISPLAY[role] || ROLE_DISPLAY.free).label}
                        </Badge>
                      )}
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem data-testid="menu-item-profile" onClick={() => navigate("/profile")}>
                      <User className="w-4 h-4 mr-2" />
                      Mon compte
                    </DropdownMenuItem>
                    <DropdownMenuItem data-testid="menu-item-api-keys" onClick={() => navigate("/api-keys")}>
                      <Key className="w-4 h-4 mr-2" />
                      Cles API
                    </DropdownMenuItem>
                    <DropdownMenuItem data-testid="menu-item-documentation" onClick={() => navigate("/documentation")}>
                      <FileText className="w-4 h-4 mr-2" />
                      Documentation
                    </DropdownMenuItem>
                    {role === "admin" && (
                      <DropdownMenuItem data-testid="menu-item-admin" onClick={() => navigate("/admin")}>
                        <Settings className="w-4 h-4 mr-2" />
                        Administration
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem data-testid="menu-item-sign-out" onClick={() => signOut()} className="text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Se deconnecter
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <Button
              data-testid="button-mobile-menu"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              title="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-border/40 bg-background/95 backdrop-blur">
            <nav className="container max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1" data-testid="nav-mobile">
              {NAV_ITEMS.map((item) => {
                const pathname = location.split("?")[0].split("#")[0];
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2"
                      data-testid={`nav-mobile-${item.label.toLowerCase()}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {children}

      <ChatWidget />
    </div>
  );
}
