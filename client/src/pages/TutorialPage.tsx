import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, CreditCard, Search, BarChart3, X, ZoomIn, Mail, Phone, Globe, Hash, User } from "lucide-react";

/* ── Mockup: Search page ────────────────────────────────────── */
function MockupSearchPage() {
  return (
    <div className="w-full h-full bg-[#0d0d0d] flex">
      {/* Mini sidebar */}
      <div className="w-[70px] border-r border-white/5 p-2 flex flex-col gap-1 shrink-0">
        {[
          { icon: "⊹", label: "Param.", active: true },
          { icon: "☏", label: "Tél." },
          { icon: "◎", label: "GeoIP" },
          { icon: "#", label: "NIR" },
        ].map((item) => (
          <div key={item.label} className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg ${item.active ? "bg-primary/20" : "hover:bg-white/5"}`}>
            <span className={`text-[10px] ${item.active ? "text-primary" : "text-white/30"}`}>{item.icon}</span>
            <span className={`text-[6px] ${item.active ? "text-primary" : "text-white/25"}`}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Main search area */}
      <div className="flex-1 p-3 flex flex-col gap-2 min-w-0">
        <div className="text-[9px] font-bold text-white/70 flex items-center gap-1.5">
          <span className="text-primary">✦</span> Recherche par Critères
        </div>

        {/* Filter chips */}
        <div className="flex gap-1 flex-wrap">
          {[
            { label: "Email", icon: Mail, active: true },
            { label: "Téléphone", icon: Phone },
            { label: "IP", icon: Globe },
            { label: "Username", icon: User },
            { label: "Discord", icon: Hash },
          ].map((f) => (
            <div key={f.label} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] border ${f.active ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/4 border-white/10 text-white/40"}`}>
              <f.icon className="w-2 h-2" />
              {f.label}
            </div>
          ))}
        </div>

        {/* Search row */}
        <div className="flex gap-1.5">
          <div className="flex-1 h-7 rounded-lg bg-white/6 border border-white/10 flex items-center px-2 gap-1.5">
            <Mail className="w-2.5 h-2.5 text-white/30 shrink-0" />
            <span className="text-[8px] text-white/25 truncate">exemple@gmail.com</span>
          </div>
          <div className="h-7 px-2.5 rounded-lg bg-primary flex items-center">
            <span className="text-[7px] font-bold text-black whitespace-nowrap">⌕ Rechercher</span>
          </div>
        </div>

        {/* Results preview */}
        <div className="flex-1 rounded-lg bg-white/3 border border-white/8 p-2 space-y-1.5">
          <div className="text-[7px] text-primary font-semibold">4 résultats trouvés</div>
          {[
            { src: "LeakDB", email: "exemple@gmail.com", ip: "82.64.xxx.xxx" },
            { src: "BreachSet", email: "exemple@gmail.com", ip: "91.121.xxx.xxx" },
            { src: "ComboList", email: "exemple@gmail.com", ip: "176.31.xxx.xxx" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-white/4 rounded px-1.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
              <span className="text-[6px] text-primary/60 w-14 shrink-0">{r.src}</span>
              <span className="text-[6px] text-white/50 truncate">{r.email}</span>
              <span className="text-[6px] text-white/30 font-mono ml-auto shrink-0">{r.ip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Mockup: Results detail page ────────────────────────────── */
function MockupResultsPage() {
  const fields = [
    { label: "Email", value: "exemple@gmail.com", color: "text-primary" },
    { label: "Mot de passe", value: "P@ssw•••••", color: "text-red-400" },
    { label: "IP", value: "82.64.142.xxx", color: "text-blue-400" },
    { label: "Username", value: "john_d••", color: "text-white/70" },
    { label: "Téléphone", value: "+33 6 xx xx xx 42", color: "text-white/70" },
    { label: "Source", value: "BreachDB 2023", color: "text-yellow-400" },
    { label: "Pays", value: "France 🇫🇷", color: "text-white/70" },
    { label: "Date fuite", value: "14/03/2023", color: "text-white/50" },
  ];

  return (
    <div className="w-full h-full bg-[#0d0d0d] flex flex-col p-3 gap-2">
      <div className="flex items-center justify-between">
        <div className="text-[9px] font-bold text-white/70">Fiche Résultat #1</div>
        <div className="flex items-center gap-1">
          <div className="px-1.5 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-[6px] text-primary">LeakDB</div>
          <div className="px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[6px] text-white/40">2023</div>
        </div>
      </div>

      <div className="flex-1 rounded-lg bg-white/3 border border-white/8 overflow-hidden">
        <div className="grid grid-cols-2 h-full">
          {fields.map((f, i) => (
            <div key={f.label} className={`flex flex-col px-2 py-1.5 ${i % 2 === 0 ? "border-r border-white/5" : ""} ${i < fields.length - 2 ? "border-b border-white/5" : ""}`}>
              <span className="text-[6px] text-white/30 uppercase tracking-wider">{f.label}</span>
              <span className={`text-[7px] font-mono font-medium mt-0.5 ${f.color}`}>{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 h-6 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
          <span className="text-[7px] text-primary">⇄ Croiser données</span>
        </div>
        <div className="flex-1 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
          <span className="text-[7px] text-white/40">↓ Exporter</span>
        </div>
      </div>
    </div>
  );
}

/* ── Browser chrome wrapper ─────────────────────────────────── */
function BrowserChrome({ children, num, img }: { children?: React.ReactNode; num: string; img?: string }) {
  return (
    <div className="relative w-full h-full flex flex-col bg-[#0d0d0d] rounded-t-none overflow-hidden">
      <div className="h-6 bg-[#111]/90 border-b border-white/5 flex items-center px-3 gap-1.5 shrink-0 z-10">
        {["#ff5f56","#ffbd2e","#27c93f"].map(c => (
          <div key={c} className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
        ))}
        <div className="flex-1 mx-3 h-3 rounded bg-white/5 border border-white/6 flex items-center px-2">
          <span className="text-[7px] text-white/25">discreen.app</span>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {img ? (
          <img src={img} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          children
        )}
        <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-lg bg-black/60 border border-primary/40 backdrop-blur-sm flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary">{num}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Step data ──────────────────────────────────────────────── */
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
    desc: "Sélectionnez le forfait adapté à vos besoins : Free ou PRO. Chaque plan débloque des modules de recherche supplémentaires et augmente votre quota quotidien.",
    img: "/tuto/step2-pricing.jpg",
  },
  {
    num: "03",
    icon: Search,
    title: "Lancer une recherche",
    desc: "Utilisez la recherche Paramétrique pour filtrer par email, téléphone, IP, username, Discord ID et bien plus. Combinez plusieurs critères pour des résultats ultra-précis.",
    mockup: <MockupSearchPage />,
  },
  {
    num: "04",
    icon: BarChart3,
    title: "Exploiter les résultats",
    desc: "Consultez les fiches détaillées avec toutes les informations croisées : email, mot de passe, IP, source, date de fuite. Exportez et croisez les données entre bases.",
    mockup: <MockupResultsPage />,
  },
];

/* ── Main page ──────────────────────────────────────────────── */
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
              {/* Preview area */}
              <div className="relative h-52 overflow-hidden border-b border-border/20">
                <BrowserChrome num={step.num} img={"img" in step ? step.img : undefined}>
                  {"mockup" in step ? step.mockup : null}
                </BrowserChrome>
                {/* Zoom hint */}
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
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md"
              onClick={() => setOpen(null)}
            />
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
                {/* Large preview */}
                <div className="relative bg-[#0d0d0d] h-[55vh]">
                  <div className="h-7 bg-[#111]/90 border-b border-white/5 flex items-center px-4 gap-1.5">
                    {["#ff5f56","#ffbd2e","#27c93f"].map(c => (
                      <div key={c} className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c }} />
                    ))}
                    <div className="flex-1 mx-3 h-4 rounded bg-white/5 border border-white/6 flex items-center px-2">
                      <span className="text-[8px] text-white/30">discreen.app</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 pt-7 overflow-hidden">
                    {"img" in active && active.img ? (
                      <img src={active.img} alt={active.title} className="w-full h-full object-cover object-top" />
                    ) : (
                      "mockup" in active ? active.mockup : null
                    )}
                  </div>
                  <button
                    onClick={() => setOpen(null)}
                    className="absolute top-9 right-3 z-20 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-colors backdrop-blur-sm"
                    data-testid="button-tutorial-close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Text + nav */}
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
                    >← Précédent</button>
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
                    >Suivant →</button>
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
