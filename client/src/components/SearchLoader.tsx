import { motion } from "framer-motion";

export default function SearchLoader({ variant = "primary" }: { variant?: "primary" | "red" }) {
  const color = variant === "red" ? "text-red-500" : "text-primary";
  const bgColor = variant === "red" ? "bg-red-500" : "bg-primary";
  const stroke = "currentColor";

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6" data-testid="search-loader">
      <svg
        viewBox="0 0 80 90"
        className={`w-28 h-28 ${color}`}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* ── Web thread ── */}
        <motion.line
          x1="40" y1="0" x2="40" y2="22"
          animate={{ y2: [22, 25, 22] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ── Spider body (bounces on thread) ── */}
        <motion.g
          animate={{ y: [0, 3, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Cephalothorax */}
          <ellipse cx="40" cy="33" rx="9" ry="8" />

          {/* Abdomen */}
          <ellipse cx="40" cy="51" rx="11.5" ry="12.5" />

          {/* Abdomen pattern line */}
          <line x1="40" y1="39" x2="40" y2="63" strokeWidth="0.8" strokeOpacity="0.4" />
          <line x1="30" y1="47" x2="50" y2="47" strokeWidth="0.8" strokeOpacity="0.3" />
          <line x1="31" y1="54" x2="49" y2="54" strokeWidth="0.8" strokeOpacity="0.3" />

          {/* Eyes — 4 main eyes */}
          <circle cx="36" cy="31" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="44" cy="31" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="38.2" cy="35.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="41.8" cy="35.5" r="1.2" fill="currentColor" stroke="none" />

          {/* ── Left legs ── */}
          {/* L1 — top front */}
          <motion.path
            d="M 33 27 L 20 18 L 10 14"
            animate={{ d: ["M 33 27 L 20 18 L 10 14", "M 33 27 L 20 16 L 10 12", "M 33 27 L 20 18 L 10 14"] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* L2 — front */}
          <motion.path
            d="M 32 31 L 18 27 L 7 25"
            animate={{ d: ["M 32 31 L 18 27 L 7 25", "M 32 31 L 18 25 L 7 23", "M 32 31 L 18 27 L 7 25"] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
          />
          {/* L3 — back */}
          <motion.path
            d="M 32 37 L 18 39 L 7 43"
            animate={{ d: ["M 32 37 L 18 39 L 7 43", "M 32 37 L 18 41 L 7 46", "M 32 37 L 18 39 L 7 43"] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
          {/* L4 — bottom back */}
          <motion.path
            d="M 33 40 L 21 50 L 13 57"
            animate={{ d: ["M 33 40 L 21 50 L 13 57", "M 33 40 L 21 52 L 13 60", "M 33 40 L 21 50 L 13 57"] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.45 }}
          />

          {/* ── Right legs (mirrored) ── */}
          {/* R1 */}
          <motion.path
            d="M 47 27 L 60 18 L 70 14"
            animate={{ d: ["M 47 27 L 60 18 L 70 14", "M 47 27 L 60 16 L 70 12", "M 47 27 L 60 18 L 70 14"] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* R2 */}
          <motion.path
            d="M 48 31 L 62 27 L 73 25"
            animate={{ d: ["M 48 31 L 62 27 L 73 25", "M 48 31 L 62 25 L 73 23", "M 48 31 L 62 27 L 73 25"] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
          />
          {/* R3 */}
          <motion.path
            d="M 48 37 L 62 39 L 73 43"
            animate={{ d: ["M 48 37 L 62 39 L 73 43", "M 48 37 L 62 41 L 73 46", "M 48 37 L 62 39 L 73 43"] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
          {/* R4 */}
          <motion.path
            d="M 47 40 L 59 50 L 67 57"
            animate={{ d: ["M 47 40 L 59 50 L 67 57", "M 47 40 L 59 52 L 67 60", "M 47 40 L 59 50 L 67 57"] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.45 }}
          />
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
