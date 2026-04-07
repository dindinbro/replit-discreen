import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  vip: "VIP",
  pro: "PRO",
  business: "Business",
  api: "API",
};

const TIER_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  vip: { color: "#d4a843", bg: "rgba(212,168,67,0.12)", border: "rgba(212,168,67,0.3)" },
  pro: { color: "#818cf8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.3)" },
  business: { color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)" },
  api: { color: "#f472b6", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.3)" },
};

type ActivityItem = {
  tier: string;
  createdAt: string;
};

type ToastItem = {
  id: string;
  tier: string;
  createdAt: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

function Toast({ item, onRemove }: { item: ToastItem; onRemove: () => void }) {
  const cfg = TIER_COLORS[item.tier] ?? TIER_COLORS.vip;
  const label = TIER_LABELS[item.tier] ?? item.tier;

  useEffect(() => {
    const t = setTimeout(onRemove, 6000);
    return () => clearTimeout(t);
  }, [onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -32, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24, scale: 0.95 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl cursor-pointer select-none max-w-xs"
      style={{
        background: "hsl(var(--card))",
        border: `1px solid ${cfg.border}`,
        backdropFilter: "blur(12px)",
      }}
      onClick={onRemove}
    >
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        <Sparkles className="w-4 h-4" style={{ color: cfg.color }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">
          Nouvel abonné{" "}
          <span style={{ color: cfg.color }}>{label}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(item.createdAt)}</p>
      </div>
    </motion.div>
  );
}

export default function SubscriptionToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const firstFetchRef = useRef(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch("/api/status/recent-activity");
        if (!res.ok) return;
        const data: ActivityItem[] = await res.json();

        if (firstFetchRef.current) {
          firstFetchRef.current = false;
          data.forEach(item => seenRef.current.add(`${item.tier}-${item.createdAt}`));
          return;
        }

        const newItems = data.filter(item => {
          const key = `${item.tier}-${item.createdAt}`;
          if (seenRef.current.has(key)) return false;
          seenRef.current.add(key);
          return true;
        });

        if (newItems.length > 0) {
          const newToasts: ToastItem[] = newItems.map(item => ({
            id: `${item.tier}-${item.createdAt}-${Math.random()}`,
            tier: item.tier,
            createdAt: item.createdAt,
          }));
          setToasts(prev => [...prev, ...newToasts].slice(-3));
        }
      } catch {}
    }

    fetchActivity();
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="fixed bottom-6 left-5 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast item={t} onRemove={() => removeToast(t.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
