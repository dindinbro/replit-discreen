import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "react-i18next";
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
  Languages,
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
import InteractiveGrid from "@/components/InteractiveGrid";

function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeBaseRef = useRef(60 + Math.floor(Math.random() * 40));

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/heartbeat", { method: "POST" });
        if (res.ok) {
          await res.json();
          const drift = Math.floor(Math.random() * 15) - 7;
          const newBase = Math.max(60, fakeBaseRef.current + drift);
          fakeBaseRef.current = Math.min(130, newBase);
          setCount(fakeBaseRef.current);
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
  { labelKey: "nav.home", href: "/", icon: Home },
  { labelKey: "nav.search", href: "/search", icon: Search },
  { labelKey: "nav.reviews", href: "/avis", icon: Star },
  { labelKey: "nav.dof", href: "/users", icon: Users },
  { labelKey: "nav.pricing", href: "/pricing", icon: CreditCard },
  { labelKey: "nav.contact", href: "/contact", icon: MessageSquare },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, role, frozen, signOut, displayName, avatarUrl } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const onlineCount = useOnlineCount();

  const toggleLanguage = () => {
    const newLang = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(newLang);
  };

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
                title={t("header.onlineUsers", { count: onlineCount })}
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
              const label = t(item.labelKey);
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-1.5"
                    data-testid={`nav-${label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              data-testid="button-lang-toggle"
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              title={i18n.language === "fr" ? "Switch to English" : "Passer en Francais"}
            >
              <span className="text-xs font-bold">{i18n.language === "fr" ? "FR" : "EN"}</span>
            </Button>
            <Button
              data-testid="button-theme-toggle"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === "light" ? t("nav.darkMode") : t("nav.lightMode")}
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
                {t("header.frozen")}
              </div>
            ) : (
              <div className="hidden xl:flex items-center text-xs font-medium text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full border border-border/50" data-testid="status-operational">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                {t("header.operational")}
              </div>
            )}
            {user && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 h-auto py-1.5 px-2.5" data-testid="button-user-menu">
                      <div className="hidden md:flex flex-col items-end leading-tight">
                        <span className="text-xs font-medium truncate max-w-[120px]" title={displayName || user.email || ""}>
                          {displayName || user.email?.split("@")[0]}
                        </span>
                        {role && (
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                            role === "admin" ? "text-red-400" :
                            role === "pro" || role === "business" ? "text-primary" :
                            role === "vip" ? "text-amber-400" :
                            "text-muted-foreground"
                          }`}>
                            {(ROLE_DISPLAY[role] || ROLE_DISPLAY.free).label}
                          </span>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem data-testid="menu-item-profile" onClick={() => navigate("/profile")}>
                      <User className="w-4 h-4 mr-2" />
                      {t("header.myAccount")}
                    </DropdownMenuItem>
                    <DropdownMenuItem data-testid="menu-item-api-keys" onClick={() => navigate("/api-keys")}>
                      <Key className="w-4 h-4 mr-2" />
                      {t("header.apiKeys")}
                    </DropdownMenuItem>
                    <DropdownMenuItem data-testid="menu-item-documentation" onClick={() => navigate("/documentation")}>
                      <FileText className="w-4 h-4 mr-2" />
                      {t("header.documentation")}
                    </DropdownMenuItem>
                    {role === "admin" && (
                      <DropdownMenuItem data-testid="menu-item-admin" onClick={() => navigate("/admin")}>
                        <Settings className="w-4 h-4 mr-2" />
                        {t("header.admin")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem data-testid="menu-item-sign-out" onClick={() => signOut()} className="text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t("header.signOut")}
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
                const label = t(item.labelKey);
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2"
                      data-testid={`nav-mobile-${label.toLowerCase()}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
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
      {theme === "dark" && <InteractiveGrid />}
    </div>
  );
}
