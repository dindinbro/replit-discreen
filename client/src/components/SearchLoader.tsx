import { motion } from "framer-motion";

export default function SearchLoader({ variant = "primary" }: { variant?: "primary" | "red" }) {
  const color   = variant === "red" ? "text-red-500" : "text-primary";
  const bgColor = variant === "red" ? "bg-red-500"  : "bg-primary";
  const fill    = variant === "red" ? "#ef4444"      : "hsl(var(--primary))";

  const inf = (dur: number, delay = 0) =>
    ({ duration: dur, repeat: Infinity, ease: "easeInOut" as const, delay });

  const legAnim = (d1: string, d2: string, delay: number) => ({
    animate:    { d: [d1, d2, d1] },
    transition: inf(1.5, delay),
  });

  /* tail sway — two positions */
  const T1 = "M 80 118 C 104 126 122 110 120 88 C 118 66 102 52 90 47 L 96 39 L 89 44";
  const T2 = "M 80 118 C 100 130 124 116 122 92 C 120 70 105 55 92 49 L 98 41 L 91 46";

  /* claw movable fingers */
  const LC1 = "M 32 50 L 24 44";   const LC2 = "M 32 50 L 20 58";
  const RC1 = "M 110 50 L 118 44"; const RC2 = "M 110 50 L 122 58";

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6" data-testid="search-loader">
      {/*
        ViewBox 160 × 180
        Prosoma:     ellipse cx=80 cy=68 rx=20 ry=19
        Opisthosoma: ellipse cx=80 cy=100 rx=16 ry=20
        Tail: (80,120) → right → up → stinger at (90,47)
        Pincers: L arm→(32,50) · R arm→(110,50)
      */}
      <svg
        viewBox="0 0 160 180"
        className={`w-36 h-36 ${color}`}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.g animate={{ y: [0, 5, 0] }} transition={inf(1.8)}>

          {/* ── Prosoma (carapace) ── */}
          <ellipse cx="80" cy="68" rx="20" ry="19" strokeWidth="2.2" />
          {/* Central groove */}
          <path d="M 80 51 L 80 84" strokeWidth="0.9" strokeOpacity="0.3" />
          {/* Eyes */}
          <circle cx="71" cy="59" r="2.8" fill={fill} stroke="none" />
          <circle cx="89" cy="59" r="2.8" fill={fill} stroke="none" />
          <circle cx="71" cy="59" r="0.9" fill="black" stroke="none" />
          <circle cx="89" cy="59" r="0.9" fill="black" stroke="none" />

          {/* ── Opisthosoma (segmented abdomen) ── */}
          <ellipse cx="80" cy="100" rx="16" ry="20" strokeWidth="2.2" />
          <path d="M 66 92  Q 80 90  94 92"  strokeWidth="1"   strokeOpacity="0.4" />
          <path d="M 65 100 Q 80 98  95 100" strokeWidth="1"   strokeOpacity="0.35"/>
          <path d="M 66 108 Q 80 106 94 108" strokeWidth="0.9" strokeOpacity="0.28"/>
          <path d="M 80 82 L 80 118"          strokeWidth="0.7" strokeOpacity="0.18"/>

          {/* ── Metasoma / tail — animated sway ── */}
          <motion.path
            d={T1} strokeWidth="2.4"
            animate={{ d: [T1, T2, T1] }}
            transition={inf(2.8)}
          />
          {/* Telson bulb */}
          <motion.circle
            cx="90" cy="47" r="5"
            fill={fill} stroke="none"
            animate={{ cx: [90, 93, 90], cy: [47, 49, 47] }}
            transition={inf(2.8)}
          />
          {/* Stinger tip */}
          <motion.path
            d="M 90 52 Q 94 60 92 66"
            strokeWidth="1.8"
            animate={{ d: ["M 90 52 Q 94 60 92 66", "M 93 54 Q 97 62 95 68", "M 90 52 Q 94 60 92 66"] }}
            transition={inf(2.8)}
          />

          {/* ── Left pedipalp (claw) ── */}
          <path d="M 62 64 C 50 56 40 52 32 48" strokeWidth="2" />
          <path d="M 32 48 L 22 42" strokeWidth="1.8" />
          <motion.path d={LC1} strokeWidth="1.8"
            animate={{ d: [LC1, LC2, LC1] }} transition={inf(2, 0.4)} />

          {/* ── Right pedipalp (claw) ── */}
          <path d="M 98 64 C 110 56 104 52 110 48" strokeWidth="2" />
          <path d="M 110 48 L 120 42" strokeWidth="1.8" />
          <motion.path d={RC1} strokeWidth="1.8"
            animate={{ d: [RC1, RC2, RC1] }} transition={inf(2, 0.9)} />

          {/* ── Left legs (4 pairs) ── */}
          <motion.path strokeWidth="1.9" {...legAnim(
            "M 62 64 L 42 58 L 24 50", "M 62 64 L 42 54 L 24 46", 0)} />
          <motion.path strokeWidth="1.9" {...legAnim(
            "M 60 72 L 38 70 L 18 68", "M 60 72 L 38 74 L 18 72", 0.75)} />
          <motion.path strokeWidth="1.9" {...legAnim(
            "M 60 80 L 38 80 L 18 84", "M 60 80 L 38 76 L 18 80", 0)} />
          <motion.path strokeWidth="1.9" {...legAnim(
            "M 62 88 L 42 92 L 24 100", "M 62 88 L 42 96 L 24 104", 0.75)} />

          {/* ── Right legs (4 pairs) ── */}
          <motion.path strokeWidth="1.9" {...legAnim(
            "M 98 64 L 118 58 L 136 50", "M 98 64 L 118 54 L 136 46", 0)} />
          <motion.path strokeWidth="1.9" {...legAnim(
            "M 100 72 L 122 70 L 142 68", "M 100 72 L 122 74 L 142 72", 0.75)} />
          <motion.path strokeWidth="1.9" {...legAnim(
            "M 100 80 L 122 80 L 142 84", "M 100 80 L 122 76 L 142 80", 0)} />
          <motion.path strokeWidth="1.9" {...legAnim(
            "M 98 88 L 118 92 L 136 100", "M 98 88 L 118 96 L 136 104", 0.75)} />

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
