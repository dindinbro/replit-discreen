import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Tag, Copy, Check, ChevronUp } from "lucide-react";

const STORAGE_KEY = "discreen_promo_starter_minimized_v1";
const PROMO_CODE = "STARTER";
const PROMO_DISCOUNT = 27;

export default function PromoBanner() {
  const [minimized, setMinimized] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "1") setMinimized(true);
    } catch {}
    setMounted(true);
  }, []);

  const setMinimizedPersisted = (v: boolean) => {
    setMinimized(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {}
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9998] pointer-events-none">
      <AnimatePresence mode="wait">
        {minimized ? (
          <motion.button
            key="minimized"
            type="button"
            onClick={() => setMinimizedPersisted(false)}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.05 }}
            className="pointer-events-auto relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-bold shadow-[0_8px_30px_rgba(251,191,36,0.45)] border border-amber-300/60 group"
            data-testid="button-promo-expand"
            aria-label="Voir la promotion"
          >
            <span className="absolute inset-0 rounded-full bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
              className="relative"
            >
              <Tag className="w-4 h-4" />
            </motion.span>
            <span className="relative text-sm tracking-wide">-{PROMO_DISCOUNT}%</span>
            <ChevronUp className="relative w-3.5 h-3.5 opacity-70" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="pointer-events-auto relative w-[320px] sm:w-[360px] rounded-2xl overflow-hidden shadow-[0_20px_60px_-10px_rgba(251,191,36,0.45)] border border-amber-400/50"
            data-testid="card-promo-banner"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.35),transparent_60%)]" />

            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
            />

            <button
              type="button"
              onClick={() => setMinimizedPersisted(true)}
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
              data-testid="button-promo-minimize"
              aria-label="Réduire la promotion"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="relative p-5 text-black">
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="w-9 h-9 rounded-lg bg-black/15 backdrop-blur flex items-center justify-center"
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-80">
                    Offre limitée
                  </div>
                  <div className="text-lg font-extrabold leading-tight">
                    -{PROMO_DISCOUNT}% sur ton abonnement
                  </div>
                </div>
              </div>

              <p className="text-xs font-medium text-black/80 mb-3 leading-relaxed">
                Utilise le code ci-dessous au moment du paiement pour profiter de la réduction.
              </p>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-black/85 hover:bg-black text-amber-300 border-2 border-dashed border-amber-300/60 mb-3 transition-colors group"
                data-testid="button-copy-promo-code"
                aria-label="Copier le code promo"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span className="font-mono font-bold text-base tracking-[0.2em]">
                    {PROMO_CODE}
                  </span>
                </div>
                {copied ? (
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    <Check className="w-3.5 h-3.5" /> Copié
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold opacity-70 group-hover:opacity-100 transition-opacity">
                    <Copy className="w-3.5 h-3.5" /> Copier
                  </span>
                )}
              </button>

              <Link href="/pricing">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 rounded-lg bg-black text-amber-300 hover:text-amber-200 font-bold text-sm tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                  data-testid="button-promo-cta"
                >
                  En profiter maintenant →
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
