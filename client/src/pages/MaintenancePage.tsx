import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Shield, Search, Moon, Sun, ArrowRight,
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion } from "framer-motion";

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
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
      <div className="absolute top-[-30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <header className="relative z-10 px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Di<span className="text-primary">screen</span>
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setDark(!dark)}
          data-testid="button-theme-toggle"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="max-w-lg w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-start"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-8">
              <Search className="w-7 h-7 text-primary" />
            </div>

            <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
              Lancement imminent
            </span>

            <h1 className="text-3xl sm:text-4xl font-bold leading-snug mb-4">
              Votre futur outil de recherche de donnees
            </h1>

            <p className="text-muted-foreground leading-relaxed mb-8 text-sm sm:text-base">
              Nous construisons un moteur de recherche capable d'explorer des
              milliards d'enregistrements en quelques secondes. Multi-criteres,
              rapide, securise.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={() => window.open("https://discord.gg/discreen", "_blank")}
                data-testid="button-discord-join"
              >
                <SiDiscord className="w-4 h-4 mr-2" />
                Rejoindre le Discord
              </Button>
              <Button
                variant="ghost"
                className="gap-1.5 text-muted-foreground"
                onClick={() => window.open("https://discord.gg/discreen", "_blank")}
                data-testid="button-learn-more"
              >
                En savoir plus
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-4">
        <p className="text-xs text-muted-foreground/50">
          Discreen {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
