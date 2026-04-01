import { motion } from "framer-motion";
import { UserPlus, CreditCard, Search, BarChart3 } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: UserPlus,
    title: "Créer un compte",
    desc: "Inscrivez-vous en quelques secondes avec votre adresse email ou connectez-vous directement via Discord. Votre accès est sécurisé et votre compte activé instantanément.",
    mockup: <MockupRegister />,
  },
  {
    num: "02",
    icon: CreditCard,
    title: "Choisir un abonnement",
    desc: "Sélectionnez le forfait adapté à vos besoins : Free, VIP ou PRO. Chaque plan débloque des modules de recherche supplémentaires et augmente votre quota quotidien.",
    mockup: <MockupPricing />,
  },
  {
    num: "03",
    icon: Search,
    title: "Lancer une recherche",
    desc: "Utilisez la recherche Paramétrique pour filtrer par email, téléphone, IP, username, Discord ID et bien plus. Combinez plusieurs critères pour des résultats ultra-précis.",
    mockup: <MockupSearch />,
  },
  {
    num: "04",
    icon: BarChart3,
    title: "Exploiter les résultats",
    desc: "Consultez les fiches détaillées, parcourez les données structurées et croisez les informations entre les différentes bases de données indexées.",
    mockup: <MockupResults />,
  },
];

function MockupRegister() {
  return (
    <div className="w-full h-full bg-[#0d0d0d] rounded-lg p-4 flex items-center justify-center">
      <div className="w-full max-w-[200px] space-y-2.5">
        <div className="flex gap-1.5 mb-3">
          <div className="flex-1 h-7 rounded-md bg-primary/80 flex items-center justify-center">
            <span className="text-[9px] font-semibold text-black">Inscription</span>
          </div>
          <div className="flex-1 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
            <span className="text-[9px] text-white/50">Connexion</span>
          </div>
        </div>
        <div className="h-7 rounded-md bg-white/6 border border-white/10 px-2 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <span className="text-[9px] text-white/40">vous@exemple.com</span>
        </div>
        <div className="h-7 rounded-md bg-white/6 border border-white/10 px-2 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <span className="text-[9px] text-white/40">••••••••</span>
        </div>
        <div className="h-7 rounded-md bg-primary flex items-center justify-center">
          <span className="text-[9px] font-semibold text-black">Créer mon compte →</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[8px] text-white/30">OR</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
        <div className="h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-[#5865F2]" />
          <span className="text-[9px] text-white/60">Discord</span>
        </div>
      </div>
    </div>
  );
}

function MockupPricing() {
  const plans = [
    { name: "Free", price: "0€", color: "bg-white/5", border: "border-white/10", active: false },
    { name: "VIP", price: "9.99€", color: "bg-primary/10", border: "border-primary/50", active: true },
    { name: "PRO", price: "19.99€", color: "bg-white/5", border: "border-white/10", active: false },
  ];
  return (
    <div className="w-full h-full bg-[#0d0d0d] rounded-lg p-4 flex items-center justify-center">
      <div className="flex gap-2 w-full">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`flex-1 rounded-lg border ${p.border} ${p.color} p-2 space-y-1.5 ${p.active ? "ring-1 ring-primary/40" : ""}`}
          >
            <div className="text-[9px] font-bold text-white/80">{p.name}</div>
            <div className="text-[11px] font-bold text-primary">{p.price}</div>
            {[1,2,3].map(i => (
              <div key={i} className={`h-1 rounded-full ${p.active ? "bg-primary/30" : "bg-white/8"}`} style={{ width: `${60 + i*10}%` }} />
            ))}
            <div className={`h-5 rounded-md ${p.active ? "bg-primary" : "bg-white/8"} flex items-center justify-center mt-1`}>
              <span className="text-[7px] font-semibold text-black">{p.active ? "Choisir" : "Voir"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockupSearch() {
  return (
    <div className="w-full h-full bg-[#0d0d0d] rounded-lg p-4 flex flex-col gap-2.5">
      <div className="flex gap-1.5 flex-wrap">
        {["Email", "Téléphone", "IP", "Username", "Discord"].map((f, i) => (
          <span key={f} className={`text-[8px] px-2 py-0.5 rounded-full ${i === 0 ? "bg-primary/20 text-primary border border-primary/40" : "bg-white/5 text-white/40 border border-white/10"}`}>
            {f}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <div className="flex-1 h-7 rounded-md bg-white/6 border border-white/10 px-2 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-white/20" />
          <span className="text-[9px] text-white/30">exemple@email.com</span>
        </div>
        <div className="w-16 h-7 rounded-md bg-primary flex items-center justify-center">
          <span className="text-[8px] font-bold text-black">Rechercher</span>
        </div>
      </div>
      <div className="flex-1 rounded-md bg-white/3 border border-white/8 flex items-center justify-center">
        <div className="text-center space-y-1">
          <div className="w-5 h-5 rounded-full bg-primary/20 mx-auto flex items-center justify-center">
            <Search className="w-2.5 h-2.5 text-primary" />
          </div>
          <span className="text-[8px] text-white/30">Entrez vos critères</span>
        </div>
      </div>
    </div>
  );
}

function MockupResults() {
  const rows = [
    { label: "Email", val: "j••••@gmail.com", w: "70%" },
    { label: "IP", val: "82.64.•••.•••", w: "55%" },
    { label: "Username", val: "j4rv••", w: "45%" },
    { label: "Source", val: "Breach 2023", w: "65%" },
  ];
  return (
    <div className="w-full h-full bg-[#0d0d0d] rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-semibold text-primary">3 résultats trouvés</span>
        <div className="flex gap-1">
          {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60" />)}
        </div>
      </div>
      <div className="flex-1 rounded-md bg-white/3 border border-white/8 p-2 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2">
            <span className="text-[8px] text-white/40 w-12 shrink-0">{r.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/6 overflow-hidden">
              <div className="h-full rounded-full bg-primary/40" style={{ width: r.w }} />
            </div>
            <span className="text-[8px] text-white/60 font-mono w-20 text-right shrink-0">{r.val}</span>
          </div>
        ))}
      </div>
      <div className="h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
        <span className="text-[8px] text-white/40">Voir la fiche complète →</span>
      </div>
    </div>
  );
}

export default function TutorialPage() {
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
              className="group rounded-2xl border border-border/30 bg-card/40 overflow-hidden hover:border-primary/30 hover:shadow-[0_0_24px_rgba(212,175,55,0.08)] transition-all duration-300"
              data-testid={`tutorial-step-${i}`}
            >
              {/* Mockup screenshot area */}
              <div className="relative h-52 border-b border-border/20 overflow-hidden bg-[#0d0d0d]">
                {/* Top bar chrome */}
                <div className="absolute top-0 inset-x-0 h-6 bg-[#111]/80 border-b border-white/5 flex items-center px-3 gap-1.5 z-10">
                  {["#ff5f56","#ffbd2e","#27c93f"].map(c => (
                    <div key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />
                  ))}
                  <div className="flex-1 mx-3 h-3 rounded bg-white/5 border border-white/6 flex items-center px-2">
                    <span className="text-[7px] text-white/25">discreen.app</span>
                  </div>
                </div>
                <div className="absolute inset-0 pt-6 p-2">
                  {step.mockup}
                </div>
                {/* Number badge */}
                <div className="absolute top-8 left-3 w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">{step.num}</span>
                </div>
              </div>

              {/* Text content */}
              <div className="p-5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h2 className="font-display font-bold text-base text-foreground">{step.title}</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-9">
                  {step.desc}
                </p>
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
    </div>
  );
}
