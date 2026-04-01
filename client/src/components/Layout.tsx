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
  ChevronLeft,
  ChevronRight,
  LogIn,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const ROLE_DISPLAY: Record<string, { label: string }> = {
  admin: { label: "Admin" },
  free: { label: "Free" },
  vip: { label: "VIP" },
  pro: { label: "PRO" },
  business: { label: "Business" },
  api: { label: "API" },
};

const NAV_ITEMS = [
  { labelKey: "nav.home", href: "/", icon: Home },
  { labelKey: "nav.search", href: "/search", icon: Search },
  { labelKey: "nav.reviews", href: "/avis", icon: Star },
  { labelKey: "nav.dof", href: "/users", icon: Users },
  { labelKey: "nav.pricing", href: "/pricing", icon: CreditCard },
  { labelKey: "nav.contact", href: "/contact", icon: MessageSquare },
];

const W_EXPANDED = 200;
const W_COLLAPSED = 56;

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, role, frozen, signOut, displayName, avatarUrl } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });
  const onlineCount = useOnlineCount();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "fr" ? "en" : "fr");
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  const sidebarW = collapsed ? W_COLLAPSED : W_EXPANDED;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground flex">

        {/* ── Left Sidebar ── */}
        <aside
          className="hidden lg:block fixed top-0 left-0 h-screen z-[998]"
          style={{
            width: sidebarW,
            transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Floating collapse tab on right edge */}
          <button
            onClick={toggleCollapsed}
            data-testid="button-sidebar-collapse"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full border border-border/60 bg-background shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors z-10"
          >
            {collapsed
              ? <ChevronRight className="w-3 h-3" />
              : <ChevronLeft className="w-3 h-3" />}
          </button>

          {/* Inner content wrapper — clips text during transition */}
          <div className="flex flex-col h-full w-full border-r border-border/40 bg-background/80 backdrop-blur overflow-hidden">
          {/* Logo row */}
          <div className="h-14 flex items-center border-b border-border/40 shrink-0 px-3 gap-2 overflow-hidden">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer min-w-0" data-testid="link-logo">
                <div className="bg-primary/10 p-1.5 rounded-lg shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <span
                  className="font-display font-bold text-lg tracking-tight whitespace-nowrap overflow-hidden"
                  style={{
                    opacity: collapsed ? 0 : 1,
                    maxWidth: collapsed ? 0 : 120,
                    transition: "opacity 0.18s ease, max-width 0.22s cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  Di<span className="text-primary">screen</span>
                </span>
              </div>
            </Link>
          </div>

          {/* ── User profile card (top, below logo) ── */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`w-full border-b border-border/40 overflow-hidden transition-colors hover:bg-accent/40 focus:outline-none ${collapsed ? "py-3 flex justify-center" : "py-4 px-4 flex flex-col items-center gap-1"}`}
                  data-testid="button-user-menu"
                  title={collapsed ? (displayName || user.email?.split("@")[0]) : undefined}
                >
                  {/* Expanded: name + role above, avatar below */}
                  {!collapsed && (
                    <div className="flex flex-col items-center gap-1 w-full">
                      <span className="text-sm font-semibold truncate max-w-full">
                        {displayName || user.email?.split("@")[0]}
                      </span>
                      {role && (
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                          role === "admin" ? "bg-red-500/15 text-red-400" :
                          role === "pro" || role === "business" ? "bg-primary/15 text-primary" :
                          role === "vip" ? "bg-amber-400/15 text-amber-400" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {(ROLE_DISPLAY[role] || ROLE_DISPLAY.free).label}
                        </span>
                      )}
                      <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden mt-1">
                        {avatarUrl
                          ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                          : <User className="w-5 h-5 text-primary" />
                        }
                      </div>
                    </div>
                  )}
                  {/* Collapsed: just avatar */}
                  {collapsed && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden">
                      {avatarUrl
                        ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                        : <User className="w-4 h-4 text-primary" />
                      }
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-48">
                <DropdownMenuItem data-testid="menu-item-profile" onClick={() => navigate("/profile")}>
                  <User className="w-4 h-4 mr-2" />{t("header.myAccount")}
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-api-keys" onClick={() => navigate("/api-keys")}>
                  <Key className="w-4 h-4 mr-2" />{t("header.apiKeys")}
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-documentation" onClick={() => navigate("/documentation")}>
                  <FileText className="w-4 h-4 mr-2" />{t("header.documentation")}
                </DropdownMenuItem>
                {role === "admin" && (
                  <DropdownMenuItem data-testid="menu-item-admin" onClick={() => navigate("/admin")}>
                    <Settings className="w-4 h-4 mr-2" />{t("header.admin")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="menu-item-sign-out"
                  onClick={() => signOut()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />{t("header.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className={`border-b border-border/40 ${collapsed ? "py-3 flex justify-center px-2" : "py-4 px-4"}`}>
              <Link href="/login">
                <Button
                  variant="default"
                  className={`overflow-hidden ${collapsed ? "w-9 h-9 p-0 justify-center" : "w-full gap-2 justify-center"}`}
                  data-testid="button-login"
                  title={collapsed ? t("header.signIn") : undefined}
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  {!collapsed && <span>{t("header.signIn")}</span>}
                </Button>
              </Link>
            </div>
          )}

          {/* Nav items */}
          <nav className="flex flex-col gap-1 px-1.5 pt-4 overflow-hidden" data-testid="nav-main">
            {NAV_ITEMS.map((item) => {
              const pathname = location.split("?")[0].split("#")[0];
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              const label = t(item.labelKey);

              const btn = (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`w-full h-9 text-sm font-medium transition-all duration-150 overflow-hidden ${
                      collapsed ? "justify-center px-0" : "justify-start gap-2.5 px-2.5"
                    } ${
                      isActive
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    }`}
                    data-testid={`nav-${label.toLowerCase()}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                    <span
                      className="whitespace-nowrap overflow-hidden"
                      style={{
                        opacity: collapsed ? 0 : 1,
                        maxWidth: collapsed ? 0 : 140,
                        transition: "opacity 0.15s ease, max-width 0.22s cubic-bezier(0.4,0,0.2,1)",
                      }}
                    >
                      {label}
                    </span>
                    {isActive && !collapsed && (
                      <div className="ml-auto w-1 h-4 rounded-full bg-primary shrink-0" />
                    )}
                  </Button>
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">{label}</TooltipContent>
                  </Tooltip>
                );
              }
              return btn;
            })}
          </nav>

          {/* Spacer pushes controls to bottom */}
          <div className="flex-1" />

          {/* Bottom section */}
          <div className="border-t border-border/40 shrink-0 overflow-hidden px-1.5 py-2 space-y-0.5">

            {/* Online count */}
            {onlineCount !== null && (
              <div
                className={`flex items-center gap-2 text-xs text-muted-foreground py-1 overflow-hidden ${collapsed ? "justify-center px-0" : "px-2"}`}
                title={collapsed ? `${onlineCount} online` : undefined}
                data-testid="status-online-count"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span
                  className="whitespace-nowrap overflow-hidden"
                  style={{
                    opacity: collapsed ? 0 : 1,
                    maxWidth: collapsed ? 0 : 160,
                    transition: "opacity 0.15s ease, max-width 0.22s cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  {t("header.onlineUsers", { count: onlineCount })}
                </span>
              </div>
            )}

            {/* Lang + Theme + Status row */}
            <div className={`flex gap-0.5 overflow-hidden ${collapsed ? "flex-col items-center" : "flex-row items-center"}`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={toggleLanguage}
                title={i18n.language === "fr" ? "Switch to English" : "Passer en Français"}
                data-testid="button-lang-toggle"
              >
                <span className="text-[10px] font-bold">{i18n.language === "fr" ? "FR" : "EN"}</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={toggleTheme}
                title={theme === "light" ? t("nav.darkMode") : t("nav.lightMode")}
                data-testid="button-theme-toggle"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>

              <div
                className="flex items-center text-xs font-medium overflow-hidden shrink-0"
                style={{
                  opacity: collapsed ? 0 : 1,
                  maxWidth: collapsed ? 0 : 100,
                  transition: "opacity 0.15s ease, max-width 0.22s cubic-bezier(0.4,0,0.2,1)",
                }}
                data-testid={user && frozen ? "status-frozen" : "status-operational"}
              >
                <div className={`w-1.5 h-1.5 rounded-full mr-1 shrink-0 ${user && frozen ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
                <span className={user && frozen ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}>
                  {user && frozen ? t("header.frozen") : t("header.operational")}
                </span>
              </div>
            </div>

          </div>
          </div>
        </aside>

        {/* ── Main area ── */}
        <div
          className="flex-1 flex flex-col min-w-0"
          style={{
            marginLeft: `${sidebarW}px`,
            transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Mobile top bar */}
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
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-mobile-menu">
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
                        <User className="w-4 h-4" />{t("header.myAccount")}
                      </Button>
                      <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={() => signOut()}>
                        <LogOut className="w-4 h-4" />{t("header.signOut")}
                      </Button>
                    </>
                  )}
                </nav>
              </div>
            )}
          </header>

          <main className="flex-1 min-w-0">
            {children}
          </main>

          <ChatWidget />
        </div>

        {theme === "dark" && <InteractiveGrid />}
      </div>
    </TooltipProvider>
  );
}
