import { useState } from "react";
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
  ArrowRight,
  Loader2,
  Key,
  ChevronDown,
  ChevronUp,
  Search,
  Database,
  Shield,
  Globe,
  Gamepad2,
  MessageSquare,
  Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

const PLANS = [
  {
    id: "free",
    name: "Free",
    subtitle: "Acces basique a la plateforme",
    price: 0,
    yearlyPrice: 0,
    icon: Zap,
    popular: false,
    color: "text-muted-foreground",
    borderColor: "",
    features: [
      "5 recherches par jour",
      "Bases de donnees limitees",
      "Recherche basique",
      "Resultats limites",
      "Support communautaire",
    ],
    dailyLookups: "10",
    apiAccess: false,
  },
  {
    id: "vip",
    name: "Starter",
    subtitle: "Intelligence essentielle pour debutants",
    price: 6.99,
    yearlyPrice: 4.89,
    icon: Crown,
    popular: false,
    color: "text-cyan-400",
    borderColor: "border-cyan-500/30",
    features: [
      "100 recherches par jour",
      "Acces API : Inclus",
      "Cout par recherche : 0.0023 EUR",
      "Acces API",
      "Support prioritaire",
    ],
    dailyLookups: "100",
    apiAccess: true,
  },
  {
    id: "pro",
    name: "Pro",
    subtitle: "Capacites avancees pour professionnels",
    price: 14.99,
    yearlyPrice: 10.49,
    icon: Rocket,
    popular: true,
    color: "text-primary",
    borderColor: "border-primary/50",
    features: [
      "500 recherches par jour",
      "Acces API : Inclus",
      "Cout par recherche : 0.0014 EUR",
      "Quotas ameliores",
      "Support premium",
      "Fonctionnalites avancees",
    ],
    dailyLookups: "500",
    apiAccess: true,
  },
  {
    id: "business",
    name: "Business",
    subtitle: "Pour les equipes et organisations",
    price: 24.99,
    yearlyPrice: 17.49,
    icon: Briefcase,
    popular: false,
    color: "text-muted-foreground",
    borderColor: "",
    features: [
      "1000 recherches par jour",
      "Acces API : Inclus",
      "Tout du plan Pro",
      "Support prioritaire 24/7",
    ],
    dailyLookups: "1000",
    apiAccess: true,
  },
  {
    id: "api",
    name: "Enterprise",
    subtitle: "Pour les grandes equipes et organisations",
    price: 49.99,
    yearlyPrice: 34.99,
    icon: Code,
    popular: false,
    color: "text-cyan-400",
    borderColor: "border-cyan-500/20",
    features: [
      "5000 recherches par jour",
      "Support 24/7",
      "SLA garanti",
      "Integrations personnalisees",
    ],
    dailyLookups: "5000",
    apiAccess: true,
  },
];

const COMPARE_ROWS = [
  {
    icon: Zap,
    label: "Prix",
    sublabel: "par mois",
    values: ["0 EUR", "6.99 EUR", "14.99 EUR", "24.99 EUR", "49.99 EUR"],
    oldValues: [null, "9.99 EUR", "29.99 EUR", null, "199.99 EUR"],
  },
  {
    icon: Search,
    label: "Recherches quotidiennes",
    sublabel: "recherches par jour",
    values: ["10", "100", "500", "1 000", "5 000"],
    oldValues: [null, null, null, null, null],
  },
  {
    icon: Code,
    label: "Acces API",
    sublabel: "acces programmatique",
    values: ["no", "yes", "yes", "yes", "yes"],
    oldValues: [null, null, null, null, null],
  },
];

