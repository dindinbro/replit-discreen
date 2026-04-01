import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Search, Moon, Sun, Lock, Database, Zap,
  Mail, User, Phone, Globe, Hash, MapPin, Key, Calendar,
  Crown, Rocket, Code, Check, X, Gamepad2, Fingerprint,
  Cpu, FileSearch, UserSearch, AlertTriangle, Infinity,
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion } from "framer-motion";

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - start) / 1800, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(run);
      else setCount(target);
    };
    requestAnimationFrame(run);
  }, [target]);
  return <>{count.toLocaleString("fr-FR")}{suffix}</>;
}

const fakeResults = [
  {
    title: "j••••.d••••@gmail.com",
    source: "Discreen",
    fields: [
      { icon: Mail, label: "Email", value: "j••••.d••••@gmail.com", color: "--primary" },
      { icon: User, label: "Pseudo", value: "jd••••42", color: "--chart-2" },
      { icon: Phone, label: "Telephone", value: "06 •• •• •• 78", color: "--chart-3" },
      { icon: Key, label: "Mot de passe", value: "••••••••••", color: "--chart-4" },
      { icon: MapPin, label: "Ville", value: "P••••s", color: "--chart-5" },
      { icon: Calendar, label: "Date", value: "2024-••-••", color: "--chart-1" },
    ],
  },
  {
    title: "je••.du••••@outlook.fr",
    source: "Discreen",
    fields: [
      { icon: Mail, label: "Email", value: "je••.du••••@outlook.fr", color: "--primary" },
      { icon: User, label: "Nom", value: "D••••t", color: "--chart-2" },
      { icon: Globe, label: "IP", value: "92.••.••.137", color: "--chart-3" },
      { icon: Key, label: "Mot de passe", value: "••••••••", color: "--chart-4" },
    ],
  },
  {
    title: "jdup••••@yahoo.com",
    source: "Discreen",
    fields: [
      { icon: Mail, label: "Email", value: "jdup••••@yahoo.com", color: "--primary" },
      { icon: User, label: "Pseudo", value: "D••k_R••der", color: "--chart-2" },
      { icon: Phone, label: "Telephone", value: "07 •• •• •• 15", color: "--chart-3" },
    ],
  },
];

const criteria = [
  { icon: Mail, label: "Email" },
  { icon: User, label: "Pseudo" },
  { icon: Phone, label: "Telephone" },
  { icon: Globe, label: "Domaine" },
  { icon: Hash, label: "Adresse IP" },
];

const SEARCH_CATEGORIES = [
  {
    icon: Database,
    label: "Paramétrique",
    desc: "Recherche multi-champs dans toutes nos bases de données indexées",
    badge: "FREE",
    badgeColor: "secondary",
  },
  {
    icon: Phone,
    label: "Téléphone",
    desc: "Identification d'un numéro — opérateur, localisation, identité liée",
    badge: "FREE",
    badgeColor: "secondary",
  },
  {
    icon: Globe,
    label: "GeoIP",
    desc: "Géolocalisation précise d'une adresse IP, FAI, ASN, coordonnées",
    badge: "FREE",
    badgeColor: "secondary",
  },
  {
    icon: Fingerprint,
    label: "NIR / INSEE",
    desc: "Recherche par numéro de sécurité sociale — département, âge, sexe",
    badge: "FREE",
    badgeColor: "secondary",
  },
  {
    icon: UserSearch,
    label: "Username OSINT",
    desc: "Recherche d'un pseudonyme sur plus de 500 plateformes simultanément",
    badge: "VIP",
    badgeColor: "outline",
  },
  {
    icon: Gamepad2,
    label: "Gaming",
    desc: "Recherche FiveM, Steam, Discord, Minecraft et autres plateformes gaming",
    badge: "VIP",
    badgeColor: "outline",
  },
  {
    icon: FileSearch,
    label: "Google OSINT",
    desc: "Dorks Google avancés pour retrouver des informations publiques exposées",
    badge: "PRO",
    badgeColor: "destructive",
  },
  {
    icon: AlertTriangle,
    label: "Wanted",
    desc: "Moteur de recherche dans les bases de données judiciaires et signalements",
    badge: "PRO",
    badgeColor: "destructive",
  },
  {
    icon: Cpu,
    label: "API",
    desc: "Accès programmatique à toutes les sources — intégration dans vos outils",
    badge: "API",
    badgeColor: "default",
  },
];

