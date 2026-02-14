import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Search, CreditCard, Sparkles, Database, Shield, Zap, Lock, Mail, User, Phone, Globe, Hash } from "lucide-react";
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

  const formatted = count.toLocaleString("fr-FR");

  return <>{formatted}{suffix}</>;
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

  const handleSearch = () => {
    setAuthDialogOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchValue.trim()) {
      handleSearch();
    }
  };

  return (
    <main className="relative overflow-hidden">
      {theme === "dark" && <InteractiveGrid />}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground) / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <section className="relative container max-w-5xl mx-auto px-4 pt-20 pb-12 text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-sm font-medium border-primary/30 text-primary gap-2"
            data-testid="badge-platform"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t("landing.badge")}
            <Search className="w-3.5 h-3.5" />
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.05]"
        >
          {t("landing.title1")}{" "}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
            {t("landing.title2")}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          {t("landing.subtitle")}
        </motion.p>

        {isLoggedIn ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex items-center justify-center"
            >
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-secondary/60 dark:bg-secondary/40 px-5 py-2.5 rounded-full border border-border/50">
                <span>{t("landing.joinPrefix")}</span>
                <span className="font-bold text-primary" data-testid="text-counter-users">
                  <AnimatedCounter target={1247} duration={2200} />
                </span>
                <span>{t("landing.usersSuffix")}</span>
                <span className="font-bold text-primary" data-testid="text-counter-data">
                  <AnimatedCounter target={18} duration={1800} suffix=".7+ To" />
                </span>
                <span>{t("landing.dataSuffix")}</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center justify-center gap-4 flex-wrap"
            >
              <Link href="/search">
                <Button size="lg" className="gap-2 shadow-lg shadow-primary/25 px-8" data-testid="button-start-searching">
                  <Search className="w-5 h-5" />
                  {t("landing.startSearch")}
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="gap-2 px-8" data-testid="button-view-pricing">
                  <CreditCard className="w-5 h-5" />
                  {t("landing.viewPricing")}
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t("landing.needHelp")}</span>
              <a
                href="https://discord.gg/discreen"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-primary"
                data-testid="link-discord-support"
              >
                {t("landing.joinDiscord")}
                <SiDiscord className="w-4 h-4" />
              </a>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="max-w-xl mx-auto space-y-4"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder={FILTER_PLACEHOLDERS[activeFilter] || t("landing.searchPlaceholder")}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-12 pl-12 pr-24 text-base rounded-full border-border/60 bg-card/80 backdrop-blur-sm"
                  data-testid="input-landing-search"
                />
                <Button
                  size="sm"
                  onClick={handleSearch}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full gap-1.5 px-4"
                  data-testid="button-landing-search"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap">
                {QUICK_FILTER_KEYS.map((filter) => {
                  const isActive = activeFilter === filter.key;
                  return (
                    <Button
                      key={filter.key}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter(filter.key)}
                      className="rounded-full gap-1.5"
                      data-testid={`button-filter-${filter.key}`}
                    >
                      <filter.icon className="w-3.5 h-3.5" />
                      {t(filter.labelKey)}
                    </Button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center justify-center"
            >
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-secondary/60 dark:bg-secondary/40 px-5 py-2.5 rounded-full border border-border/50">
                <span>{t("landing.joinPrefix")}</span>
                <span className="font-bold text-primary" data-testid="text-counter-users">
                  <AnimatedCounter target={1247} duration={2200} />
                </span>
                <span>{t("landing.usersSuffix")}</span>
                <span className="font-bold text-primary" data-testid="text-counter-data">
                  <AnimatedCounter target={18} duration={1800} suffix=".7+ To" />
                </span>
                <span>{t("landing.dataSuffix")}</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex items-center justify-center gap-4 flex-wrap"
            >
              <p className="text-sm text-muted-foreground">
                {t("landing.disclaimer")}{" "}
                <Link href="/documentation" className="text-primary hover:underline">{t("landing.terms")}</Link>
                {" "}{t("landing.and")}{" "}
                <Link href="/documentation" className="text-primary hover:underline">{t("landing.privacy")}</Link>.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t("landing.needHelp")}</span>
              <a
                href="https://discord.gg/discreen"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-primary"
                data-testid="link-discord-support"
              >
                {t("landing.joinDiscord")}
                <SiDiscord className="w-4 h-4" />
              </a>
            </motion.div>
          </>
        )}
      </section>

      <section className="relative container max-w-5xl mx-auto px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            {
              icon: Database,
              titleKey: "landing.features.databases",
              descKey: "landing.features.databasesDesc",
            },
            {
              icon: Search,
              titleKey: "landing.features.advancedSearch",
              descKey: "landing.features.advancedSearchDesc",
            },
            {
              icon: Shield,
              titleKey: "landing.features.secure",
              descKey: "landing.features.secureDesc",
            },
            {
              icon: Zap,
              titleKey: "landing.features.fast",
              descKey: "landing.features.fastDesc",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="glass-panel rounded-xl p-5 space-y-3 hover-elevate"
              data-testid={`feature-card-${i}`}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground">{t(item.titleKey)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(item.descKey)}</p>
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
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("landing.authDesc")}
              </p>
            </div>
            <Button
              size="lg"
              className="w-full gap-2 mt-2"
              onClick={() => {
                setAuthDialogOpen(false);
                navigate("/login");
              }}
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
