import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Zap,
  Crown,
  Rocket,
  Briefcase,
  Code,
  Check,
  RefreshCw,
  Database,
  Search,
  Shield,
  ArrowRight,
  Loader2,
  Key,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const PLANS = [
  {
    id: "free",
    name: "Free",
    subtitle: "Pour commencer",
    price: 0,
    icon: Zap,
    popular: false,
    features: [
      "5 recherches par jour",
      "Bases de donnees limitees",
      "Recherche basique",
      "Resultats limites",
    ],
  },
  {
    id: "vip",
    name: "VIP",
    subtitle: "Pour les utilisateurs reguliers",
    price: 6.99,
    icon: Crown,
    popular: false,
    features: [
      "50 recherches par jour",
      "Fivem Donnees, Email/IP",
      "Recherches Discord / Externes",
      "Acces toutes les bases",
      "Google OSINT illimite",
      "Username Sherlock illimite",
    ],
  },
  {
    id: "pro",
    name: "PRO",
    subtitle: "Puissance maximale",
    price: 14.99,
    icon: Rocket,
    popular: true,
    features: [
      "200 recherches par jour",
      "Fivem Donnees, Email/IP",
      "Recherches Discord / Externes",
      "Acces toutes les bases",
      "Google OSINT illimite",
      "Username Sherlock illimite",
      "Moteur de recherche Wanted",
      "Parrainage",
    ],
  },
  {
    id: "business",
    name: "Business",
    subtitle: "Pour les professionnels",
    price: 24.99,
    icon: Briefcase,
    popular: false,
    features: [
      "500 recherches par jour",
      "Fivem Donnees, Email/IP",
      "Recherches Discord / Externes",
      "Acces toutes les bases",
      "Google OSINT illimite",
      "Username Sherlock illimite",
      "Moteur de recherche Wanted",
      "Parrainage",
      "Support Prioritaire",
    ],
  },
  {
    id: "api",
    name: "API",
    subtitle: "Recherche illimitee + revente",
    price: 49.99,
    icon: Code,
    popular: false,
    features: [
      "Recherches illimitees",
      "Cle API dediee",
      "Acces toutes les bases",
      "Google OSINT illimite",
      "Username Sherlock illimite",
      "Moteur de recherche Wanted",
      "Possibilite de revente",
      "Endpoint API /api/v1/search",
      "Support premium 24/7",
    ],
  },
];

