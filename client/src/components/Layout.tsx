import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
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
  LogIn,
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
        const headers: Record<string, string> = {};
        const sessionToken = sessionStorage.getItem("discreen_session_token");
        if (sessionToken) headers["x-session-token"] = sessionToken;
        if (supabase) {
          const { data: { session: s } } = await supabase.auth.getSession();
          if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
        }
        const res = await fetch("/api/heartbeat", { method: "POST", headers });
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
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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

const SIDEBAR_W = 200;

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
    <div className="min-h-screen bg-background text-foreground flex">

      {/* ── Left Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 h-screen border-r border-border/40 bg-background/80 backdrop-blur z-[998]"
        style={{ width: SIDEBAR_W }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border/40 shrink-0">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-logo">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight">
                Di<span className="text-primary">screen</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5 px-2 pt-4 flex-1" data-testid="nav-main">
          {NAV_ITEMS.map((item) => {
            const pathname = location.split("?")[0].split("#")[0];
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            const label = t(item.labelKey);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-2.5 h-9 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }`}
                  data-testid={`nav-${label.toLowerCase()}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                  {label}
                  {isActive && (
                    <div className="ml-auto w-1 h-4 rounded-full bg-primary" />
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="px-2 pb-4 pt-2 border-t border-border/40 space-y-1 shrink-0">
          {/* Online / status */}
          {onlineCount !== null && (
            <div
              className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1.5"
              data-testid="status-online-count"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-medium tabular-nums">{onlineCount}</span>
              <span className="truncate">{t("header.onlineUsers", { count: onlineCount })}</span>
            </div>
          )}

          {/* Theme + Lang row */}
          <div className="flex gap-1 px-1">
            <Button
              data-testid="button-lang-toggle"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleLanguage}
              title={i18n.language === "fr" ? "Switch to English" : "Passer en Francais"}
            >
              <span className="text-xs font-bold">{i18n.language === "fr" ? "FR" : "EN"}</span>
            </Button>
            <Button
              data-testid="button-theme-toggle"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleTheme}
              title={theme === "light" ? t("nav.darkMode") : t("nav.lightMode")}
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>

            {/* Status pill */}
            {user && frozen ? (
              <div className="flex items-center text-xs font-medium text-red-500 dark:text-red-400" data-testid="status-frozen">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1" />
                {t("header.frozen")}
              </div>
            ) : (
              <div className="flex items-center text-xs font-medium text-muted-foreground" data-testid="status-operational">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                {t("header.operational")}
              </div>
            )}
          </div>

          {/* User menu or login */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-9 px-2 text-sm"
                  data-testid="button-user-menu"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <div className="flex flex-col items-start leading-tight min-w-0">
                    <span className="text-xs font-medium truncate max-w-[110px]">
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
                  <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-48">
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
                <DropdownMenuItem
                  data-testid="menu-item-sign-out"
                  onClick={() => signOut()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("header.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm" className="w-full gap-2 justify-start" data-testid="button-login">
                <LogIn className="w-4 h-4" />
                {t("header.signIn")}
              </Button>
            </Link>
          )}
        </div>
      </aside>

      {/* ── Main area (offset by sidebar on desktop) ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[200px]">

        {/* Mobile top bar (no sidebar on small screens) */}
        <header className="lg:hidden sticky top-0 z-[999] w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="h-14 flex items-center justify-between gap-2 px-4">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="bg-primary/10 p-1.5 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight">
                  Di<span className="text-primary">screen</span>
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={toggleLanguage}>
                <span className="text-xs font-bold">{i18n.language === "fr" ? "FR" : "EN"}</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              {!user && (
                <Link href="/login">
                  <Button variant="default" size="sm" className="gap-1.5" data-testid="button-login-mobile">
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("header.signIn")}</span>
                  </Button>
                </Link>
              )}
              <Button
                data-testid="button-mobile-menu"
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {mobileOpen && (
            <div className="border-t border-border/40 bg-background/95 backdrop-blur">
              <nav className="px-4 py-3 flex flex-col gap-1" data-testid="nav-mobile">
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
                {user && (
                  <>
                    <div className="border-t border-border/40 my-1" />
                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => { navigate("/profile"); setMobileOpen(false); }}>
                      <User className="w-4 h-4" />
                      {t("header.myAccount")}
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={() => signOut()}>
                      <LogOut className="w-4 h-4" />
                      {t("header.signOut")}
                    </Button>
                  </>
                )}
              </nav>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

        <ChatWidget />
      </div>

      {theme === "dark" && <InteractiveGrid />}
    </div>
  );
}
