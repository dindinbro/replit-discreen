import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, Search, Clock, Mail, User, Phone, Globe, Hash, Moon, Sun,
} from "lucide-react";
import { motion } from "framer-motion";

const categories = [
  { label: "Email", icon: Mail, active: true },
  { label: "Pseudo", icon: User, active: false },
  { label: "Telephone", icon: Phone, active: false },
  { label: "Domaine", icon: Globe, active: false },
  { label: "Adresse IP", icon: Hash, active: false },
];

export default function MaintenancePage() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground) / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <header className="relative z-10 border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight">
              Di<span className="text-primary">screen</span>
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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

      <main className="relative z-10 flex flex-col items-center justify-center px-4" style={{ minHeight: "calc(100vh - 7rem)" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl text-center"
        >
          <div className="flex justify-center mb-8">
            <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1">
              <Clock className="w-3.5 h-3.5" />
              Bientot disponible
            </Badge>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-4 tracking-tight">
            Le moteur de recherche{" "}
            <br className="hidden sm:block" />
            <span className="text-primary">OSINT</span> nouvelle generation
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto mb-10 leading-relaxed">
            Discreen est en cours de developpement. Notre equipe travaille pour
            vous offrir l'outil de recherche le plus complet du marche.
          </p>

          <div className="relative max-w-lg mx-auto mb-6">
            <div className="flex items-center border border-border rounded-md bg-card px-4 h-12">
              <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-3" />
              <span className="text-muted-foreground/60 text-sm select-none">
                Entrez un email...
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap mb-12">
            {categories.map((cat) => (
              <Badge
                key={cat.label}
                variant={cat.active ? "default" : "outline"}
                className="gap-1.5 cursor-default"
                data-testid={`badge-category-${cat.label.toLowerCase()}`}
              >
                <cat.icon className="w-3 h-3" />
                {cat.label}
              </Badge>
            ))}
          </div>

          <p className="text-xs text-muted-foreground/60 max-w-sm mx-auto leading-relaxed">
            Accedez a plus de 15 milliards de dossiers publics. En utilisant ce
            service, vous acceptez nos Conditions d'utilisation et Politique de
            confidentialite.
          </p>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-border/40 py-4">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-muted-foreground/50">
          Discreen - {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
