import { motion } from "framer-motion";

const dataLines = [
  "email:j*****@mail.com",
  "ip:192.168.*.***",
  "user:d4rk_***",
  "phone:+33 6 ** ** **",
  "pass:••••••••",
  "iban:FR76 **** ****",
  "id:██████████",
  "src:leak_2024.txt",
];

function ScanLine({ delay, text }: { delay: number; text: string }) {
  return (
    <motion.div
      className="font-mono text-xs text-primary/60 whitespace-nowrap overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: [0, 0.8, 0.4, 0], x: [-20, 0, 0, 20] }}
      transition={{
        duration: 2.5,
        delay,
        repeat: Infinity,
        repeatDelay: 1,
        ease: "easeInOut",
      }}
    >
      {text}
    </motion.div>
  );
}

export default function SearchLoader({ variant = "primary" }: { variant?: "primary" | "red" }) {
  const color = variant === "red" ? "text-red-500" : "text-primary";
  const bgColor = variant === "red" ? "bg-red-500" : "bg-primary";

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6" data-testid="search-loader">
      <div className="relative w-48 h-32">
        <motion.div
          className={`absolute left-1/2 top-0 w-px h-full ${bgColor}/30`}
          style={{ marginLeft: -0.5 }}
          animate={{ scaleY: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5 select-none">
          {dataLines.map((line, i) => (
            <ScanLine key={i} delay={i * 0.3} text={line} />
          ))}
        </div>

        <motion.div
          className={`absolute left-0 right-0 h-px ${bgColor}/50`}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className={`w-full h-4 ${bgColor}/10 blur-md -translate-y-1/2`} />
        </motion.div>

        <svg
          viewBox="0 0 64 64"
          className={`absolute -left-4 -top-4 w-12 h-12 ${color}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <motion.g
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ellipse cx="32" cy="24" rx="10" ry="10" />
            <circle cx="28" cy="22" r="2" fill="currentColor" />
            <circle cx="36" cy="22" r="2" fill="currentColor" />
            <path d="M28 28 Q32 32 36 28" strokeLinecap="round" />

            <path d="M22 24 L16 20" strokeLinecap="round" />
            <path d="M42 24 L48 20" strokeLinecap="round" />
            <motion.path
              d="M16 20 L14 16"
              strokeLinecap="round"
              animate={{ rotate: [-10, 10, -10] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              style={{ transformOrigin: "16px 20px" }}
            />
            <motion.path
              d="M48 20 L50 16"
              strokeLinecap="round"
              animate={{ rotate: [10, -10, 10] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              style={{ transformOrigin: "48px 20px" }}
            />

            <rect x="20" y="36" rx="2" width="24" height="14" />
            <motion.line
              x1="24" y1="40" x2="40" y2="40"
              strokeLinecap="round"
              animate={{ x2: [28, 40, 28] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <motion.line
              x1="24" y1="44" x2="36" y2="44"
              strokeLinecap="round"
              animate={{ x2: [24, 36, 24] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
            />

            <path d="M24 50 L24 56" strokeLinecap="round" />
            <path d="M40 50 L40 56" strokeLinecap="round" />
          </motion.g>
        </svg>

        <motion.div
          className={`absolute -right-2 -bottom-2 ${color} opacity-60`}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="20" cy="20" r="16" strokeDasharray="8 4" />
            <circle cx="20" cy="20" r="10" strokeDasharray="4 6" />
            <line x1="20" y1="4" x2="20" y2="12" strokeLinecap="round" />
          </svg>
        </motion.div>
      </div>

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
