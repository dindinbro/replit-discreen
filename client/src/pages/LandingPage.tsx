import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Database, Shield, Zap, ArrowRight, Lock, Code2, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import HudRings from "@/components/HudRings";
import { DiscreenMark } from "@/components/Layout";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const startTime = performance.now();
    const duration = 2000;
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
      else setCount(target);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);
  return <>{count.toLocaleString("fr-FR")}{suffix}</>;
}

const FEATURES = [
  {
    icon: Search,
    title: "Recherche instantanée",
    desc: "Un moteur d'indexation pensé pour renvoyer des résultats pertinents en quelques millisecondes.",
  },
  {
    icon: Database,
    title: "Sources vérifiées",
    desc: "Chaque source est croisée et validée avant d'être indexée, pour limiter le bruit et les faux positifs.",
  },
  {
    icon: Shield,
    title: "Confidentialité par conception",
    desc: "Accès cloisonnés, chiffrement des données sensibles et journalisation de chaque consultation.",
  },
  {
    icon: Code2,
    title: "API sécurisée",
    desc: "Intégrez Discreen à vos propres outils via une API REST authentifiée et limitée en débit.",
  },
];

export default function LandingPage() {
  const [searchValue, setSearchValue] = useState("");
  const [showAuthHint, setShowAuthHint] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const handleSearch = () => {
    if (!user) { setShowAuthHint(true); return; }
    navigate("/search");
  };

  return (
    <main className="relative min-h-screen">
      {/* ── Hero ──
       * Mise en page asymetrique (texte a gauche, HUD radar a droite) plutot
       * que le bloc entierement centre + halo de fond que la plupart des
       * pages OSINT concurrentes reprennent — la silhouette de la page doit
       * se reconnaitre avant meme de lire le texte. ── */}
      <section className="relative min-h-[calc(100svh-56px)] px-4 py-16 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[500px] rounded-full bg-primary/8 blur-[120px] animate-pricing-orb-a" />
          <div className="absolute bottom-0 left-0 w-[420px] h-[380px] rounded-full bg-indigo-500/[0.06] blur-[100px] animate-pricing-orb-b" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-6 items-center min-h-[calc(100svh-56px-10rem)]">
          <div className="space-y-6 text-center lg:text-left">
            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="signature-phrase text-[10px] md:text-xs tracking-[0.28em]"
            >
              Recherche de données nouvelle génération
            </motion.p>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.08] text-foreground"
            >
              La recherche de données,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-primary/80">
                sans compromis.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Discreen centralise, vérifie et sécurise l'accès à des sources de données
              pour vous donner des réponses fiables, en toute discrétion.
            </motion.p>

            {/* Search bar / CTA */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="max-w-lg mx-auto lg:mx-0 w-full space-y-3"
            >
              {user ? (
                <div className="flex items-center gap-3 justify-center lg:justify-start flex-wrap">
                  <Link href="/search">
                    <Button size="lg" className="gap-2 px-8 btn-indigo-glow shadow-lg shadow-primary/20 animate-wanted-cta">
                      <Search className="w-4 h-4" />
                      Commencer la recherche
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                    <Input
                      placeholder="Rechercher un email, un domaine, un identifiant…"
                      value={searchValue}
                      onChange={(e) => { setSearchValue(e.target.value); setShowAuthHint(false); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="h-12 pl-11 pr-14 text-base rounded-xl border-border/60 bg-card/60 dark:bg-secondary/30 backdrop-blur-sm focus-visible:border-primary/60"
                    />
                    <button
                      onClick={handleSearch}
                      className="absolute right-2 w-9 h-9 rounded-lg bg-primary hover:bg-primary/90 transition-all flex items-center justify-center text-white shadow-lg shadow-primary/30 animate-wanted-cta"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  {showAuthHint ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 justify-center lg:justify-start text-sm text-muted-foreground"
                    >
                      <Lock className="w-3.5 h-3.5 text-primary" />
                      <span>
                        <button
                          onClick={() => navigate("/login")}
                          className="text-primary hover:underline font-medium"
                        >
                          Connectez-vous
                        </button>
                        {" "}pour accéder à la recherche.
                      </span>
                    </motion.div>
                  ) : (
                    <p className="text-xs text-muted-foreground/60">
                      Recherchez dès maintenant sur l'ensemble des sources connectées.
                    </p>
                  )}
                </>
              )}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.42 }}
              className="flex items-center justify-center lg:justify-start gap-6 text-xs text-muted-foreground/60 flex-wrap"
            >
              <span>
                <span className="text-primary font-semibold text-sm">
                  <AnimatedCounter target={1247} />
                </span>{" "}utilisateurs actifs
              </span>
              <span className="opacity-30">·</span>
              <span>
                <span className="text-primary font-semibold text-sm">
                  <AnimatedCounter target={18} suffix=".7+ To" />
                </span>{" "}de données indexées
              </span>
              <span className="opacity-30">·</span>
              <span>
                <span className="text-primary font-semibold text-sm">
                  <AnimatedCounter target={99} suffix="%" />
                </span>{" "}disponibilité
              </span>
            </motion.div>
          </div>

          {/* Radar HUD — signature visuelle propre a Discreen (meme reticle
           * que le logo), affichee en grand plutot qu'en simple fond flou. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative hidden lg:block h-[560px]"
          >
            <HudRings />
          </motion.div>
        </div>

        {/* ── Feature cards ── */}
        <div className="relative z-10 w-full max-w-5xl mx-auto mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.52 + i * 0.08 }}
              whileHover={{ y: -4 }}
              className="group relative rounded-xl border border-border/50 dark:border-border/40 bg-card/80 dark:bg-card/60 backdrop-blur-sm p-5 space-y-3 cursor-default overflow-hidden hover:border-primary/40 transition-colors duration-200"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none rounded-xl" />
              <div className="absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-primary/10 to-transparent skew-x-[-18deg] group-hover:left-full transition-all duration-700 ease-out pointer-events-none" />
              <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-200">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground leading-snug">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Footer signature ── */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="relative z-10 w-full max-w-5xl mx-auto mt-20 pt-8 border-t border-border/40 flex flex-col items-center gap-3 text-center"
        >
          <div className="flex items-center gap-2 text-muted-foreground/70">
            <DiscreenMark className="w-4 h-4" />
            <span className="text-xs font-medium tracking-wide">
              Di<span className="text-primary">screen</span>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/45 max-w-sm leading-relaxed">
            Conçu pour ceux qui préfèrent poser la question une seule fois.
          </p>
        </motion.footer>
      </section>
    </main>
  );
}
