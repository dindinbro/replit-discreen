import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, LogOut, Settings, Moon, Sun,
  Home, Search, CreditCard, MessageSquare,
  Key, FileText, Menu, X, Star, Users, User,
  ChevronDown, ChevronLeft, ChevronRight, LogIn,
  Sparkles, Phone, MapPin, Hash, FileSearch, Eye, Gamepad2, ShieldAlert, BookOpen, BotMessageSquare,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link, useLocation } from "wouter";
import ChatWidget from "@/components/ChatWidget";
import InteractiveGrid from "@/components/InteractiveGrid";

/* ── Online count ────────────────────────────────────────── */
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
          fakeBaseRef.current = Math.min(130, Math.max(60, fakeBaseRef.current + drift));
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

/* ── Role badges ─────────────────────────────────────────── */
const ROLE_DISPLAY: Record<string, string> = {
  admin: "Admin", free: "Free", vip: "VIP",
  pro: "PRO", business: "Business", api: "API",
};

const ROLE_COLOR: Record<string, string> = {
  admin: "bg-red-500/20 text-red-400 border border-red-500/30",
  pro: "bg-primary/20 text-primary border border-primary/30",
  business: "bg-primary/20 text-primary border border-primary/30",
  vip: "bg-amber-400/20 text-amber-400 border border-amber-400/30",
  free: "bg-muted/50 text-muted-foreground border border-border/40",
  api: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
};

/* ── Nav data ────────────────────────────────────────────── */
interface NavItem {
  label: string;
  labelKey?: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: "gold" | "red" | "blue";
}

interface NavSection {
  key: string;
  labelKey?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  items: NavItem[];
}

const SEARCH_MODULES: NavItem[] = [
  { label: "Paramétrique",  href: "/search?mode=internal",  icon: Sparkles },
  { label: "Téléphone",     href: "/search?mode=phone",     icon: Phone },
  { label: "GeoIP",         href: "/search?mode=geoip",     icon: MapPin },
  { label: "NIR",           href: "/search?mode=nir",       icon: Hash },
  { label: "Username OSINT",href: "/search?mode=sherlock",  icon: Eye,        badge: "VIP", badgeColor: "blue" },
  { label: "Gaming",        href: "/search?mode=fivem",     icon: Gamepad2,   badge: "VIP", badgeColor: "blue" },
  { label: "Google OSINT",  href: "/search?mode=xeuledoc",  icon: FileSearch, badge: "PRO", badgeColor: "red" },
  { label: "Wanted",        href: "/search?mode=wanted",    icon: ShieldAlert,badge: "PRO", badgeColor: "red" },
  { label: "DisX IA",       href: "/disx",                  icon: BotMessageSquare, badge: "SOON", badgeColor: "red" },
];

const NAV_SECTIONS: NavSection[] = [
  {
    key: "home",
    items: [
      { label: "nav.home", labelKey: "nav.home", href: "/", icon: Home },
    ],
  },
  {
    key: "recherche",
    labelKey: "nav.section.recherche",
    collapsible: true,
    defaultOpen: true,
    items: SEARCH_MODULES,
  },
  {
    key: "community",
    labelKey: "nav.section.community",
    items: [
      { label: "nav.reviews", labelKey: "nav.reviews", href: "/avis",  icon: Star },
      { label: "nav.dof",     labelKey: "nav.dof",     href: "/users", icon: Users },
    ],
  },
  {
    key: "info",
    labelKey: "nav.section.info",
    items: [
      { label: "nav.pricing",  labelKey: "nav.pricing",  href: "/pricing",  icon: CreditCard },
      { label: "nav.tutorial", labelKey: "nav.tutorial", href: "/tuto",    icon: BookOpen },
      { label: "nav.contact",  labelKey: "nav.contact",  href: "/contact",  icon: MessageSquare },
    ],
  },
];

const ALL_FLAT_ITEMS: NavItem[] = NAV_SECTIONS.flatMap(s => s.items);

const W_EXPANDED = 224;
const W_COLLAPSED = 56;

/* ── Helpers ─────────────────────────────────────────────── */
function matchesHref(href: string, pathname: string, search: string): boolean {
  if (href.includes("?")) {
    const [hp, hq] = href.split("?");
    if (!pathname.startsWith(hp)) return false;
    const cur = new URLSearchParams(search);
    const exp = new URLSearchParams(hq);
    for (const [k, v] of exp) {
      const curVal = cur.get(k);
      if (curVal !== v) {
        // default mode = internal
        if (k === "mode" && v === "internal" && !curVal) return true;
        return false;
      }
    }
    return true;
  }
  if (href === "/") return pathname === "/";
  // Don't match /search exactly if there are search mode sub-items
  return pathname.startsWith(href);
}

/* ── Search navigation helper ──────────────────────────────── */
function navigateSearchMode(href: string) {
  window.history.pushState(null, "", href);
  // Manually dispatch popstate so SearchPage and sidebar react immediately
  window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
}

