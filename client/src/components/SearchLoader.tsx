import { motion } from "framer-motion";

export default function SearchLoader({ variant = "primary" }: { variant?: "primary" | "red" }) {
  const color = variant === "red" ? "text-red-500" : "text-primary";
  const bgColor = variant === "red" ? "bg-red-500" : "bg-primary";

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6" data-testid="search-loader">
      <svg
        viewBox="0 0 64 64"
        className={`w-24 h-24 ${color}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse cx="32" cy="20" rx="12" ry="12" />
          <circle cx="27" cy="18" r="2.5" fill="currentColor" />
          <circle cx="37" cy="18" r="2.5" fill="currentColor" />
          <path d="M27 25 Q32 29 37 25" strokeLinecap="round" />

          <path d="M20 20 L12 15" strokeLinecap="round" />
          <path d="M44 20 L52 15" strokeLinecap="round" />
          <motion.path
            d="M12 15 L9 10"
            strokeLinecap="round"
            animate={{ rotate: [-15, 15, -15] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            style={{ transformOrigin: "12px 15px" }}
          />
          <motion.path
            d="M52 15 L55 10"
            strokeLinecap="round"
            animate={{ rotate: [15, -15, 15] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            style={{ transformOrigin: "52px 15px" }}
          />

          <rect x="18" y="34" rx="3" width="28" height="16" />
          <motion.line
            x1="23" y1="39" x2="41" y2="39"
            strokeLinecap="round"
            animate={{ x2: [27, 41, 27] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <motion.line
            x1="23" y1="44" x2="37" y2="44"
            strokeLinecap="round"
            animate={{ x2: [23, 37, 23] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
          />

          <path d="M24 50 L24 58" strokeLinecap="round" />
          <path d="M40 50 L40 58" strokeLinecap="round" />
        </motion.g>
      </svg>

      <div className="flex flex-col items-center space-y-2">
        <motion.p
          className={`${color} font-medium text-sm`}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Analyse des bases de donnees...
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