const PLANS = [
  {
    id: "free",
    name: "Free",
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
    ],
  },
  {
    id: "vip",
    name: "VIP",
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
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  const [showResults, setShowResults] = useState(false);
  const [typedText, setTypedText] = useState("");
  const demoQuery = "jean.dupont@gmail.com";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= demoQuery.length) {
        setTypedText(demoQuery.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowResults(true), 400);
      }
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden flex flex-col">
      <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[700px] h-[700px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 px-6 py-3 sticky top-0 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Di<span className="text-primary">screen</span>
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="text-xs gap-1">
              <Lock className="w-3 h-3" />
              Accès restreint
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDark(!dark)}
              data-testid="button-theme-toggle"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center px-4 sm:px-6">

        {/* Hero + Search demo */}
        <section className="w-full max-w-2xl pt-10 sm:pt-16 pb-10 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center w-full"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-3 tracking-tight">
              Recherchez. Trouvez.{" "}
              <span className="text-primary">Instantanément.</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-lg mx-auto">
              Plus de 11 milliards de lignes indexées. Résultats en millisecondes.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="w-full mb-4"
          >
            <div className="flex items-center border border-border rounded-lg bg-card px-4 h-12 shadow-sm">
              <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-3" />
              <span className="text-foreground text-sm flex-1 text-left">
                {typedText}
                <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 animate-pulse align-middle" />
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex items-center justify-center gap-2 flex-wrap mb-8"
          >
            {criteria.map((c) => (
              <Badge key={c.label} variant="secondary" className="gap-1 text-xs cursor-default">
                <c.icon className="w-3 h-3" />
                {c.label}
              </Badge>
            ))}
          </motion.div>

          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <p className="text-sm font-medium">
                  <span className="text-primary font-bold">2 847</span>{" "}
                  <span className="text-muted-foreground">résultats trouvés en 0.12s</span>
                </p>
                <Badge variant="outline" className="text-xs gap-1">
                  <Database className="w-3 h-3" />
                  12 sources
                </Badge>
              </div>

              <div className="space-y-3 relative">
                {fakeResults.map((result, i) => (
                  <Card
                    key={i}
                    className="overflow-visible"
                    style={{ filter: i > 0 ? `blur(${Math.min(i * 2.5, 6)}px)` : "none" }}
                  >
                    <div className="flex items-center justify-between gap-4 p-4 pb-3 border-b border-border/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-secondary text-sm font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate text-sm">{result.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{result.source}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                      {result.fields.map((field, fi) => {
                        const Icon = field.icon;
                        return (
                          <div key={fi} className="flex items-start gap-3">
                            <div
                              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                              style={{
                                color: `hsl(var(${field.color}))`,
                                backgroundColor: `hsl(var(${field.color}) / 0.12)`,
                              }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">{field.label}</p>
                              <p className="text-sm font-medium text-foreground break-all leading-tight">{field.value}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}

                <div className="absolute inset-0 top-20 flex items-center justify-center pointer-events-none">
                  <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg px-6 py-5 text-center pointer-events-auto shadow-lg">
                    <Lock className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-sm font-semibold mb-1">Contenu verrouillé</p>
                    <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                      Connectez-vous pour voir les résultats complets et accéder à toutes les fonctionnalités
                    </p>
                    <Button
                      onClick={() => window.open("https://discord.gg/discreen", "_blank")}
                      data-testid="button-discord-join"
                    >
                      <SiDiscord className="w-4 h-4 mr-2" />
                      Obtenir l'accès
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex items-center justify-center gap-6 sm:gap-10 mt-10 mb-2 flex-wrap"
          >
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                <AnimatedNumber target={11} suffix="B+" />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Lignes indexées</div>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                <AnimatedNumber target={500} suffix="+" />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Sources</div>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center text-2xl sm:text-3xl font-bold text-primary">
                <Zap className="w-5 h-5" />0.1s
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Temps moyen</div>
            </div>
          </motion.div>
        </section>

        {/* Divider */}
        <div className="w-full max-w-6xl border-t border-border/30 mb-12" />

        {/* Search Categories */}
        <section className="w-full max-w-6xl mb-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Modules de <span className="text-primary">recherche</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              9 moteurs spécialisés pour couvrir tous les cas d'usage OSINT
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEARCH_CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              const badgeVariant =
                cat.badgeColor === "destructive" ? "destructive"
                : cat.badgeColor === "default" ? "default"
                : cat.badgeColor === "outline" ? "outline"
                : "secondary";
              return (
                <motion.div
                  key={cat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <Card className="p-4 h-full flex flex-col gap-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold text-sm">{cat.label}</span>
                      </div>
                      <Badge variant={badgeVariant} className="text-[10px] shrink-0">
                        {cat.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{cat.desc}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Divider */}
        <div className="w-full max-w-6xl border-t border-border/30 mb-12" />

        {/* Pricing */}
        <section className="w-full max-w-6xl mb-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Nos <span className="text-primary">offres</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Du plan gratuit à l'accès illimité — choisissez selon vos besoins
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan, i) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="relative"
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                      <Badge className="text-[10px] px-3">⭐ Populaire</Badge>
                    </div>
                  )}
                  <Card
                    className={`p-5 h-full flex flex-col gap-4 ${plan.popular ? "border-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.12)]" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${plan.popular ? "bg-primary text-primary-foreground" : "bg-primary/10"}`}>
                        <Icon className={`w-4 h-4 ${plan.popular ? "text-primary-foreground" : "text-primary"}`} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{plan.name}</p>
                        <div className="flex items-baseline gap-1">
                          {plan.price === 0 ? (
                            <span className="text-lg font-extrabold text-primary">Gratuit</span>
                          ) : (
                            <>
                              <span className="text-lg font-extrabold text-primary">{plan.price}€</span>
                              <span className="text-xs text-muted-foreground">/mois</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {plan.lifetimePrice > 0 && (
                      <div className="flex items-center gap-1.5 bg-primary/8 rounded-md px-3 py-1.5">
                        <Infinity className="w-3 h-3 text-primary shrink-0" />
                        <span className="text-xs text-primary font-medium">Lifetime : {plan.lifetimePrice}€</span>
                      </div>
                    )}

                    <ul className="flex flex-col gap-2 flex-1">
                      {plan.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2">
                          {f.ok ? (
                            <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                          )}
                          <span className={`text-xs leading-relaxed ${f.ok ? "text-foreground" : "text-muted-foreground/60"}`}>
                            {f.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={plan.popular ? "default" : "outline"}
                      size="sm"
                      className="w-full mt-auto"
                      onClick={() => window.open("https://discord.gg/discreen", "_blank")}
                    >
                      <SiDiscord className="w-3.5 h-3.5 mr-2" />
                      {plan.price === 0 ? "Commencer" : "S'abonner"}
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Discord CTA */}
        <section className="w-full max-w-6xl mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
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
                  <SiDiscord className="w-5 h-5" />
                  Rejoindre Discord
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
