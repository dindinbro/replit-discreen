import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Search, Moon, Sun, Lock, Database, Zap,
  Mail, User, Phone, Globe, Hash, MapPin, Key, Calendar,
  Crown, Rocket, Code, Check, X, Gamepad2, Fingerprint,
  Cpu, FileSearch, UserSearch, AlertTriangle, Infinity,
  Clock, ChevronRight,
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";

/* ── helpers ── */
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const t0 = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - t0) / 1800, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(run);
      else setCount(target);
    };
    requestAnimationFrame(run);
  }, [target]);
  return <>{count.toLocaleString("fr-FR")}{suffix}</>;
}

/* ── search category tabs data ── */
type SearchMode = "internal" | "phone" | "geoip" | "nir" | "sherlock" | "fivem" | "xeuledoc" | "wanted";

interface CategoryTab {
  id: SearchMode;
  label: string;
  icon: React.ElementType;
  tier: "FREE" | "VIP" | "PRO";
  placeholder: string;
  color: string;
  fakeResults: Array<{ label: string; value: string; icon: React.ElementType }>;
}

const CATEGORIES: CategoryTab[] = [
  {
    id: "internal",
    label: "Paramétrique",
    icon: Database,
    tier: "FREE",
    placeholder: "jean.dupont@gmail.com",
    color: "from-primary to-emerald-400",
    fakeResults: [
      { label: "Email", value: "j••••.d••••@gmail.com", icon: Mail },
      { label: "Pseudo", value: "jd••••42", icon: User },
      { label: "Téléphone", value: "06 •• •• •• 78", icon: Phone },
      { label: "Mot de passe", value: "••••••••••", icon: Key },
      { label: "Ville", value: "P••••s", icon: MapPin },
      { label: "Date", value: "2024-••-••", icon: Calendar },
    ],
  },
  {
    id: "phone",
    label: "Téléphone",
    icon: Phone,
    tier: "FREE",
    placeholder: "0612345678",
    color: "from-sky-400 to-blue-500",
    fakeResults: [
      { label: "Numéro", value: "06 •• •• •• 78", icon: Phone },
      { label: "Opérateur", value: "Bou••••s", icon: Globe },
      { label: "Prénom", value: "J••n", icon: User },
      { label: "Nom", value: "D••••t", icon: User },
      { label: "Ville", value: "L••n", icon: MapPin },
    ],
  },
  {
    id: "geoip",
    label: "GeoIP",
    icon: Globe,
    tier: "FREE",
    placeholder: "92.184.xx.xx",
    color: "from-teal-400 to-cyan-500",
    fakeResults: [
      { label: "Adresse IP", value: "92.••.••.137", icon: Hash },
      { label: "FAI", value: "Or••••", icon: Globe },
      { label: "ASN", value: "AS••••", icon: Cpu },
      { label: "Ville", value: "P••••s", icon: MapPin },
      { label: "Pays", value: "FR 🇫🇷", icon: Globe },
    ],
  },
  {
    id: "nir",
    label: "NIR / INSEE",
    icon: Fingerprint,
    tier: "FREE",
    placeholder: "1 91 06 75 XXX XXX XX",
    color: "from-violet-400 to-purple-500",
    fakeResults: [
      { label: "Sexe", value: "Homme", icon: User },
      { label: "Né en", value: "19••", icon: Calendar },
      { label: "Département", value: "75 — Pa••••", icon: MapPin },
      { label: "Commune", value: "P••••s 1er", icon: MapPin },
    ],
  },
  {
    id: "sherlock",
    label: "Username OSINT",
    icon: UserSearch,
    tier: "VIP",
    placeholder: "dark_rider42",
    color: "from-purple-500 to-violet-400",
    fakeResults: [
      { label: "Twitter", value: "Trouvé ✓", icon: Globe },
      { label: "Instagram", value: "Trouvé ✓", icon: Globe },
      { label: "Reddit", value: "Trouvé ✓", icon: Globe },
      { label: "Steam", value: "Trouvé ✓", icon: Globe },
      { label: "GitHub", value: "Non trouvé ✗", icon: Globe },
    ],
  },
  {
    id: "fivem",
    label: "Gaming",
    icon: Gamepad2,
    tier: "VIP",
    placeholder: "Steam / FiveM / Discord ID…",
    color: "from-orange-500 to-amber-400",
    fakeResults: [
      { label: "Steam ID", value: "765••••••••••••", icon: Globe },
      { label: "Pseudo FiveM", value: "D••k_R••der", icon: User },
      { label: "Licence", value: "steam:••••••••••", icon: Key },
      { label: "Discord", value: "••••••••••••", icon: Hash },
    ],
  },
  {
    id: "xeuledoc",
    label: "Google OSINT",
    icon: FileSearch,
    tier: "PRO",
    placeholder: "jean.dupont@gmail.com",
    color: "from-blue-500 to-cyan-400",
    fakeResults: [
      { label: "Google Doc", value: "bit.ly/••••••", icon: Globe },
      { label: "Drive", value: "docs.google.com/••••", icon: Globe },
      { label: "Résultat", value: "14 fichiers exposés", icon: Database },
    ],
  },
  {
    id: "wanted",
    label: "Wanted",
    icon: AlertTriangle,
    tier: "PRO",
    placeholder: "Prénom Nom ou ID…",
    color: "from-red-500 to-orange-400",
    fakeResults: [
      { label: "Nom", value: "D••••t J••n", icon: User },
      { label: "Statut", value: "Recherché ⚠️", icon: AlertTriangle },
      { label: "Motif", value: "••••••••••", icon: Key },
      { label: "Département", value: "75", icon: MapPin },
    ],
  },
];

