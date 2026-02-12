import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Search, Moon, Sun, Lock, Database, Zap,
  Mail, User, Phone, Globe, Hash, MapPin, Key, Calendar,
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
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
      <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />

      <header className="relative z-10 border-b border-border/30 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
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
              Acces restreint
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

      <main className="relative z-10 flex-1 flex flex-col items-center px-4 sm:px-6 pt-10 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl w-full"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-3 tracking-tight">
            Recherchez. Trouvez.{" "}
            <span className="text-primary">Instantanement.</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-lg mx-auto">
            Plus de 11 milliards de lignes indexees.
            Resultats en millisecondes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-2xl mb-4"
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
            <Badge
              key={c.label}
              variant="secondary"
              className="gap-1 text-xs cursor-default"
            >
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
            className="w-full max-w-2xl mb-8"
          >
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <p className="text-sm font-medium">
                <span className="text-primary font-bold">2 847</span>{" "}
                <span className="text-muted-foreground">resultats trouves en 0.12s</span>
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
                  <p className="text-sm font-semibold mb-1">Contenu verrouille</p>
                  <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                    Connectez-vous pour voir les resultats complets et acceder a toutes les fonctionnalites
                  </p>
                  <Button
                    onClick={() => window.open("https://discord.gg/discreen", "_blank")}
                    data-testid="button-discord-join"
                  >
                    <SiDiscord className="w-4 h-4 mr-2" />
                    Obtenir l'acces
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex items-center justify-center gap-6 sm:gap-10 mt-4 mb-8 flex-wrap"
        >
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-primary">
              <AnimatedNumber target={11} suffix="B+" />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Lignes indexees</div>
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
              <Zap className="w-5 h-5" />
              0.1s
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Temps moyen</div>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-border/30 py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground/50">
          <span>Discreen {new Date().getFullYear()}</span>
          <span>Plateforme en acces anticipe</span>
        </div>
      </footer>
    </div>
  );
}