const SERVICE_QUOTAS = [
  {
    category: "Services de donnees",
    icon: Database,
    items: [
      { name: "Breach Search", values: [1, 1, 1, 1, 1] },
      { name: "Stealer Search", values: [1, 1, 1, 1, 1] },
      { name: "V2 Stealer Search", values: [2, 2, 2, 2, 2] },
      { name: "V2 Victims Search", values: [2, 2, 2, 2, 2] },
    ],
  },
  {
    category: "Social & Gaming",
    icon: Gamepad2,
    items: [
      { name: "Discord User Info", values: [2, 5, 10, 10, 20] },
      { name: "Discord History", values: [2, 5, 10, 10, 20] },
      { name: "Discord to Roblox", values: [2, 5, 10, 10, 20] },
      { name: "Roblox User Info", values: [2, 5, 10, 10, 20] },
      { name: "Steam User Info", values: [2, 5, 10, 10, 20] },
      { name: "Xbox User Info", values: [2, 5, 10, 10, 20] },
      { name: "Minecraft History", values: [2, 5, 10, 10, 20] },
    ],
  },
  {
    category: "Intelligence technique",
    icon: Globe,
    items: [
      { name: "IP Info", values: [2, 5, 10, 10, 20] },
      { name: "Extract Subdomain", values: [1, 1, 1, 1, 1] },
      { name: "GHunt", values: [2, 5, 10, 10, 20] },
      { name: "Holehe", values: [2, 5, 10, 10, 20] },
    ],
  },
];