const HIGHLIGHTS = [
  { icon: RefreshCw, label: "Renouvellement quotidien" },
  { icon: Database, label: "Toutes les bases incluses" },
  { icon: Search, label: "Recherche parametrique" },
  { icon: Shield, label: "Paiements securises" },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function PricingPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemKey, setRedeemKey] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const { toast } = useToast();
  const { getAccessToken, refreshRole, role, expiresAt } = useAuth();

  const getDaysRemaining = (planId: string): number | null => {
    if (!role || role === "free" || role === "admin") return null;
    if (role !== planId) return null;
    if (!expiresAt) return null;
    const now = new Date();
    const exp = new Date(expiresAt);
    if (exp <= now) return null;
    return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  async function handleRedeem() {
    if (!redeemKey.trim()) return;
    const token = getAccessToken();
    if (!token) {
      toast({
        title: t("pricing.errors.error"),
        description: t("pricing.errors.mustBeLoggedInRedeem"),
        variant: "destructive",
      });
      return;
    }

    setRedeemLoading(true);
    try {
      const res = await fetch("/api/redeem-key", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ key: redeemKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("pricing.errors.redeemError"));
      }
      toast({
        title: t("pricing.errors.keyActivated"),
        description: data.message,
      });
      await refreshRole();
      setRedeemOpen(false);
      setRedeemKey("");
    } catch (err) {
      toast({
        title: t("pricing.errors.error"),
        description: err instanceof Error ? err.message : t("pricing.errors.invalidKey"),
        variant: "destructive",
      });
    } finally {
      setRedeemLoading(false);
    }
  }

  async function handleSubscribe(plan: typeof PLANS[number]) {
    if (plan.price === 0) {
      toast({
        title: t("pricing.free"),
        description: t("pricing.errors.freePlan"),
      });
      return;
    }

    const token = getAccessToken();
    if (!token) {
      toast({
        title: t("pricing.errors.error"),
        description: t("pricing.errors.mustBeLoggedIn"),
        variant: "destructive",
      });
      return;
    }

    setLoading(plan.id);
    try {
      const res = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ plan: plan.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || t("pricing.errors.invoiceError"));
      }

      const data = await res.json();
      if (data.invoice_url) {
        window.open(data.invoice_url, "_blank");
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast({
        title: t("pricing.errors.error"),
        description: err instanceof Error ? err.message : t("pricing.errors.error"),
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background pointer-events-none" />

      <div className="relative container max-w-7xl mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-12"
        >
          <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium border-primary/30 text-primary gap-2">
            <CreditCard className="w-3.5 h-3.5" />
            {t("pricing.badge")}
          </Badge>

          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
            {t("pricing.title")} <span className="text-primary">{t("pricing.titleHighlight")}</span>
          </h1>

          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            {t("pricing.subtitle")}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-4 md:gap-6 pt-2"
          >
            {HIGHLIGHTS.map((h) => (
              <div key={h.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <h.icon className="w-3.5 h-3.5 text-primary/70" />
                <span>{h.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-16"
        >
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loading === plan.id;
            const isHovered = hoveredPlan === plan.id;
            const isSiblingHovered = hoveredPlan !== null && hoveredPlan !== plan.id;
            return (
              <motion.div
                key={plan.id}
                variants={cardVariants}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                style={{
                  transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), filter 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                  transform: isHovered ? "scale(1.05)" : isSiblingHovered ? "scale(0.97)" : "scale(1)",
                  filter: isSiblingHovered ? "blur(2px) opacity(0.6)" : "blur(0px) opacity(1)",
                  zIndex: isHovered ? 10 : 1,
                }}
              >
                <Card
                  className={`relative flex flex-col p-5 h-full overflow-visible ${
                    plan.popular ? "border-primary/50 shadow-[0_0_24px_-6px] shadow-primary/15" : ""
                  } ${isHovered ? "shadow-lg shadow-primary/20 border-primary/40" : ""}`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  {plan.popular && (
                    <Badge
                      className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-xs no-default-hover-elevate no-default-active-elevate"
                    >
                      {t("pricing.popular")}
                    </Badge>
                  )}

                  <div className="space-y-3 mb-5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-primary" />
                    </div>

                    <div>
                      <h3 className="text-lg font-display font-bold">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground">{plan.subtitle}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-display font-bold text-primary">
                        {plan.price === 0 ? t("pricing.free") : `€${plan.price.toFixed(2)}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-xs text-muted-foreground">{t("pricing.perMonth")}</span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {(() => {
                    const daysLeft = getDaysRemaining(plan.id);
                    if (daysLeft !== null && daysLeft > 0) {
                      return (
                        <Badge
                          data-testid={`badge-days-remaining-${plan.id}`}
                          className="w-full justify-center py-2 bg-primary/10 text-primary border-primary/20 no-default-hover-elevate no-default-active-elevate"
                        >
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          {t("pricing.daysRemaining", { count: daysLeft })}
                        </Badge>
                      );
                    }
                    return (
                      <Button
                        data-testid={`button-subscribe-${plan.id}`}
                        className="w-full gap-2"
                        size="sm"
                        variant={plan.popular ? "default" : "outline"}
                        onClick={() => handleSubscribe(plan)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t("pricing.loading")}
                          </>
                        ) : plan.price === 0 ? (
                          <>
                            {t("pricing.startNow")}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            {t("pricing.subscribe")}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
                    );
                  })()}
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{t("pricing.redeem.title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("pricing.redeem.subtitle")}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              data-testid="button-redeem"
              onClick={() => setRedeemOpen(true)}
            >
              {t("pricing.redeem.button")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Card>
        </motion.div>
      </div>

      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              {t("pricing.redeem.dialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("pricing.redeem.dialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              data-testid="input-redeem-key"
              placeholder="DSC-VIP-XXXXXXXXXXXX"
              value={redeemKey}
              onChange={(e) => setRedeemKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
              className="font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setRedeemOpen(false); setRedeemKey(""); }}
              >
                {t("pricing.redeem.cancel")}
              </Button>
              <Button
                data-testid="button-confirm-redeem"
                size="sm"
                onClick={handleRedeem}
                disabled={redeemLoading || !redeemKey.trim()}
                className="gap-1.5"
              >
                {redeemLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {t("pricing.redeem.activate")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