const TIER_BADGE: Record<string, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  FREE: { label: "FREE", variant: "secondary" },
  VIP: { label: "VIP", variant: "outline" },
  PRO: { label: "PRO", variant: "destructive" },
};

/* ── pricing data ── */
const PLANS = [
  {
    id: "free",
    name: "Free",
    subtitle: "Pour commencer",
    icon: Zap,
    price: 0,
    lifetimePrice: 0,
    popular: false,
    features: [
      { text: "2 recherches / jour", ok: true },
      { text: "Bases limitées", ok: true },
      { text: "Recherche basique", ok: true },
      { text: "OSINT avancé", ok: false },
      { text: "Wanted", ok: false },
      { text: "API", ok: false },
    ],
  },
  {
    id: "vip",
    name: "VIP",
    subtitle: "Pour les réguliers",
    icon: Crown,
    price: 6.99,
    lifetimePrice: 69.99,
    popular: false,
    features: [
      { text: "50 recherches / jour", ok: true },
      { text: "Gaming, Email / IP", ok: true },
      { text: "Recherches Discord / Externes", ok: true },
      { text: "Toutes les bases", ok: true },
      { text: "Google OSINT", ok: false },
      { text: "Wanted", ok: false },
    ],
  },
  {
    id: "pro",
    name: "PRO",
    subtitle: "Puissance maximale",
    icon: Rocket,
    price: 14.99,
    lifetimePrice: 124.99,
    popular: true,
    features: [
      { text: "200 recherches / jour", ok: true },
      { text: "Toutes les bases", ok: true },
      { text: "Google OSINT illimité", ok: true },
      { text: "Username OSINT", ok: true },
      { text: "Wanted", ok: true },
      { text: "Parrainage", ok: true },
    ],
  },
  {
    id: "api",
    name: "API",
    subtitle: "Recherches illimitées",
    icon: Code,
    price: 49.99,
    lifetimePrice: 399.99,
    popular: false,
    features: [
      { text: "Recherches illimitées", ok: true },
      { text: "Clé API dédiée", ok: true },
      { text: "Toutes fonctionnalités PRO", ok: true },
      { text: "Endpoint /api/v1/search", ok: true },
      { text: "Possibilité de revente", ok: true },
      { text: "Support premium 24/7", ok: true },
    ],
  },
];

