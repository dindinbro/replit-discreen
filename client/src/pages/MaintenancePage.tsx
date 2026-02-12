import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Shield, Database, Search, Zap, Lock, Globe,
  Users, Clock, Wrench, ChevronRight,
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion } from "framer-motion";

function AnimatedCounter({ target, duration = 2000, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return <span>{count.toLocaleString("fr-FR")}{suffix}</span>;
}

const features = [
  {
    icon: Database,
    title: "Base de donnees massive",
    desc: "Des milliards d'enregistrements indexes et accessibles en quelques secondes.",
  },
  {
    icon: Search,
    title: "Recherche multi-criteres",
    desc: "Email, pseudo, telephone, IP, Discord ID et bien plus. Croisez vos recherches.",
  },
  {
    icon: Shield,
    title: "Securite maximale",
    desc: "Authentification 2FA, chiffrement, et controle d'acces strict par role.",
  },
  {
    icon: Zap,
    title: "Resultats instantanes",
    desc: "Moteur FTS5 optimise pour des reponses en millisecondes, meme sur de gros volumes.",
  },
  {
    icon: Lock,
    title: "Acces par abonnement",
    desc: "Differents plans adaptes a vos besoins, du gratuit au professionnel.",
  },
  {
    icon: Globe,
    title: "Sources multiples",
    desc: "Agregation de resultats depuis plusieurs bases et APIs externes.",
  },
];

const stats = [
  { value: 15, suffix: "B+", label: "Enregistrements" },
  { value: 500, suffix: "+", label: "Sources de donnees" },
  { value: 99, suffix: "%", label: "Disponibilite" },
];

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Discreen</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1.5">
              <Wrench className="w-3 h-3" />
              En developpement
            </Badge>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <Badge variant="secondary" className="gap-1.5 text-sm">
                <Clock className="w-3.5 h-3.5" />
                Bientot disponible
              </Badge>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Le moteur de recherche
              <br />
              <span className="text-primary">OSINT</span> nouvelle generation
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Discreen est actuellement en cours de developpement.
              Notre equipe travaille activement pour vous offrir l'outil
              de recherche de donnees le plus puissant et le plus complet du marche.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button
                size="lg"
                onClick={() => window.open("https://discord.gg/discreen", "_blank")}
                data-testid="button-discord-join"
              >
                <SiDiscord className="w-4 h-4 mr-2" />
                Rejoindre le Discord
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const el = document.getElementById("features");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                data-testid="button-discover"
              >
                Decouvrir
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        </section>

        <section className="max-w-4xl mx-auto px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-3 gap-4"
          >
            {stats.map((stat, i) => (
              <Card key={i} className="p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </motion.div>
        </section>

        <section id="features" className="max-w-5xl mx-auto px-4 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-center mb-10">
              Ce qui vous attend
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <Card key={i} className="p-5 hover-elevate">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="max-w-3xl mx-auto px-4 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="p-8 text-center">
              <Users className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-3">Restez informe</h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Rejoignez notre communaute Discord pour etre notifie du lancement,
                poser vos questions et obtenir un acces anticipe.
              </p>
              <Button
                onClick={() => window.open("https://discord.gg/discreen", "_blank")}
                data-testid="button-discord-join-bottom"
              >
                <SiDiscord className="w-4 h-4 mr-2" />
                Rejoindre la communaute
              </Button>
            </Card>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/50 py-6">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-2 flex-wrap text-sm text-muted-foreground">
          <span>Discreen - {new Date().getFullYear()}</span>
          <span>En cours de developpement</span>
        </div>
      </footer>
    </div>
  );
}
