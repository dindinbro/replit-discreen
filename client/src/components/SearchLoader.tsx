import { motion } from "framer-motion";

export default function SearchLoader({ variant = "primary" }: { variant?: "primary" | "red" }) {
  const color   = variant === "red" ? "#ef4444" : "hsl(var(--primary))";
  const dim     = variant === "red" ? "#ef444433" : "hsl(var(--primary) / 0.2)";

  const inf = (dur: number, delay = 0) =>
    ({ duration: dur, repeat: Infinity, ease: "linear" as const, delay });

  const dots = [
    { cx: 80, cy: 38, delay: 0.0 },
    { cx: 112, cy: 58, delay: 0.3 },
    { cx: 118, cy: 95, delay: 0.9 },
    { cx: 55, cy: 115, delay: 1.5 },
    { cx: 38, cy: 72, delay: 0.6 },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6" data-testid="search-loader">
      <svg viewBox="0 0 160 160" className="w-36 h-36" fill="none">
        {/* Outer ring */}
        <circle cx="80" cy="80" r="70" stroke={color} strokeWidth="1" strokeOpacity="0.25" />
        {/* Mid ring */}
        <circle cx="80" cy="80" r="48" stroke={color} strokeWidth="0.8" strokeOpacity="0.18" />
        {/* Inner ring */}
        <circle cx="80" cy="80" r="26" stroke={color} strokeWidth="0.8" strokeOpacity="0.15" />

        {/* Cross-hair lines */}
        <line x1="80" y1="8" x2="80" y2="22"  stroke={color} strokeWidth="1" strokeOpacity="0.35" />
        <line x1="80" y1="138" x2="80" y2="152" stroke={color} strokeWidth="1" strokeOpacity="0.35" />
        <line x1="8" y1="80" x2="22" y2="80"  stroke={color} strokeWidth="1" strokeOpacity="0.35" />
        <line x1="138" y1="80" x2="152" y2="80" stroke={color} strokeWidth="1" strokeOpacity="0.35" />

        {/* Rotating sweep */}
        <motion.g
          style={{ transformOrigin: "80px 80px" }}
          animate={{ rotate: 360 }}
          transition={inf(3)}
        >
          {/* Sweep fill (conic-like wedge) */}
          <path
            d="M 80 80 L 80 10 A 70 70 0 0 1 130 55 Z"
            fill={`url(#sweepGrad)`}
            opacity="0.45"
          />
          {/* Leading edge line */}
          <line x1="80" y1="80" x2="80" y2="10" stroke={color} strokeWidth="1.5" strokeOpacity="0.9" />
          <defs>
            <radialGradient id="sweepGrad" cx="80" cy="80" r="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          </defs>
        </motion.g>

        {/* Ping dots that appear and fade */}
        {dots.map((d, i) => (
          <motion.circle
            key={i}
            cx={d.cx} cy={d.cy} r="3"
            fill={color}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 0] }}
            transition={{ ...inf(3, d.delay), ease: "easeOut" }}
          />
        ))}

        {/* Center dot */}
        <circle cx="80" cy="80" r="4" fill={color} />
        <motion.circle
          cx="80" cy="80" r="4"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          animate={{ r: [4, 18, 4], opacity: [0.8, 0, 0.8] }}
          transition={inf(2)}
        />
      </svg>

      <div className="flex flex-col items-center space-y-2">
        <motion.p
          className="font-medium text-sm"
          style={{ color }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Analyse des bases de données...
        </motion.p>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: color }}
              animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
