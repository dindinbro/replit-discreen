import { motion } from "framer-motion";

export default function SearchLoader({ variant = "primary" }: { variant?: "primary" | "red" }) {
  const color = variant === "red" ? "text-red-500" : "text-primary";
  const bgColor = variant === "red" ? "bg-red-500" : "bg-primary";
  const fill = variant === "red" ? "#ef4444" : "hsl(var(--primary))";

  const legAnim = (d1: string, d2: string, delay: number) => ({
    animate: { d: [d1, d2, d1] },
    transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay },
  });

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6" data-testid="search-loader">
      <svg viewBox="0 0 100 108" className={`w-32 h-32 ${color}`} fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">

        {/* ── Thread ── */}
        <motion.line x1="50" y1="0" x2="50" y2="24"
          animate={{ y2: [24, 27, 24] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ── Body group — bounces on thread ── */}
        <motion.g
          animate={{ y: [0, 3, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Cephalothorax */}
          <ellipse cx="50" cy="36" rx="11" ry="9.5" strokeWidth="1.8" />

          {/* Fangs */}
          <path d="M 45 43 Q 43 47 42 50" strokeWidth="1.4" strokeOpacity="0.7" />
          <path d="M 55 43 Q 57 47 58 50" strokeWidth="1.4" strokeOpacity="0.7" />

          {/* Abdomen — bigger, rounder */}
          <ellipse cx="50" cy="66" rx="15.5" ry="18" strokeWidth="1.8" />

          {/* Abdomen markings */}
          <path d="M 50 51 L 50 82" strokeWidth="0.7" strokeOpacity="0.25" />
          <path d="M 40 60 Q 50 57 60 60" strokeWidth="0.7" strokeOpacity="0.2" />
          <path d="M 38 68 Q 50 65 62 68" strokeWidth="0.7" strokeOpacity="0.2" />

          {/* Eyes — 2 large + 2 small */}
          <circle cx="45.5" cy="33.5" r="2.4" fill={fill} stroke="none" />
          <circle cx="54.5" cy="33.5" r="2.4" fill={fill} stroke="none" />
          <circle cx="47.5" cy="39" r="1.5" fill={fill} stroke="none" />
          <circle cx="52.5" cy="39" r="1.5" fill={fill} stroke="none" />

          {/* ── Legs — cubic bezier curves for natural shape ── */}

          {/* L1 — top-front (reaches up and out) */}
          <motion.path {...legAnim(
            "M 41 28 C 30 20 16 16 5 13",
            "M 41 28 C 30 18 16 13 5 10"
          , 0)} />
          {/* L2 — front (sweeps forward) */}
          <motion.path {...legAnim(
            "M 40 33 C 27 28 14 24 3 24",
            "M 40 33 C 27 26 14 21 3 21"
          , 0.28)} />
          {/* L3 — mid (horizontal then slightly down) */}
          <motion.path {...legAnim(
            "M 40 38 C 26 38 14 42 4 48",
            "M 40 38 C 26 40 14 45 4 52"
          , 0)} />
          {/* L4 — rear (curves back and down) */}
          <motion.path {...legAnim(
            "M 41 42 C 30 52 22 60 16 72",
            "M 41 42 C 30 54 22 63 16 76"
          , 0.28)} />

          {/* R1 */}
          <motion.path {...legAnim(
            "M 59 28 C 70 20 84 16 95 13",
            "M 59 28 C 70 18 84 13 95 10"
          , 0.14)} />
          {/* R2 */}
          <motion.path {...legAnim(
            "M 60 33 C 73 28 86 24 97 24",
            "M 60 33 C 73 26 86 21 97 21"
          , 0.42)} />
          {/* R3 */}
          <motion.path {...legAnim(
            "M 60 38 C 74 38 86 42 96 48",
            "M 60 38 C 74 40 86 45 96 52"
          , 0.14)} />
          {/* R4 */}
          <motion.path {...legAnim(
            "M 59 42 C 70 52 78 60 84 72",
            "M 59 42 C 70 54 78 63 84 76"
          , 0.42)} />
        </motion.g>
      </svg>

      <div className="flex flex-col items-center space-y-2">
        <motion.p className={`${color} font-medium text-sm`}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}>
          Analyse des bases de données...
        </motion.p>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map(i => (
            <motion.div key={i} className={`w-1.5 h-1.5 rounded-full ${bgColor}`}
              animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
