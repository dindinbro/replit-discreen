import { motion } from "framer-motion";

export default function SearchLoader({ variant = "primary" }: { variant?: "primary" | "red" }) {
  const color   = variant === "red" ? "text-red-500" : "text-primary";
  const bgColor = variant === "red" ? "bg-red-500"  : "bg-primary";
  const fill    = variant === "red" ? "#ef4444"      : "hsl(var(--primary))";

  /* ── helpers ── */
  const inf = (dur: number, delay = 0) =>
    ({ duration: dur, repeat: Infinity, ease: "easeInOut" as const, delay });

  const legAnim = (d1: string, d2: string, delay: number) => ({
    animate:    { d: [d1, d2, d1] },
    transition: inf(1.6, delay),
  });

  /* ── tail sway paths ── */
  const TAIL1 = "M 76 116 C 100 124 120 110 118 88 C 116 66 100 52 88 46 L 93 38 L 87 42";
  const TAIL2 = "M 76 116 C 96 128 120 116 120 92 C 120 70 103 54 91 47 L 96 39 L 90 43";

  /* ── claw movable fingers ── */
  const LCLAW1 = "M 30 48 L 22 56";
  const LCLAW2 = "M 30 48 L 18 60";
  const RCLAW1 = "M 112 48 L 120 56";
  const RCLAW2 = "M 112 48 L 124 60";

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6" data-testid="search-loader">
      {/*
        ViewBox 160 × 185
        Prosoma:     ellipse cx=76 cy=68 rx=19 ry=18
        Opisthosoma: ellipse cx=76 cy=100 rx=15 ry=20
        Tail:        from (76,120) curves right then up, stinger at (88,46)
        Claws:       L arm → (30,48) · R arm → (112,48)
        Legs 4 pairs each side
      */}
      <svg
        viewBox="0 0 160 185"
        className={`w-36 h-36 ${color}`}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* ── Scorpion body (bounces) ── */}
        <motion.g
          animate={{ y: [0, 4, 0] }}
          transition={inf(1.7)}
        >
          {/* Prosoma (carapace) */}
          <ellipse cx="76" cy="68" rx="19" ry="18" strokeWidth="2" />

          {/* Eyes */}
          <circle cx="68" cy="59" r="2.4" fill={fill} stroke="none" />
          <circle cx="84" cy="59" r="2.4" fill={fill} stroke="none" />
          <circle cx="68" cy="59" r="0.8" fill="black" stroke="none" />
          <circle cx="84" cy="59" r="0.8" fill="black" stroke="none" />

          {/* Opisthosoma (segmented abdomen) */}
          <ellipse cx="76" cy="100" rx="15" ry="20" strokeWidth="2" />
          {/* Segment lines */}
          <path d="M 63 92  Q 76 90  89 92"  strokeWidth="0.9" strokeOpacity="0.45" />
          <path d="M 62 100 Q 76 98  90 100" strokeWidth="0.9" strokeOpacity="0.4"  />
          <path d="M 63 108 Q 76 106 89 108" strokeWidth="0.9" strokeOpacity="0.3"  />
          {/* Dorsal stripe */}
          <path d="M 76 82 L 76 118" strokeWidth="0.7" strokeOpacity="0.2" />

          {/* ── Metasoma / tail (animated sway) ── */}
          <motion.path
            d={TAIL1}
            strokeWidth="2.2"
            animate={{ d: [TAIL1, TAIL2, TAIL1] }}
            transition={inf(2.6)}
          />
          {/* Telson bulb */}
          <motion.circle
            cx="88" cy="46" r="4"
            fill={fill} stroke="none"
            animate={{ cx: [88, 91, 88], cy: [46, 47, 46] }}
            transition={inf(2.6)}
          />
          {/* Stinger tip */}
          <motion.path
            d="M 88 50 L 91 60"
            strokeWidth="1.6"
            animate={{ d: ["M 88 50 L 91 60", "M 91 51 L 94 61", "M 88 50 L 91 60"] }}
            transition={inf(2.6)}
          />

          {/* ── Left pedipalp (claw) ── */}
          {/* Arm */}
          <path d="M 59 64 C 46 56 35 52 30 48" strokeWidth="1.9" />
          {/* Fixed upper finger */}
          <path d="M 30 48 L 22 42" strokeWidth="1.7" />
          {/* Movable lower finger (opens/closes) */}
          <motion.path
            d={LCLAW1}
            strokeWidth="1.7"
            animate={{ d: [LCLAW1, LCLAW2, LCLAW1] }}
            transition={inf(1.8, 0.3)}
          />

          {/* ── Right pedipalp (claw) ── */}
          <path d="M 93 64 C 106 56 107 52 112 48" strokeWidth="1.9" />
          <path d="M 112 48 L 120 42" strokeWidth="1.7" />
          <motion.path
            d={RCLAW1}
            strokeWidth="1.7"
            animate={{ d: [RCLAW1, RCLAW2, RCLAW1] }}
            transition={inf(1.8, 0.7)}
          />

          {/* ── Left legs (4 pairs) ── */}
          <motion.path strokeWidth="1.8" {...legAnim(
            "M 58 64 L 38 58 L 20 52",
            "M 58 64 L 38 55 L 20 48", 0)} />
          <motion.path strokeWidth="1.8" {...legAnim(
            "M 58 70 L 36 68 L 16 66",
            "M 58 70 L 36 72 L 16 70", 0.8)} />
          <motion.path strokeWidth="1.8" {...legAnim(
            "M 58 77 L 36 78 L 16 82",
            "M 58 77 L 36 74 L 16 78", 0)} />
          <motion.path strokeWidth="1.8" {...legAnim(
            "M 60 84 L 40 88 L 22 96",
            "M 60 84 L 40 92 L 22 100", 0.8)} />

          {/* ── Right legs (4 pairs) ── */}
          <motion.path strokeWidth="1.8" {...legAnim(
            "M 94 64 L 114 58 L 132 52",
            "M 94 64 L 114 55 L 132 48", 0)} />
          <motion.path strokeWidth="1.8" {...legAnim(
            "M 94 70 L 116 68 L 136 66",
            "M 94 70 L 116 72 L 136 70", 0.8)} />
          <motion.path strokeWidth="1.8" {...legAnim(
            "M 94 77 L 116 78 L 136 82",
            "M 94 77 L 116 74 L 136 78", 0)} />
          <motion.path strokeWidth="1.8" {...legAnim(
            "M 92 84 L 112 88 L 130 96",
            "M 92 84 L 112 92 L 130 100", 0.8)} />
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
