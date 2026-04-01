import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, CreditCard, Search, BarChart3, X, ZoomIn } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: UserPlus,
    title: "Créer un compte",
    desc: "Inscrivez-vous en quelques secondes avec votre adresse email ou connectez-vous directement via Discord. Votre accès est sécurisé et votre compte activé instantanément.",
    img: "/tuto/step1-login.jpg",
  },
  {
    num: "02",
    icon: CreditCard,
    title: "Choisir un abonnement",
    desc: "Sélectionnez le forfait adapté à vos besoins : Free, VIP ou PRO. Chaque plan débloque des modules de recherche supplémentaires et augmente votre quota quotidien.",
    img: "/tuto/step2-pricing.jpg",
  },
  {
    num: "03",
    icon: Search,
    title: "Lancer une recherche",
    desc: "Utilisez la recherche Paramétrique pour filtrer par email, téléphone, IP, username, Discord ID et bien plus. Combinez plusieurs critères pour des résultats ultra-précis.",
    img: "/tuto/step3-search.jpg",
  },
  {
    num: "04",
    icon: BarChart3,
    title: "Exploiter les résultats",
    desc: "Consultez les fiches détaillées, parcourez les données structurées et croisez les informations entre les différentes bases de données indexées. Accédez à des milliards d'enregistrements.",
    img: "/tuto/step4-results.jpg",
  },
];

export default function TutorialPage() {
  const [open, setOpen] = useState<number | null>(null);
  const active = open !== null ? STEPS[open] : null;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center space-y-3"
      >
        <p className="text-xs tracking-[0.22em] uppercase text-primary/70 font-semibold">Guide de démarrage</p>
        <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
          Commencer avec{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b8902e] via-[#f0c060] to-[#d4a843]">
            Discreen
          </span>
        </h1>
        <p className="text-muted-foreground text-base max-w-xl mx-auto">
          Quatre étapes pour accéder à la puissance de recherche de la plateforme.
        </p>
      </motion.div>

      {/* Steps grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -3 }}
              onClick={() => setOpen(i)}
              className="group rounded-2xl border border-border/30 bg-card/40 overflow-hidden hover:border-primary/40 hover:shadow-[0_0_24px_rgba(212,175,55,0.10)] transition-all duration-300 cursor-pointer"
              data-testid={`tutorial-step-${i}`}
            >
              {/* Screenshot */}
              <div className="relative h-52 overflow-hidden bg-[#0d0d0d]">
                {/* Browser chrome */}
                <div className="absolute top-0 inset-x-0 h-6 bg-[#111]/90 border-b border-white/5 flex items-center px-3 gap-1.5 z-10">
                  {["#ff5f56","#ffbd2e","#27c93f"].map(c => (
                    <div key={c} className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
                  ))}
                  <div className="flex-1 mx-3 h-3 rounded bg-white/5 border border-white/6 flex items-center px-2">
                    <span className="text-[7px] text-white/25">discreen.app</span>
                  </div>
                </div>

                <img
                  src={step.img}
                  alt={step.title}
                  className="absolute inset-0 w-full h-full object-cover object-top pt-6"
                />

                {/* Step badge */}
                <div className="absolute top-8 left-3 z-20 w-7 h-7 rounded-lg bg-black/60 border border-primary/40 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">{step.num}</span>
                </div>

                {/* Zoom hint overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40">
                  <div className="flex items-center gap-2 bg-black/70 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
                    <ZoomIn className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-white/80 font-medium">Agrandir</span>
                  </div>
                </div>
              </div>

              {/* Text */}
              <div className="p-5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h2 className="font-display font-bold text-base text-foreground">{step.title}</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-9">{step.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-10 text-center"
      >
        <p className="text-sm text-muted-foreground">
          Besoin d'aide ?{" "}
          <a
            href="https://discord.gg/discreen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 font-medium transition-colors"
            data-testid="link-tutorial-discord"
          >
            Rejoignez notre Discord →
          </a>
        </p>
      </motion.div>

      {/* ── Lightbox modal ── */}
      <AnimatePresence>
        {active && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md"
              onClick={() => setOpen(null)}
            />

            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-border/40 bg-background shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Large screenshot */}
                <div className="relative bg-[#0d0d0d]">
                  {/* Browser chrome */}
                  <div className="h-7 bg-[#111]/90 border-b border-white/5 flex items-center px-4 gap-1.5">
                    {["#ff5f56","#ffbd2e","#27c93f"].map(c => (
                      <div key={c} className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c }} />
                    ))}
                    <div className="flex-1 mx-3 h-4 rounded bg-white/5 border border-white/6 flex items-center px-2">
                      <span className="text-[8px] text-white/30">discreen.app</span>
                    </div>
                  </div>
                  <img
                    src={active.img}
                    alt={active.title}
                    className="w-full object-cover object-top max-h-[55vh]"
                  />
                  {/* Close button */}
                  <button
                    onClick={() => setOpen(null)}
                    className="absolute top-9 right-3 z-20 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-colors backdrop-blur-sm"
                    data-testid="button-tutorial-close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal text + nav */}
                <div className="p-6 space-y-3">
                  <span className="text-xs font-bold text-primary/60 tracking-widest">ÉTAPE {active.num}</span>
                  <h2 className="text-2xl font-display font-bold text-foreground">{active.title}</h2>
                  <p className="text-base text-muted-foreground leading-relaxed">{active.desc}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-border/20">
                    <button
                      onClick={() => setOpen(o => o !== null && o > 0 ? o - 1 : o)}
                      disabled={open === 0}
                      className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                      data-testid="button-tutorial-prev"
                    >
                      ← Précédent
                    </button>
                    <div className="flex gap-2">
                      {STEPS.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setOpen(i)}
                          className={`transition-all duration-200 rounded-full ${i === open ? "w-5 h-2 bg-primary" : "w-2 h-2 bg-border hover:bg-primary/50"}`}
                          data-testid={`button-tutorial-dot-${i}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setOpen(o => o !== null && o < STEPS.length - 1 ? o + 1 : o)}
                      disabled={open === STEPS.length - 1}
                      className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                      data-testid="button-tutorial-next"
                    >
                      Suivant →
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