export default function MaintenancePage() {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : true
  );
  const [activeCategory, setActiveCategory] = useState<SearchMode>("internal");
  const [pricingMode, setPricingMode] = useState<"monthly" | "lifetime">("monthly");
  const [tiltStyles, setTiltStyles] = useState<Record<string, { rotateX: number; rotateY: number; scale: number }>>({});
  const [typedText, setTypedText] = useState("");
  const [showResults, setShowResults] = useState(false);

  const currentCat = CATEGORIES.find((c) => c.id === activeCategory)!;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  /* typing animation for hero */
  useEffect(() => {
    setTypedText("");
    setShowResults(false);
    let i = 0;
    const q = currentCat.placeholder;
    const iv = setInterval(() => {
      if (i <= q.length) { setTypedText(q.slice(0, i)); i++; }
      else { clearInterval(iv); setTimeout(() => setShowResults(true), 300); }
    }, 55);
    return () => clearInterval(iv);
  }, [activeCategory]);

  /* 3-D tilt for pricing cards */
  function handleTiltMove(id: string, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setTiltStyles((prev) => ({
      ...prev,
      [id]: { rotateX: ((y - cy) / cy) * -6, rotateY: ((x - cx) / cx) * 6, scale: 1.02 },
    }));
  }
  function handleTiltLeave(id: string) {
    setTiltStyles((prev) => ({ ...prev, [id]: { rotateX: 0, rotateY: 0, scale: 1 } }));
  }

  const isLifetime = pricingMode === "lifetime";

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden flex flex-col">
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />

      {/* ── Header ── */}
      <header className="relative z-10 border-b border-border/30 px-6 py-3 sticky top-0 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="Discreen" className="w-8 h-8 rounded-lg object-contain shrink-0" />
            <span className="text-lg font-bold tracking-tight">Di<span className="text-primary">screen</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs gap-1"><Lock className="w-3 h-3" />Accès restreint</Badge>
            <Button size="icon" variant="ghost" onClick={() => setDark(!dark)} data-testid="button-theme-toggle">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center px-4 sm:px-6">

        {/* ── Hero ── */}
        <section className="w-full max-w-3xl pt-12 sm:pt-16 pb-4 flex flex-col items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center w-full mb-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-3 tracking-tight">
              Recherchez. Trouvez.{" "}
              <motion.span
                key={activeCategory}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-transparent bg-clip-text bg-gradient-to-r ${currentCat.color}`}
              >
                Instantanément.
              </motion.span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
              Plus de 11 milliards de lignes indexées. Résultats en millisecondes.
            </p>
          </motion.div>

          {/* Category tabs */}
          <div className="w-full mb-5 overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex items-center gap-2 min-w-max mx-auto justify-center flex-wrap">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = cat.id === activeCategory;
                const badge = TIER_BADGE[cat.tier];
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    data-testid={`tab-category-${cat.id}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {cat.label}
                    {cat.tier !== "FREE" && (
                      <Badge variant={badge.variant} className="text-[9px] px-1 py-0 h-4 ml-0.5">{badge.label}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search bar */}
          <div className="w-full mb-5">
            <div className="flex items-center border border-border rounded-lg bg-card px-4 h-12 shadow-sm">
              <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-3" />
              <span className="text-foreground text-sm flex-1 text-left">
                {typedText}
                <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 animate-pulse align-middle" />
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {showResults && (
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full mb-6"
              >
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <p className="text-sm font-medium">
                    <span className="text-primary font-bold">
                      {activeCategory === "sherlock" ? "487" : activeCategory === "geoip" ? "1" : "2 847"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {activeCategory === "sherlock" ? "plateformes analysées en 3.2s" : activeCategory === "geoip" ? "résultat trouvé en 0.04s" : "résultats trouvés en 0.12s"}
                    </span>
                  </p>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Database className="w-3 h-3" />
                    {activeCategory === "sherlock" ? "500+ sites" : activeCategory === "geoip" ? "IP Registry" : "12 sources"}
                  </Badge>
                </div>

                <div className="space-y-3 relative">
                  {/* First result (visible) */}
                  <Card className="overflow-visible">
                    <div className="flex items-center gap-3 p-4 pb-3 border-b border-border/50">
                      <span className="flex items-center justify-center w-8 h-8 rounded-md bg-secondary text-sm font-bold text-muted-foreground shrink-0">1</span>
                      <div>
                        <p className="font-semibold text-sm">{currentCat.placeholder}</p>
                        <p className="text-xs text-muted-foreground">Discreen</p>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                      {currentCat.fakeResults.map((f, fi) => {
                        const Icon = f.icon;
                        return (
                          <div key={fi} className="flex items-start gap-2.5">
                            <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-primary/10">
                              <Icon className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground">{f.label}</p>
                              <p className="text-xs font-medium break-all leading-tight">{f.value}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Blurred second result */}
                  <Card style={{ filter: "blur(4px)" }}>
                    <div className="flex items-center gap-3 p-4 pb-3 border-b border-border/50">
                      <span className="flex items-center justify-center w-8 h-8 rounded-md bg-secondary text-sm font-bold text-muted-foreground shrink-0">2</span>
                      <div>
                        <p className="font-semibold text-sm">••••••••••••••</p>
                        <p className="text-xs text-muted-foreground">Discreen</p>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                      {currentCat.fakeResults.slice(0, 4).map((f, fi) => (
                        <div key={fi} className="flex items-start gap-2.5">
                          <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-primary/10" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground">••••••</p>
                            <p className="text-xs font-medium">••••••••••</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Lock overlay */}
                  <div className="absolute inset-0 top-24 flex items-center justify-center pointer-events-none">
                    <div className="bg-background/85 backdrop-blur-sm border border-border rounded-xl px-6 py-5 text-center pointer-events-auto shadow-lg">
                      <Lock className="w-6 h-6 text-primary mx-auto mb-2" />
                      <p className="text-sm font-semibold mb-1">Contenu verrouillé</p>
                      <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                        Connectez-vous pour voir les résultats complets
                      </p>
                      <Button size="sm" onClick={() => window.open("https://discord.gg/discreen", "_blank")} data-testid="button-discord-join">
                        <SiDiscord className="w-4 h-4 mr-2" />Obtenir l'accès
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 mt-2 mb-4 flex-wrap">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary"><AnimatedNumber target={11} suffix="B+" /></div>
              <div className="text-xs text-muted-foreground mt-0.5">Lignes indexées</div>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="text-center">
              <div className="text-2xl font-bold text-primary"><AnimatedNumber target={500} suffix="+" /></div>
              <div className="text-xs text-muted-foreground mt-0.5">Sources</div>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center text-2xl font-bold text-primary"><Zap className="w-4 h-4" />0.1s</div>
              <div className="text-xs text-muted-foreground mt-0.5">Temps moyen</div>
            </div>
          </div>
        </section>

        <div className="w-full max-w-6xl border-t border-border/30 my-10" />

        {/* ── Pricing ── */}
        <section className="w-full max-w-6xl mb-16">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Nos <span className="text-primary">offres</span></h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-6">
              Du plan gratuit à l'accès illimité — paiement mensuel ou unique à vie
            </p>

            {/* Pricing toggle */}
            <div className="flex justify-center">
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
                    <Infinity className="w-4 h-4" />
                    <div>
                      <p className="text-sm font-bold">Lifetime</p>
                      <p className="text-[10px] opacity-80">Paiement unique</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={pricingMode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className={`grid grid-cols-1 sm:grid-cols-2 ${isLifetime ? "lg:grid-cols-3 max-w-4xl mx-auto" : "lg:grid-cols-4"} gap-4`}
            >
              {PLANS.filter((p) => !(isLifetime && p.price === 0)).map((plan, i) => {
                const Icon = plan.icon;
                const tilt = tiltStyles[plan.id] || { rotateX: 0, rotateY: 0, scale: 1 };
                const isTilted = tilt.scale > 1;
                const yearlyIfMonthly = plan.price * 12;
                const savedPerYear = yearlyIfMonthly - plan.lifetimePrice;
                const discountPct = plan.price > 0 ? Math.round((1 - plan.lifetimePrice / yearlyIfMonthly) * 100) : 0;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.07 }}
                    style={{ perspective: "800px" }}
                    onMouseMove={(e) => handleTiltMove(plan.id, e)}
                    onMouseLeave={() => handleTiltLeave(plan.id)}
                    className="relative"
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                        <Badge className={`text-[10px] px-3 ${isLifetime ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" : ""}`}>
                          {isLifetime ? "✨ Lifetime" : "⭐ Populaire"}
                        </Badge>
                      </div>
                    )}
                    <Card
                      className={`relative flex flex-col p-5 h-full overflow-visible transition-all duration-200 ${
                        plan.popular && isLifetime
                          ? "border-amber-500/50 shadow-[0_0_24px_-6px] shadow-amber-500/20"
                          : plan.popular
                          ? "border-primary/50 shadow-[0_0_24px_-6px] shadow-primary/15"
                          : ""
                      } ${isTilted && isLifetime ? "shadow-xl shadow-amber-500/20 border-amber-500/40" : isTilted ? "shadow-xl shadow-primary/25 border-primary/40" : ""}`}
                      style={{
                        transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(${tilt.scale},${tilt.scale},${tilt.scale})`,
                        transition: "transform 0.15s ease-out",
                        transformStyle: "preserve-3d",
                        willChange: "transform",
                      }}
                      data-testid={`card-plan-${plan.id}`}
                    >
                      {/* Plan header */}
                      <div className="space-y-3 mb-5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-300 ${isLifetime && plan.price > 0 ? "bg-amber-500/10" : "bg-primary/10"}`}>
                          <Icon className={`w-4.5 h-4.5 transition-colors duration-300 ${isLifetime && plan.price > 0 ? "text-amber-500" : "text-primary"}`} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold">{plan.name}</h3>
                          <p className="text-xs text-muted-foreground">{plan.subtitle}</p>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className={`text-2xl font-bold transition-colors duration-300 ${isLifetime && plan.price > 0 ? "text-amber-500" : "text-primary"}`}>
                            {plan.price === 0 ? "Gratuit" : isLifetime ? `€${plan.lifetimePrice.toFixed(2)}` : `€${plan.price.toFixed(2)}`}
                          </span>
                          {plan.price > 0 && (
                            <span className="text-xs text-muted-foreground">{isLifetime ? "unique" : "/mois"}</span>
                          )}
                        </div>

                        {/* Lifetime savings */}
                        {isLifetime && plan.price > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground line-through">€{plan.price.toFixed(2)}/mois</span>
                              <span className="text-xs font-bold text-amber-500">-{discountPct}%</span>
                            </div>
                            <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] px-2 py-0.5">
                              Économisez €{savedPerYear.toFixed(2)}/an
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 flex-1 mb-5">
                        {plan.features.map((f, fi) => (
                          <li key={fi} className={`flex items-start gap-2 text-xs ${f.ok ? "" : "text-muted-foreground/50"}`}>
                            {f.ok
                              ? <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                              : <X className="w-3.5 h-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                            }
                            <span className={f.ok ? "" : "line-through"}>{f.text}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        variant={plan.popular ? "default" : "outline"}
                        size="sm"
                        className={`w-full gap-2 ${isLifetime && plan.price > 0 && plan.popular ? "bg-gradient-to-r from-amber-500 to-orange-500 border-0 hover:opacity-90 text-white" : ""}`}
                        onClick={() => window.open("https://discord.gg/discreen", "_blank")}
                        data-testid={`button-plan-${plan.id}`}
                      >
                        <SiDiscord className="w-3.5 h-3.5" />
                        {plan.price === 0 ? "Commencer" : "S'abonner"}
                      </Button>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* ── Discord CTA ── */}
        <section className="w-full max-w-6xl mb-16">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <Card className="p-8 text-center border-primary/20 bg-primary/[0.03] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#5865F2]/15 flex items-center justify-center">
                  <SiDiscord className="w-7 h-7 text-[#5865F2]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Rejoignez la communauté</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Obtenez votre accès, suivez les mises à jour, et échangez avec la communauté Discreen sur Discord
                  </p>
                </div>
                <Button
                  size="lg"
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white gap-2"
                  onClick={() => window.open("https://discord.gg/discreen", "_blank")}
                  data-testid="button-discord-cta"
                >
                  <SiDiscord className="w-5 h-5" />Rejoindre Discord
                </Button>
              </div>
            </Card>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/30 py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground/50">
          <span>Discreen {new Date().getFullYear()}</span>
          <span>Plateforme en accès anticipé</span>
        </div>
      </footer>
    </div>
  );
}