const PLAN_NAMES = ["Free", "Starter", "Pro", "Business", "Enterprise"];
const PLAN_COLORS = ["text-muted-foreground", "text-cyan-400", "text-primary", "text-muted-foreground", "text-cyan-400"];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [showQuotas, setShowQuotas] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemKey, setRedeemKey] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const { toast } = useToast();
  const { getAccessToken, refreshRole } = useAuth();

  const isYearly = billingPeriod === "yearly";

  async function handleRedeem() {
    if (!redeemKey.trim()) return;
    const token = getAccessToken();
    if (!token) {
      toast({ title: "Erreur", description: "Vous devez etre connecte pour echanger une cle.", variant: "destructive" });
      return;
    }
    setRedeemLoading(true);
    try {
      const res = await fetch("/api/redeem-key", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ key: redeemKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur lors de l'echange");
      toast({ title: "Cle activee", description: data.message });
      await refreshRole();
      setRedeemOpen(false);
      setRedeemKey("");
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Cle invalide", variant: "destructive" });
    } finally {
      setRedeemLoading(false);
    }
  }

  async function handleSubscribe(plan: typeof PLANS[number]) {
    if (plan.price === 0) {
      toast({ title: "Plan gratuit", description: "Vous utilisez deja le plan gratuit par defaut." });
      return;
    }
    const token = getAccessToken();
    if (!token) {
      toast({ title: "Erreur", description: "Vous devez etre connecte pour vous abonner.", variant: "destructive" });
      return;
    }
    setLoading(plan.id);
    try {
      const res = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ plan: plan.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erreur lors de la creation de la facture");
      }
      const data = await res.json();
      if (data.invoice_url) window.open(data.invoice_url, "_blank");
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur inconnue", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  const mainPlans = PLANS.filter(p => p.id !== "api");
  const enterprisePlan = PLANS.find(p => p.id === "api")!;

  return (
    <main className="relative min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative container max-w-7xl mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-12"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight">
            Choisissez votre <span className="text-primary italic">Plan.</span>
          </h1>

          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Choisissez le plan qui correspond a votre utilisation et evoluez a tout moment.
          </p>

          <div className="flex items-center justify-center pt-4">
            <div className="inline-flex items-center rounded-full border border-border/50 bg-secondary/30 p-1 gap-1">
              <Button
                data-testid="button-billing-yearly"
                variant={isYearly ? "secondary" : "ghost"}
                size="sm"
                className="rounded-full gap-2"
                onClick={() => setBillingPeriod("yearly")}
              >
                Annuel
                {isYearly && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] no-default-hover-elevate no-default-active-elevate">
                    -30%
                  </Badge>
                )}
              </Button>
              <Button
                data-testid="button-billing-monthly"
                variant={!isYearly ? "secondary" : "ghost"}
                size="sm"
                className="rounded-full"
                onClick={() => setBillingPeriod("monthly")}
              >
                Mensuel
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12 items-start"
        >
          {mainPlans.map((plan, idx) => {
            const Icon = plan.icon;
            const isLoading = loading === plan.id;
            const price = isYearly ? plan.yearlyPrice : plan.price;
            const monthlyEquiv = isYearly && plan.price > 0 ? (plan.yearlyPrice * 12).toFixed(2) : null;
            const yearlySaving = isYearly && plan.price > 0 ? ((plan.price - plan.yearlyPrice) * 12).toFixed(2) : null;

            return (
              <motion.div key={plan.id} variants={cardVariants}>
                <Card
                  className={`relative flex flex-col p-6 h-full overflow-visible ${
                    plan.popular
                      ? "border-primary/50 shadow-[0_0_30px_-6px] shadow-primary/20 lg:-mt-4 lg:mb-4"
                      : plan.borderColor
                  }`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground text-xs no-default-hover-elevate no-default-active-elevate">
                        Meilleur rapport qualite-prix
                      </Badge>
                      {isYearly && (
                        <Badge className="bg-red-500 text-white text-xs no-default-hover-elevate no-default-active-elevate">
                          4 mois offerts
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    <div>
                      <h3 className={`text-xl font-display font-bold ${plan.color}`}>{plan.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.subtitle}</p>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-display font-bold">
                          {price === 0 ? "0 EUR" : `${price.toFixed(2)} EUR`}
                        </span>
                        {price > 0 && <span className="text-sm text-muted-foreground">/mois</span>}
                      </div>
                      {isYearly && plan.price > 0 && (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-muted-foreground line-through">{(plan.price * 12).toFixed(2)} EUR/an</p>
                          <p className="text-xs text-muted-foreground">{monthlyEquiv} EUR/an</p>
                          <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 mt-1 no-default-hover-elevate no-default-active-elevate">
                            Economisez {yearlySaving} EUR/an
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    data-testid={`button-subscribe-${plan.id}`}
                    className={`w-full gap-2 mb-6 ${plan.popular ? "" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : plan.price === 0 ? (
                      "Plan actuel"
                    ) : plan.popular ? (
                      <>
                        Passer au Pro
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      "Commencer"
                    )}
                  </Button>

                  {plan.popular && (
                    <Button
                      data-testid="button-compare-plans"
                      variant="link"
                      size="sm"
                      className="text-xs text-muted-foreground underline underline-offset-2 mb-4 w-full"
                      onClick={() => {
                        const el = document.getElementById("compare-plans");
                        el?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Comparer les plans
                    </Button>
                  )}

                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mb-16"
        >
          <Card className={`p-6 md:p-8 overflow-visible ${enterprisePlan.borderColor}`} data-testid="card-plan-api">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <Code className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-cyan-400">{enterprisePlan.name}</h3>
                  <p className="text-sm text-muted-foreground">{enterprisePlan.subtitle}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {[
                  { label: "5000", sublabel: "recherches/jour" },
                  { label: "24/7", sublabel: "support" },
                  { label: "SLA", sublabel: "garanti" },
                  { label: "Custom", sublabel: "integrations" },
                ].map((item) => (
                  <div key={item.sublabel} className="px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 text-center min-w-[90px]">
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.sublabel}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-border/50">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold">
                  {isYearly ? `${enterprisePlan.yearlyPrice.toFixed(2)} EUR` : `${enterprisePlan.price.toFixed(2)} EUR`}
                </span>
                <span className="text-sm text-muted-foreground">/mois</span>
                {isYearly && (
                  <>
                    <span className="text-sm text-muted-foreground line-through ml-2">{enterprisePlan.price.toFixed(2)} EUR</span>
                    <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 no-default-hover-elevate no-default-active-elevate">-30%</Badge>
                  </>
                )}
              </div>
              <Button
                data-testid="button-subscribe-api"
                className="gap-2 bg-cyan-600 text-white border-cyan-600"
                onClick={() => handleSubscribe(enterprisePlan)}
                disabled={loading === "api"}
              >
                {loading === "api" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Passer a Enterprise
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mb-16"
        >
          <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Vous avez deja une cle ?</p>
                <p className="text-xs text-muted-foreground">Echangez-la pour activer votre abonnement</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" data-testid="button-redeem" onClick={() => setRedeemOpen(true)}>
              Echanger <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Card>
        </motion.div>

        <div id="compare-plans" className="scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="text-center space-y-3 mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold">Comparer les <span className="text-primary">Plans</span></h2>
            <p className="text-muted-foreground text-sm">Tout ce dont vous avez besoin pour faire le bon choix</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-4 px-4 w-[200px]" />
                    {PLAN_NAMES.map((name, i) => (
                      <th key={name} className={`py-4 px-3 text-center text-sm font-semibold ${PLAN_COLORS[i]}`}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => {
                    const RowIcon = row.icon;
                    return (
                      <tr key={row.label}>
                        <td className="py-5 px-4">
                          <Card className="p-4 flex items-center gap-3 border-border/30">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <RowIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{row.label}</p>
                              <p className="text-[11px] text-muted-foreground">{row.sublabel}</p>
                            </div>
                          </Card>
                        </td>
                        {row.values.map((val, i) => (
                          <td key={i} className="py-5 px-3 text-center">
                            <Card className={`p-4 ${i === 2 ? "border-primary/30" : "border-border/30"}`}>
                              {val === "yes" ? (
                                <div className="flex items-center justify-center">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${i === 2 ? "bg-primary/20" : "bg-primary/10"}`}>
                                    <Check className={`w-3.5 h-3.5 ${i === 2 ? "text-primary" : "text-primary/70"}`} />
                                  </div>
                                </div>
                              ) : val === "no" ? (
                                <div className="flex items-center justify-center">
                                  <Minus className="w-4 h-4 text-muted-foreground/40" />
                                </div>
                              ) : (
                                <div>
                                  <p className={`text-lg font-bold ${i === 2 ? "text-primary" : i === 4 ? "text-cyan-400" : ""}`}>{val}</p>
                                  {row.oldValues[i] && (
                                    <p className="text-xs text-muted-foreground line-through">{row.oldValues[i]}</p>
                                  )}
                                </div>
                              )}
                            </Card>
                          </td>
                        ))}
                      </tr>
                    );
                  })}

                  <tr>
                    <td className="py-5 px-4">
                      <Card className="p-4 flex items-center gap-3 border-border/30">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Database className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Quotas de services</p>
                          <p className="text-[11px] text-muted-foreground">{SERVICE_QUOTAS.reduce((s, c) => s + c.items.length, 0)} services inclus</p>
                        </div>
                      </Card>
                    </td>
                    <td colSpan={5} className="py-5 px-3 text-right">
                      <Button
                        data-testid="button-toggle-quotas"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setShowQuotas(!showQuotas)}
                      >
                        {showQuotas ? "Masquer les details" : "Voir les details"}
                        {showQuotas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {showQuotas && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-x-auto"
              >
                <table className="w-full border-collapse">
                  {SERVICE_QUOTAS.map((category) => {
                    const CatIcon = category.icon;
                    return (
                      <tbody key={category.category}>
                        <tr>
                          <td className="py-3 px-4 w-[200px]">
                            <div className="flex items-center gap-2">
                              <CatIcon className="w-4 h-4 text-primary" />
                              <span className="text-sm font-bold">{category.category}</span>
                            </div>
                          </td>
                          <td colSpan={5} />
                        </tr>
                        {category.items.map((item) => (
                          <tr key={item.name} className="border-t border-border/20">
                            <td className="py-3 px-4 pl-10">
                              <span className="text-sm text-muted-foreground">{item.name}</span>
                            </td>
                            {item.values.map((v, i) => (
                              <td key={i} className="py-3 px-3 text-center">
                                <span className={`text-sm font-semibold ${i === 2 ? "text-primary" : i === 4 ? "text-cyan-400" : ""}`}>{v}</span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    );
                  })}
                </table>
              </motion.div>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="text-center mt-16 space-y-3"
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <p className="text-sm">Besoin de plus ? Limites personnalisees, tarification en volume ou infrastructure dediee ?</p>
          </div>
          <Link href="/contact">
            <Button variant="outline" className="gap-2" data-testid="button-contact-custom">
              Contactez-nous pour un plan personnalise
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </motion.div>
      </div>

      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Echanger une cle
            </DialogTitle>
            <DialogDescription>
              Entrez votre cle de licence pour activer votre abonnement.
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
              <Button variant="outline" size="sm" onClick={() => { setRedeemOpen(false); setRedeemKey(""); }}>Annuler</Button>
              <Button
                data-testid="button-confirm-redeem"
                size="sm"
                onClick={handleRedeem}
                disabled={redeemLoading || !redeemKey.trim()}
                className="gap-1.5"
              >
                {redeemLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Activer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
