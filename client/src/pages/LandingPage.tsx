import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Search, CreditCard, Database, Shield, Zap, Lock, Mail, User, Phone, Globe, Hash, ArrowRight } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "react-i18next";
import InteractiveGrid from "@/components/InteractiveGrid";

const QUICK_FILTER_KEYS = [
  { key: "email", labelKey: "landing.filters.email", icon: Mail },
  { key: "username", labelKey: "landing.filters.username", icon: User },
  { key: "phone", labelKey: "landing.filters.phone", icon: Phone },
  { key: "ipAddress", labelKey: "landing.filters.ip", icon: Globe },
  { key: "discordId", labelKey: "landing.filters.discord", icon: Hash },
] as const;

function AnimatedCounter({ target, duration = 2000, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return <>{count.toLocaleString("fr-FR")}{suffix}</>;
}

export default function LandingPage() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState("email");
  const [searchValue, setSearchValue] = useState("");
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLoggedIn = !!user;

  const FILTER_PLACEHOLDERS: Record<string, string> = {
    email: t("landing.placeholders.email"),
    username: t("landing.placeholders.username"),
    phone: t("landing.placeholders.phone"),
    ipAddress: t("landing.placeholders.ip"),
    discordId: t("landing.placeholders.discord"),
  };

  const handleSearch = () => setAuthDialogOpen(true);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchValue.trim()) handleSearch();
  };

  return (
    <main className="relative">
      {theme === "dark" && <InteractiveGrid />}

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 text-center">
        <div className="w-full max-w-3xl mx-auto space-y-10">

          {/* Signature phrase */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="signature-phrase text-[10px] md:text-xs tracking-[0.28em] select-none"
          >
            Power. Precision. Intelligence.
          </motion.p>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="text-6xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight leading-[1.02]"
          >
            {t("landing.title1")}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b8902e] via-[#f0c060] to-[#d4a843]">
              {t("landing.title2")}
            </span>
          </motion.h1>

          {/* Subtitle — one concise line */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto"
          >
            {t("landing.subtitle")}
          </motion.p>

          {/* CTA area */}
          {isLoggedIn ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="flex items-center justify-center gap-3 flex-wrap"
            >
              <Link href="/search">
                <Button size="lg" className="gap-2 px-8 shadow-lg shadow-primary/20" data-testid="button-start-searching">
                  <Search className="w-4 h-4" />
                  {t("landing.startSearch")}
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="gap-2 px-8" data-testid="button-view-pricing">
                  <CreditCard className="w-4 h-4" />
                  {t("landing.viewPricing")}
                </Button>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="space-y-4 max-w-lg mx-auto w-full"
            >
              {/* Search bar */}
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <Input
                  placeholder={FILTER_PLACEHOLDERS[activeFilter] || t("landing.searchPlaceholder")}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-13 pl-11 pr-14 text-base rounded-2xl border-border/40 dark:border-white/8 bg-card/60 dark:bg-white/4 backdrop-blur-sm focus-visible:border-primary/50"
                  data-testid="input-landing-search"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 w-9 h-9 rounded-xl bg-primary hover:bg-primary/90 transition-colors flex items-center justify-center text-primary-foreground"
                  data-testid="button-landing-search"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Filter tabs — minimal, no border, text only */}
              <div className="flex items-center justify-center gap-1 flex-wrap">
                {QUICK_FILTER_KEYS.map((filter) => {
                  const isActive = activeFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      onClick={() => setActiveFilter(filter.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 ${
                        isActive
                          ? "bg-primary/12 dark:bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`button-filter-${filter.key}`}
                    >
                      <filter.icon className="w-3 h-3" />
                      {t(filter.labelKey)}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Stats — minimal pill */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.42 }}
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70"
          >
            <span>{t("landing.joinPrefix")}</span>
            <span className="text-primary font-semibold" data-testid="text-counter-users">
              <AnimatedCounter target={1247} duration={2200} />
            </span>
            <span>{t("landing.usersSuffix")}</span>
            <span className="mx-0.5 opacity-30">·</span>
            <span className="text-primary font-semibold" data-testid="text-counter-data">
              <AnimatedCounter target={18} duration={1800} suffix=".7+ To" />
            </span>
            <span>{t("landing.dataSuffix")}</span>
          </motion.div>

          {/* Discord help — minimal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.52 }}
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
            <span>{t("landing.needHelp")}</span>
            <a
              href="https://discord.gg/discreen"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary/80 hover:text-primary transition-colors font-medium"
              data-testid="link-discord-support"
            >
              {t("landing.joinDiscord")}
              <SiDiscord className="w-3 h-3" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Feature strip ── */}
      <section className="relative container max-w-4xl mx-auto px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/20 dark:bg-white/4 rounded-2xl overflow-hidden border border-border/20 dark:border-white/4"
        >
          {[
            { icon: Database, titleKey: "landing.features.databases", descKey: "landing.features.databasesDesc" },
            { icon: Search, titleKey: "landing.features.advancedSearch", descKey: "landing.features.advancedSearchDesc" },
            { icon: Shield, titleKey: "landing.features.secure", descKey: "landing.features.secureDesc" },
            { icon: Zap, titleKey: "landing.features.fast", descKey: "landing.features.fastDesc" },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-background dark:bg-[hsl(0,0%,5%)] p-6 space-y-2.5 group hover:bg-primary/3 dark:hover:bg-primary/4 transition-colors duration-300"
              data-testid={`feature-card-${i}`}
            >
              <item.icon className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
              <h3 className="font-semibold text-sm text-foreground">{t(item.titleKey)}</h3>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">{t(item.descKey)}</p>
            </div>
          ))}
        </motion.div>
      </section>

      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-sm text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-display font-bold">{t("landing.authRequired")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("landing.authDesc")}</p>
            </div>
            <Button
              size="lg"
              className="w-full gap-2 mt-2"
              onClick={() => { setAuthDialogOpen(false); navigate("/login"); }}
              data-testid="button-auth-redirect"
            >
              {t("landing.signUp")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
