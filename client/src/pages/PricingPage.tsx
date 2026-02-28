import { useState, useCallback } from "react";
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
  Code,
  Check,
  X,
  RefreshCw,
  Database,
  Search,
  Shield,
  ArrowRight,
  Loader2,
  Key,
  Clock,
  Gift,
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
      "Gaming, Email/IP",
      "Recherches Discord / Externes",
      "Acces toutes les bases",
      { text: "Recherche avancee Discreen", excluded: true },
      "Google OSINT illimite",
      "Username OSINT illimite",
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
      "Gaming, Email/IP",
      "Recherches Discord / Externes",
      "Acces toutes les bases",
      "Recherche avancee Discreen",
      "Google OSINT illimite",
      "Username OSINT illimite",
      "Moteur de recherche Wanted",
      "Parrainage",
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
      "Recherche avancee Discreen",
      "Google OSINT illimite",
      "Username OSINT illimite",
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
  { icon: Search, label: "Recherche Paramétrique" },
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
  const [tiltStyles, setTiltStyles] = useState<Record<string, { rotateX: number; rotateY: number; scale: number }>>({});

  const handleTiltMove = useCallback((planId: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - y) * 20;
    const rotateY = (x - 0.5) * 20;
    setTiltStyles(prev => ({ ...prev, [planId]: { rotateX, rotateY, scale: 1.04 } }));
  }, []);

  const handleTiltLeave = useCallback((planId: string) => {
    setTiltStyles(prev => ({ ...prev, [planId]: { rotateX: 0, rotateY: 0, scale: 1 } }));
  }, []);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemKey, setRedeemKey] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralValidating, setReferralValidating] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<typeof PLANS[number] | null>(null);
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

  function handleSubscribe(plan: typeof PLANS[number]) {
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

    setPendingPlan(plan);
    setReferralCode("");
    setReferralOpen(true);
  }

  async function proceedToPayment(withReferralCode?: string) {
    if (!pendingPlan) return;
    const token = getAccessToken();
    if (!token) return;

    setReferralOpen(false);
    setLoading(pendingPlan.id);
    try {
      const body: any = { plan: pendingPlan.id };
      if (withReferralCode && withReferralCode.trim()) {
        body.referralCode = withReferralCode.trim().toUpperCase();
      }

      const res = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body),
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
      setPendingPlan(null);
    }
  }

  async function handleReferralSubmit() {
    if (!referralCode.trim()) {
      proceedToPayment();
      return;
    }
    setReferralValidating(true);
    try {
      const res = await fetch("/api/referral/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referralCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (data.valid) {
        toast({ title: "Code de parrainage appliqué !" });
        proceedToPayment(referralCode);
      } else {
        toast({ title: "Code invalide", description: "Ce code de parrainage n'existe pas.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setReferralValidating(false);
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16"
        >
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loading === plan.id;
            const tilt = tiltStyles[plan.id] || { rotateX: 0, rotateY: 0, scale: 1 };
            const isTilted = tilt.scale > 1;
            return (
              <motion.div
                key={plan.id}
                variants={cardVariants}
                onMouseMove={(e) => handleTiltMove(plan.id, e)}
                onMouseLeave={() => handleTiltLeave(plan.id)}
                style={{
                  perspective: "800px",
                }}
              >
                <Card
                  className={`relative flex flex-col p-5 h-full overflow-visible transition-shadow duration-300 ${
                    plan.popular ? "border-primary/50 shadow-[0_0_24px_-6px] shadow-primary/15" : ""
                  } ${isTilted ? "shadow-xl shadow-primary/25 border-primary/40" : ""}`}
                  style={{
                    transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(${tilt.scale}, ${tilt.scale}, ${tilt.scale})`,
                    transition: "transform 0.15s ease-out",
                    transformStyle: "preserve-3d",
                    willChange: "transform",
                  }}
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

                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-2xl font-display font-bold text-primary">
                        {plan.price === 0 ? t("pricing.free") : `€${plan.price.toFixed(2)}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-xs text-muted-foreground">{t("pricing.perMonth")}</span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, featureIdx) => {
                      const isExcluded = typeof feature === "object" && feature.excluded;
                      const featureText = typeof feature === "object" ? feature.text : feature;
                      return (
                        <motion.li
                          key={featureText}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay: 0.4 + featureIdx * 0.06,
                            duration: 0.35,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          whileHover={{
                            x: 4,
                            transition: { duration: 0.2 },
                          }}
                          className={`flex items-start gap-2 text-xs cursor-default ${isExcluded ? "text-muted-foreground/50 line-through" : ""}`}
                        >
                          {isExcluded ? (
                            <X className="w-3.5 h-3.5 text-destructive/60 mt-0.5 shrink-0" />
                          ) : (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{
                                delay: 0.5 + featureIdx * 0.06,
                                duration: 0.3,
                                type: "spring",
                                stiffness: 300,
                                damping: 15,
                              }}
                            >
                              <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            </motion.div>
                          )}
                          <span>{featureText}</span>
                        </motion.li>
                      );
                    })}
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

      <Dialog open={referralOpen} onOpenChange={(open) => { if (!open) { setReferralOpen(false); setPendingPlan(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Code de parrainage
            </DialogTitle>
            <DialogDescription>
              Avez-vous un code de parrainage ? Entrez-le ci-dessous. Sinon, cliquez sur "Continuer sans code".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              data-testid="input-referral-code"
              placeholder="DS-XXXXXX"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleReferralSubmit()}
              className="font-mono text-sm text-center tracking-widest"
              maxLength={10}
            />
            <div className="flex flex-col gap-2">
              <Button
                data-testid="button-apply-referral"
                onClick={handleReferralSubmit}
                disabled={referralValidating}
                className="w-full gap-2"
              >
                {referralValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : referralCode.trim() ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {referralCode.trim() ? "Appliquer et continuer" : "Continuer sans code"}
              </Button>
              {referralCode.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => proceedToPayment()}
                  className="text-xs text-muted-foreground"
                  data-testid="button-skip-referral"
                >
                  Passer sans code
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
