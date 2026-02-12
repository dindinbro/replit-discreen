import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Search, Moon, Sun, Lock, Database, Zap,
  Mail, User, Phone, Globe, Hash,
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
  { type: "Email", value: "j••••@g••••.com", source: "Collection #2 - 2024", fields: 6 },
  { type: "Pseudo", value: "D••k_R••der", source: "Forum DB - Mars 2024", fields: 4 },
  { type: "Tel", value: "06 •• •• •• 42", source: "Telecom Leak FR", fields: 3 },
  { type: "Email", value: "m••••@ou••••.fr", source: "Combolist FR #8", fields: 8 },
  { type: "IP", value: "92.••.••.137", source: "Log Dump 2024", fields: 5 },
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

  const [query, setQuery] = useState("");
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

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 pt-12 sm:pt-20">
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
            Plus de 15 milliards d'enregistrements indexes.
            Resultats en millisecondes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-xl mb-4"
        >
          <div className="relative">
            <div className="flex items-center border border-border rounded-lg bg-card px-4 h-12 shadow-sm">
              <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-3" />
              <span className="text-foreground text-sm flex-1 text-left">
                {typedText}
                <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 animate-pulse align-middle" />
              </span>
            </div>
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
            className="w-full max-w-xl mb-8"
          >
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <p className="text-sm font-medium">
                <span className="text-primary font-bold">2,847</span>{" "}
                <span className="text-muted-foreground">resultats trouves en 0.12s</span>
              </p>
              <Badge variant="outline" className="text-xs gap-1">
                <Database className="w-3 h-3" />
                12 sources
              </Badge>
            </div>

            <div className="space-y-2 relative">
              {fakeResults.map((r, i) => (
                <Card
                  key={i}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                  style={{ filter: i > 0 ? `blur(${Math.min(i * 1.5, 5)}px)` : "none" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {r.type}
                    </Badge>
                    <span className="text-sm font-medium truncate">{r.value}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{r.source}</span>
                </Card>
              ))}

              <div className="absolute inset-0 top-16 flex items-center justify-center pointer-events-none">
                <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg px-6 py-4 text-center pointer-events-auto">
                  <Lock className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-sm font-semibold mb-1">Contenu verrouille</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Connectez-vous pour voir les resultats complets
                  </p>
                  <Button
                    size="sm"
                    onClick={() => window.open("https://discord.gg/discreen", "_blank")}
                    data-testid="button-discord-join"
                  >
                    <SiDiscord className="w-3.5 h-3.5 mr-1.5" />
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
              <AnimatedNumber target={15} suffix="B+" />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Enregistrements</div>
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
