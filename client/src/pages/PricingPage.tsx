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
  Tag,
  UserSearch,
  Globe,
  FileSearch,
  Wifi,
  Lock,
  Eye,
  ScanLine,
  AlertTriangle,
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
    lifetimePrice: 0,
    icon: Zap,
    popular: false,
    features: [
      "2 recherches par jour",
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
    lifetimePrice: 69.99,
    icon: Crown,
    popular: false,
    features: [
      "50 recherches par jour",
      "Gaming, Email/IP",
      "Recherches Discord / Externes",
      "Acces toutes les bases",
      { text: "Recherche avancee Discreen", excluded: true },
      { text: "Google OSINT illimite", excluded: true },
      "Username OSINT illimite",
      { text: "Moteur de recherche Wanted", excluded: true },
      { text: "Parrainage", excluded: true },
      { text: "Agent DisX IA", excluded: true },
    ],
  },
  {
    id: "pro",
    name: "PRO",
    subtitle: "Puissance maximale",
    price: 14.99,
    lifetimePrice: 124.99,
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
      { text: "Agent DisX IA", excluded: true },
    ],
  },
  {
    id: "business",
    name: "Business",
    subtitle: "Pour les equipes et pros",
    price: 24.99,
    lifetimePrice: 249.99,
    icon: Shield,
    popular: false,
    features: [
      "500 recherches par jour",
      "Gaming, Email/IP",
      "Recherches Discord / Externes",
      "Acces toutes les bases",
      "Recherche avancee Discreen",
      "Google OSINT illimite",
      "Username OSINT illimite",
      "Moteur de recherche Wanted",
      "Parrainage",
      { text: "Agent DisX IA", available: true, isNew: true },
      "Support prioritaire",
    ],
  },
  {
    id: "api",
    name: "API",
    subtitle: "Recherche illimitee + revente",
    price: 49.99,
    lifetimePrice: 399.99,
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
      { text: "Agent DisX IA", available: true, isNew: true },
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
  const [pricingMode, setPricingMode] = useState<"monthly" | "lifetime">("monthly");
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
  const [discountCode, setDiscountCode] = useState("");
  const [discountValidating, setDiscountValidating] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);
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

  async function handleDiscountValidate() {
    if (!discountCode.trim()) return;
    const token = getAccessToken();
    if (!token) return;
    setDiscountValidating(true);
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ code: discountCode.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedDiscount({ code: data.code, percent: data.discountPercent });
        toast({ title: `Code promo appliqué !`, description: `-${data.discountPercent}% sur votre commande` });
      } else {
        setAppliedDiscount(null);
        toast({ title: "Code invalide", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de valider le code", variant: "destructive" });
    } finally {
      setDiscountValidating(false);
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
    setDiscountCode("");
    setAppliedDiscount(null);
    setReferralOpen(true);
  }

  async function proceedToPayment(withReferralCode?: string) {
    if (!pendingPlan) return;
    const token = getAccessToken();
    if (!token) return;

    setReferralOpen(false);
    setLoading(pendingPlan.id);
    try {
      const body: any = { plan: pendingPlan.id, billing: pricingMode };
      if (withReferralCode && withReferralCode.trim()) {
        body.referralCode = withReferralCode.trim().toUpperCase();
      }
      if (appliedDiscount) {
        body.discountCode = appliedDiscount.code;
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

  const isLifetime = pricingMode === "lifetime";

  return (
    <main className="relative">
      <div className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
        isLifetime
          ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/8 via-background to-background"
          : "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background"
      }`} />

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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex justify-center mb-10"
        >
          <div className="relative flex items-center">
            <div
              onClick={() => setPricingMode("monthly")}
              className={`relative z-10 px-6 py-3 rounded-xl border-2 cursor-pointer transition-all duration-300 select-none ${
                pricingMode === "monthly"
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
                  : "bg-card text-muted-foreground border-border/50 -mr-3"
              }`}
              data-testid="button-pricing-monthly"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <div>
                  <p className="text-sm font-bold">Mensuel</p>
                  <p className="text-[10px] opacity-80">Paiement chaque mois</p>
                </div>
              </div>
            </div>
            <div
              onClick={() => setPricingMode("lifetime")}
              className={`relative px-6 py-3 rounded-xl border-2 cursor-pointer transition-all duration-300 select-none ${
                pricingMode === "lifetime"
                  ? "z-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-lg shadow-amber-500/20 scale-105"
                  : "z-0 bg-card text-muted-foreground border-border/50 -ml-3"
              }`}
              data-testid="button-pricing-lifetime"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <div>
                  <p className="text-sm font-bold">Lifetime</p>
                  <p className="text-[10px] opacity-80">Paiement unique</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Cost comparison section */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(8,8,10,0.7)" }}
        >
          <div className="px-6 pt-7 pb-5 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Pourquoi s'abonner ?</p>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
              Coût d'une recherche{" "}
              <span className="text-muted-foreground line-through decoration-red-500/70">sans Discreen</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              Voilà ce que vous payeriez en accédant à chaque outil séparément.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-[rgba(255,255,255,0.05)]">
            {[
              { icon: UserSearch,  name: "Détective privé",           price: "150€/h",   note: "Sans garantie de résultat",  highlight: true },
              { icon: Globe,       name: "Pipl / Spokeo",             price: "25€/mois",  note: "Base US, limitée en Europe" },
              { icon: FileSearch,  name: "LinkedIn Premium",          price: "40€/mois",  note: "Profils uniquement" },
              { icon: Database,    name: "HaveIBeenPwned Pro",        price: "40€/an",    note: "Fuites de données seulement" },
              { icon: Wifi,        name: "OSINT Framework (outils)",  price: "~30€/mois", note: "Configurations manuelles" },
              { icon: ScanLine,    name: "Recherche judiciaire",      price: "30€/acte",  note: "Par demande individuelle",   highlight: true },
              { icon: Lock,        name: "Bases de données privées",  price: "50€/mois",  note: "Accès restreint" },
              { icon: Eye,         name: "Surveillance réseaux",      price: "35€/mois",  note: "Suivi manuel" },
            ].map(({ icon: Icon, name, price, note, highlight }) => (
              <div
                key={name}
                className="flex flex-col items-center text-center gap-2 py-5 px-4"
                style={{ background: highlight ? "rgba(255,60,60,0.04)" : "rgba(8,8,10,0.7)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                  style={{
                    background: highlight ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${highlight ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: highlight ? "#ef4444" : "rgba(255,255,255,0.45)", width: 18, height: 18 }} />
                </div>
                <p className="text-xs text-muted-foreground font-medium leading-tight">{name}</p>
                <p className="text-lg font-bold" style={{ color: highlight ? "#ef4444" : "rgba(255,255,255,0.85)" }}>{price}</p>
                <p className="text-[10px] text-muted-foreground/60 leading-tight">{note}</p>
              </div>
            ))}
          </div>

          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4"
            style={{ background: "rgba(0,0,0,0.4)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400/80 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Sans Discreen :{" "}
                <span className="font-bold text-red-400 line-through decoration-red-400/50">+400€/mois</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 shrink-0" style={{ color: "#d4a843" }} />
              <p className="text-sm font-bold" style={{ color: "#d4a843" }}>
                Discreen · dès 6,99€/mois — tout inclus
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={`grid grid-cols-1 sm:grid-cols-2 ${isLifetime ? "lg:grid-cols-4" : "lg:grid-cols-3 xl:grid-cols-5"} gap-5 mb-16`}
        >
          {PLANS.filter((plan) => !(isLifetime && plan.price === 0)).map((plan) => {
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
                  className={`relative flex flex-col p-5 h-full overflow-visible transition-all duration-300 ${
                    plan.popular && isLifetime
                      ? "border-amber-500/50 shadow-[0_0_24px_-6px] shadow-amber-500/15"
                      : plan.popular
                      ? "border-primary/50 shadow-[0_0_24px_-6px] shadow-primary/15"
                      : ""
                  } ${isTilted && isLifetime ? "shadow-xl shadow-amber-500/20 border-amber-500/40" : isTilted ? "shadow-xl shadow-primary/25 border-primary/40" : ""}`}
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
                      className={`absolute -top-2.5 right-4 text-xs no-default-hover-elevate no-default-active-elevate transition-colors duration-300 ${
                        isLifetime
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {isLifetime ? "Lifetime" : t("pricing.popular")}
                    </Badge>
                  )}

                  <div className="space-y-3 mb-5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                      isLifetime && plan.price > 0 ? "bg-amber-500/10" : "bg-primary/10"
                    }`}>
                      <Icon className={`w-4.5 h-4.5 transition-colors duration-300 ${
                        isLifetime && plan.price > 0 ? "text-amber-500" : "text-primary"
                      }`} />
                    </div>

                    <div>
                      <h3 className="text-lg font-display font-bold">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground">{plan.subtitle}</p>
                    </div>

                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className={`text-2xl font-display font-bold transition-colors duration-300 ${
                        isLifetime && plan.price > 0 ? "text-amber-500" : "text-primary"
                      }`}>
                        {plan.price === 0
                          ? t("pricing.free")
                          : pricingMode === "monthly"
                          ? `€${plan.price.toFixed(2)}`
                          : `€${plan.lifetimePrice.toFixed(2)}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {pricingMode === "monthly" ? t("pricing.perMonth") : "unique"}
                        </span>
                      )}
                    </div>

                    {isLifetime && plan.price > 0 && (() => {
                      const yearlyIfMonthly = plan.price * 12;
                      const savedPerYear = yearlyIfMonthly - plan.lifetimePrice;
                      const discountPct = Math.round((1 - plan.lifetimePrice / yearlyIfMonthly) * 100);
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground line-through">
                              €{plan.price.toFixed(2)}/mois
                            </span>
                            <span className="text-xs font-bold text-amber-500">
                              -{discountPct}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            €{yearlyIfMonthly.toFixed(2)}/an si mensuel
                          </p>
                          <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] px-2 py-0.5 no-default-hover-elevate no-default-active-elevate">
                            Économisez €{savedPerYear.toFixed(2)}/an
                          </Badge>
                        </div>
                      );
                    })()}
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, featureIdx) => {
                      const isExcluded = typeof feature === "object" && (feature as any).excluded;
                      const isSoon = typeof feature === "object" && (feature as any).soon;
                      const isAvailable = typeof feature === "object" && (feature as any).available;
                      const isNew = typeof feature === "object" && (feature as any).isNew;
                      const featureText = typeof feature === "object" ? (feature as any).text : feature;
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
                          whileHover={{ x: 4, transition: { duration: 0.2 } }}
                          className={`flex items-start gap-2 text-xs cursor-default ${
                            isExcluded ? "text-muted-foreground/50 line-through" :
                            isSoon ? "text-red-400/90" :
                            isAvailable ? "text-green-400/90 font-medium" : ""
                          }`}
                        >
                          {isExcluded ? (
                            <X className="w-3.5 h-3.5 text-destructive/60 mt-0.5 shrink-0" />
                          ) : isSoon ? (
                            <X className="w-3.5 h-3.5 text-red-500/70 mt-0.5 shrink-0" />
                          ) : isAvailable ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.5 + featureIdx * 0.06, duration: 0.3, type: "spring", stiffness: 300, damping: 15 }}
                            >
                              <Check className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                            </motion.div>
                          ) : (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.5 + featureIdx * 0.06, duration: 0.3, type: "spring", stiffness: 300, damping: 15 }}
                            >
                              <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            </motion.div>
                          )}
                          <span className="flex items-center gap-1.5 flex-wrap">
                            {featureText}
                            {isNew && <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/15 border border-primary/30 px-1 py-0.5 rounded-full">NEW</span>}
                          </span>
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

      <Dialog open={referralOpen} onOpenChange={(open) => { if (!open) { setReferralOpen(false); setPendingPlan(null); setAppliedDiscount(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Codes de réduction
            </DialogTitle>
            <DialogDescription>
              Entrez un code de parrainage et/ou un code promo (optionnels).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" /> Code de parrainage
              </p>
              <Input
                data-testid="input-referral-code"
                placeholder="DS-XXXXXX"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleReferralSubmit()}
                className="font-mono text-sm text-center tracking-widest"
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Code promo
              </p>
              <div className="flex gap-2">
                <Input
                  data-testid="input-discount-code"
                  placeholder="PROMO2024"
                  value={discountCode}
                  onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setAppliedDiscount(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleDiscountValidate()}
                  className="font-mono text-sm text-center tracking-widest"
                  maxLength={20}
                />
                <Button
                  data-testid="button-validate-discount"
                  variant="outline"
                  size="sm"
                  onClick={handleDiscountValidate}
                  disabled={discountValidating || !discountCode.trim()}
                  className="shrink-0"
                >
                  {discountValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
              </div>
              {appliedDiscount && (
                <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Code <span className="font-mono">{appliedDiscount.code}</span> — -{appliedDiscount.percent}% appliqué
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                data-testid="button-apply-referral"
                onClick={handleReferralSubmit}
                disabled={referralValidating}
                className="w-full gap-2"
              >
                {referralValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {referralCode.trim() ? "Appliquer et continuer" : "Continuer"}
              </Button>
              {(referralCode.trim() || appliedDiscount) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => proceedToPayment()}
                  className="text-xs text-muted-foreground"
                  data-testid="button-skip-referral"
                >
                  Continuer sans code de parrainage
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