/* ── Layout ──────────────────────────────────────────────── */
export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, role, frozen, signOut, displayName, avatarUrl } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Track window.location.search reactively so sidebar active state updates on popstate
  const [currentSearch, setCurrentSearch] = useState(() =>
    typeof window !== "undefined" ? window.location.search : ""
  );
  useEffect(() => {
    const handler = () => setCurrentSearch(window.location.search);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    for (const s of NAV_SECTIONS) {
      if (s.collapsible) {
        try {
          const stored = localStorage.getItem(`sidebar-section-${s.key}`);
          defaults[s.key] = stored !== null ? stored === "true" : (s.defaultOpen ?? true);
        } catch { defaults[s.key] = s.defaultOpen ?? true; }
      }
    }
    return defaults;
  });

  const onlineCount = useOnlineCount();
  const toggleLanguage = () => i18n.changeLanguage(i18n.language === "fr" ? "en" : "fr");

  const toggleCollapsed = () => setCollapsed(prev => {
    const next = !prev;
    try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
    return next;
  });

  const toggleSection = (key: string) => setOpenSections(prev => {
    const next = { ...prev, [key]: !prev[key] };
    try { localStorage.setItem(`sidebar-section-${key}`, String(next[key])); } catch {}
    return next;
  });

  const sidebarW = collapsed ? W_COLLAPSED : W_EXPANDED;

  const pathname = location.split("?")[0].split("#")[0];

  const isActive = (href: string) => matchesHref(href, pathname, currentSearch);

  const itemLabel = (item: NavItem) =>
    item.labelKey ? t(item.labelKey, { defaultValue: item.label }) : item.label;

  const badgeClass = (color?: string) =>
    color === "red"  ? "bg-red-500/20 text-red-400 border border-red-500/30" :
    color === "blue" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                       "bg-primary/20 text-primary border border-primary/30";

  const userHandle = user?.email?.split("@")[0];
  const userName = displayName || userHandle || "";

  /* ── Nav item renderer ── */
  const renderNavItem = (item: NavItem, indent = false) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const label = itemLabel(item);
    const isQueryNav = item.href.includes("?"); // search module items use popstate trick

    const itemClass = `flex items-center rounded-lg cursor-pointer transition-all duration-150 select-none
      ${collapsed ? "justify-center px-0 py-2.5 mx-1 gap-0" : indent ? "gap-2.5 px-3 py-2 ml-2" : "gap-3 px-3 py-2.5"}
      ${active
        ? "bg-primary/10 text-primary border-l-2 border-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border-l-2 border-transparent"
      }`;

    const innerContent = (
      <>
        <Icon className={`shrink-0 ${collapsed ? "w-5 h-5" : indent ? "w-3.5 h-3.5" : "w-4 h-4"} ${active ? "text-primary" : ""}`} />
        <span
          className={`font-medium whitespace-nowrap overflow-hidden ${indent ? "text-[12.5px]" : "text-sm"}`}
          style={{
            opacity: collapsed ? 0 : 1,
            maxWidth: collapsed ? 0 : 160,
            transition: "opacity 0.15s ease, max-width 0.22s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {label}
        </span>
        {item.badge && !collapsed && (
          <span className={`ml-auto text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${badgeClass(item.badgeColor)}`}>
            {item.badge}
          </span>
        )}
      </>
    );

    const inner = isQueryNav ? (
      <a
        href={item.href}
        data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
        className={itemClass}
        onClick={(e) => { e.preventDefault(); navigateSearchMode(item.href); }}
      >
        {innerContent}
      </a>
    ) : (
      <Link href={item.href}>
        <div className={itemClass} data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}>
          {innerContent}
        </div>
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>{inner}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {label}{item.badge && ` (${item.badge})`}
          </TooltipContent>
        </Tooltip>
      );
    }
    return <div key={item.href}>{inner}</div>;
  };

  /* ── Sidebar content ── */
  const sidebarContent = (
    <div className="flex flex-col h-full w-full border-r border-border/30 bg-background/[0.93] backdrop-blur-sm overflow-hidden">

      {/* Logo */}
      <div className="h-14 flex items-center shrink-0 px-3 border-b border-border/20">
        <Link href="/">
          <div className={`flex items-center gap-2 cursor-pointer ${collapsed ? "justify-center w-full" : ""}`} data-testid="link-logo">
            <img src="/favicon.png" alt="Discreen" className="w-8 h-8 rounded-lg shrink-0 object-contain" />
            <span
              className="font-display font-bold text-lg tracking-tight whitespace-nowrap overflow-hidden"
              style={{ opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : 140, transition: "opacity 0.15s ease, max-width 0.22s cubic-bezier(0.4,0,0.2,1)" }}
            >
              Di<span className="text-primary">screen</span>
            </span>
          </div>
        </Link>
      </div>

      {/* Profile card */}
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`shrink-0 border-b border-border/20 hover:bg-accent/30 transition-colors focus:outline-none
                ${collapsed ? "py-3 flex justify-center items-center" : "py-5 px-4 flex flex-col items-center gap-1.5"}`}
              data-testid="button-user-menu"
              title={collapsed ? userName : undefined}
            >
              {!collapsed ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-primary" />}
                  </div>
                  <span className="text-sm font-bold tracking-tight mt-0.5">{userName}</span>
                  {role && (
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${ROLE_COLOR[role] || ROLE_COLOR.free}`}>
                      {ROLE_DISPLAY[role] || ROLE_DISPLAY.free}
                    </span>
                  )}
                  {userHandle && <span className="text-[11px] text-muted-foreground/60">@{userHandle}</span>}
                </>
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-primary" />}
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
            <DropdownMenuItem data-testid="menu-item-sign-out" onClick={() => signOut()} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />{t("header.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className={`shrink-0 border-b border-border/20 ${collapsed ? "py-3 flex justify-center" : "py-4 px-4"}`}>
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

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-none" data-testid="nav-main">
        {NAV_SECTIONS.map((section, si) => {
          const isOpen = section.collapsible ? (openSections[section.key] ?? true) : true;

          return (
            <div key={section.key} className={si > 0 ? "mt-1" : ""}>
              {/* Section header */}
              {section.labelKey && !collapsed && (
                <div
                  className={`flex items-center justify-between px-4 py-1.5 mt-1 ${section.collapsible ? "cursor-pointer hover:text-foreground" : ""}`}
                  onClick={section.collapsible ? () => toggleSection(section.key) : undefined}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50 select-none">
                    {t(section.labelKey, { defaultValue: section.key.toUpperCase() })}
                  </span>
                  {section.collapsible && (
                    <ChevronDown
                      className={`w-3 h-3 text-muted-foreground/40 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
                    />
                  )}
                </div>
              )}
              {section.labelKey && collapsed && <div className="my-1 mx-3 border-t border-border/20" />}

              {/* Items */}
              {(isOpen || collapsed) && (
                <div className="px-2 flex flex-col gap-0.5">
                  {section.items.map(item => renderNavItem(item, section.key === "recherche"))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-border/20 flex items-center justify-around h-12 px-1">
        {onlineCount !== null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-default px-1" data-testid="status-online-count">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                {!collapsed && <span className="text-[11px] text-muted-foreground font-medium tabular-nums">{onlineCount}</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">{onlineCount} {t("header.onlineUsers", { count: onlineCount })}</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={toggleLanguage} data-testid="button-lang-toggle">
              <span className="text-[10px] font-bold">{i18n.language === "fr" ? "FR" : "EN"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{i18n.language === "fr" ? "Switch to English" : "Passer en Français"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={toggleTheme} data-testid="button-theme-toggle">
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{theme === "light" ? t("nav.darkMode") : t("nav.lightMode")}</TooltipContent>
        </Tooltip>
        {user ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => signOut()} data-testid="button-sign-out-bar">
                <LogOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("header.signOut")}</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/login">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" data-testid="button-login-bar">
                  <LogIn className="w-4 h-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">{t("header.signIn")}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen text-foreground flex">

        {/* ── Desktop Sidebar ── */}
        <aside
          className="hidden lg:block fixed top-0 left-0 h-screen z-[998] relative"
          style={{ width: sidebarW, transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)" }}
        >
          {/* Collapse tab */}
          <button
            onClick={toggleCollapsed}
            data-testid="button-sidebar-collapse"
            title={collapsed ? "Expand" : "Collapse"}
            className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full border border-border/60 bg-background shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors z-10"
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
          {sidebarContent}
        </aside>

        {/* ── Main area ── */}
        <div
          className="flex flex-col min-w-0 overflow-x-hidden"
          style={{
            marginLeft: `${sidebarW}px`,
            width: `calc(100vw - ${sidebarW}px)`,
            transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1), width 0.22s cubic-bezier(0.4,0,0.2,1)"
          }}
        >
          {/* Mobile top bar */}
          <header className="lg:hidden sticky top-0 z-[999] w-full border-b border-border/30 bg-background/90 backdrop-blur">
            <div className="h-14 flex items-center justify-between gap-2 px-4">
              <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer">
                  <img src="/favicon.png" alt="Discreen" className="w-8 h-8 rounded-lg object-contain" />
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
              <div className="border-t border-border/30 bg-background/95 backdrop-blur max-h-[80vh] overflow-y-auto">
                <nav className="px-4 py-3 flex flex-col gap-1" data-testid="nav-mobile">
                  {ALL_FLAT_ITEMS.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    const label = itemLabel(item);
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={active ? "secondary" : "ghost"}
                          className="w-full justify-start gap-2"
                          data-testid={`nav-mobile-${label.toLowerCase().replace(/\s+/g, "-")}`}
                          onClick={() => setMobileOpen(false)}
                        >
                          <Icon className="w-4 h-4" />{label}
                          {item.badge && (
                            <span className={`ml-auto text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${badgeClass(item.badgeColor)}`}>
                              {item.badge}
                            </span>
                          )}
                        </Button>
                      </Link>
                    );
                  })}
                  {user && (
                    <>
                      <div className="border-t border-border/30 my-1" />
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

          <main className="flex-1 min-w-0">{children}</main>
          <ChatWidget />
        </div>

        {theme === "dark" && <InteractiveGrid />}
      </div>
    </TooltipProvider>
  );
}
