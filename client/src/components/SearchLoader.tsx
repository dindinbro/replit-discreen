import { motion } from "framer-motion";

export default function SearchLoader({ variant = "primary" }: { variant?: "primary" | "red" }) {
  const color = variant === "red" ? "text-red-500" : "text-primary";
  const bgColor = variant === "red" ? "bg-red-500" : "bg-primary";
  const fill = variant === "red" ? "#ef4444" : "hsl(var(--primary))";

  // Two-segment leg: each leg has a clear knee joint
  // Legs animate in diagonal pairs (L1+R2+L3+R4) vs (L2+R1+L4+R3)
  const leg = (d1: string, d2: string, delay: number) => ({
    animate: { d: [d1, d2, d1] },
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut", delay },
  });

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6" data-testid="search-loader">
      {/*
        ViewBox 140×148
        Thread: (70,0)→(70,34)
        Cephalothorax: cx=70 cy=49 rx=13 ry=12.5  (top≈36.5 bottom≈61.5)
        Pedicel: cx=70 cy=65 rx=4.5 ry=4
        Abdomen: cx=70 cy=90 rx=21 ry=24  (top≈66 bottom≈114)
        Legs attach at cephalothorax sides y≈44-63
      */}
      <svg
        viewBox="0 0 140 148"
        className={`w-36 h-36 ${color}`}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* ── Thread ── */}
        <motion.line
          x1="70" y1="0" x2="70" y2="34"
          animate={{ y2: [34, 38, 34] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          strokeWidth="1.6"
        />

        {/* ── Spider body — bounces on thread ── */}
        <motion.g
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Cephalothorax */}
          <ellipse cx="70" cy="49" rx="13" ry="12.5" strokeWidth="2" />

          {/* Cephalic groove (central pit) */}
          <path d="M 70 42 L 70 51" strokeWidth="0.8" strokeOpacity="0.4" />
          {/* Lateral sulci */}
          <path d="M 62 46 Q 66 48 70 51" strokeWidth="0.7" strokeOpacity="0.3" fill="none" />
          <path d="M 78 46 Q 74 48 70 51" strokeWidth="0.7" strokeOpacity="0.3" fill="none" />

          {/* Eyes — anterior median row (large) + secondary row (small) */}
          <circle cx="64.5" cy="43.5" r="2.6" fill={fill} stroke="none" />
          <circle cx="75.5" cy="43.5" r="2.6" fill={fill} stroke="none" />
          <circle cx="70"   cy="42.5" r="1.9" fill={fill} stroke="none" />
          <circle cx="64"   cy="50"   r="1.5" fill={fill} stroke="none" />
          <circle cx="76"   cy="50"   r="1.5" fill={fill} stroke="none" />
          {/* Eye shine */}
          <circle cx="65.5" cy="42.8" r="0.7" fill="black" stroke="none" />
          <circle cx="76.5" cy="42.8" r="0.7" fill="black" stroke="none" />

          {/* Pedicel (waist) */}
          <ellipse cx="70" cy="64.5" rx="4.5" ry="4" strokeWidth="1.8" />

          {/* Abdomen */}
          <ellipse cx="70" cy="90" rx="21" ry="24" strokeWidth="2" />

          {/* Abdomen dorsal pattern — chevron markings */}
          <path d="M 58 80 Q 70 75.5 82 80" strokeWidth="1"   strokeOpacity="0.4" fill="none" />
          <path d="M 55 89 Q 70 84   85 89" strokeWidth="1"   strokeOpacity="0.35" fill="none" />
          <path d="M 56 98 Q 70 93   84 98" strokeWidth="0.9" strokeOpacity="0.28" fill="none" />
          <path d="M 60 106 Q 70 102 80 106" strokeWidth="0.8" strokeOpacity="0.2"  fill="none" />
          {/* Median stripe */}
          <path d="M 70 68 L 70 112" strokeWidth="0.7" strokeOpacity="0.15" />

          {/* Chelicerae / fangs */}
          <path d="M 63.5 60 Q 60 65 59 70" strokeWidth="1.6" strokeOpacity="0.8" />
          <path d="M 76.5 60 Q 80 65 81 70" strokeWidth="1.6" strokeOpacity="0.8" />
          {/* Fang tips */}
          <circle cx="59.5" cy="70.5" r="1.4" fill={fill} stroke="none" opacity="0.7" />
          <circle cx="80.5" cy="70.5" r="1.4" fill={fill} stroke="none" opacity="0.7" />

          {/* ════ LEFT LEGS ════ — each = M attach L knee L tip */}
          {/* Pair A: L1, L3 (delay 0) */}
          <motion.path strokeWidth="1.9" {...leg(
            "M 59 43 L 36 24 L 9  15",
            "M 59 43 L 36 21 L 9  11"
          , 0)} />
          <motion.path strokeWidth="1.9" {...leg(
            "M 58 56 L 27 68 L 5  86",
            "M 58 56 L 27 72 L 5  91"
          , 0)} />

          {/* Pair B: L2, L4 (delay 0.75) */}
          <motion.path strokeWidth="1.9" {...leg(
            "M 58 50 L 29 46 L 4  52",
            "M 58 50 L 29 44 L 4  48"
          , 0.75)} />
          <motion.path strokeWidth="1.9" {...leg(
            "M 59 62 L 36 86 L 20 112",
            "M 59 62 L 36 90 L 20 117"
          , 0.75)} />

          {/* ════ RIGHT LEGS ════ */}
          {/* Pair A: R1, R3 (delay 0) */}
          <motion.path strokeWidth="1.9" {...leg(
            "M 81 43 L 104 24 L 131 15",
            "M 81 43 L 104 21 L 131 11"
          , 0)} />
          <motion.path strokeWidth="1.9" {...leg(
            "M 82 56 L 113 68 L 135 86",
            "M 82 56 L 113 72 L 135 91"
          , 0)} />

          {/* Pair B: R2, R4 (delay 0.75) */}
          <motion.path strokeWidth="1.9" {...leg(
            "M 82 50 L 111 46 L 136 52",
            "M 82 50 L 111 44 L 136 48"
          , 0.75)} />
          <motion.path strokeWidth="1.9" {...leg(
            "M 81 62 L 104 86 L 120 112",
            "M 81 62 L 104 90 L 120 117"
          , 0.75)} />
        </motion.g>
      </svg>

      <div className="flex flex-col items-center space-y-2">
        <motion.p
          className={`${color} font-medium text-sm`}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Analyse des bases de données...
        </motion.p>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map(i => (
            <motion.div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${bgColor}`}
              animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
