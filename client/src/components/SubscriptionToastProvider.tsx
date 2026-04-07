import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  vip: "VIP",
  pro: "PRO",
  business: "Business",
  api: "API",
};

const TIER_COLORS: Record<string, { color: string; glow: string }> = {
  vip:      { color: "#d4a843", glow: "rgba(212,168,67,0.18)" },
  pro:      { color: "#818cf8", glow: "rgba(129,140,248,0.18)" },
  business: { color: "#34d399", glow: "rgba(52,211,153,0.18)" },
  api:      { color: "#f472b6", glow: "rgba(244,114,182,0.18)" },
};

type ActivityItem = { tier: string; createdAt: string };
type ToastItem    = { id: string; tier: string; createdAt: string };
type ToastConfig  = { enabled: boolean; pollIntervalSec: number; dismissAfterSec: number; maxVisible: number };

const DEFAULT_CFG: ToastConfig = { enabled: true, pollIntervalSec: 30, dismissAfterSec: 6, maxVisible: 3 };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function Toast({
  item,
  dismissAfterSec,
  onRemove,
}: {
  item: ToastItem;
  dismissAfterSec: number;
  onRemove: () => void;
}) {
  const cfg = TIER_COLORS[item.tier] ?? TIER_COLORS.vip;
  const label = TIER_LABELS[item.tier] ?? item.tier;

  useEffect(() => {
    const t = setTimeout(onRemove, dismissAfterSec * 1000);
    return () => clearTimeout(t);
  }, [onRemove, dismissAfterSec]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.94 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      onClick={onRemove}
      className="relative flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl cursor-pointer select-none"
      style={{
        background: "rgba(12,12,14,0.92)",
        border: `1px solid rgba(255,255,255,0.09)`,
        backdropFilter: "blur(16px)",
        boxShadow: `0 0 0 1px ${cfg.glow}, 0 8px 32px rgba(0,0,0,0.5)`,
        minWidth: 230,
        maxWidth: 280,
      }}
    >
      <div
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
        style={{
          background: cfg.glow,
          border: `1px solid ${cfg.color}30`,
        }}
      >
        <Sparkles className="w-3.5 h-3.5" style={{ color: cfg.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white leading-tight">
          Nouveau membre{" "}
          <span style={{ color: cfg.color }}>{label}</span>
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
          discreen.site · {timeAgo(item.createdAt)}
        </p>
      </div>

      <div
        className="shrink-0 w-1.5 h-6 rounded-full ml-1"
        style={{ background: cfg.color, opacity: 0.7 }}
      />
    </motion.div>
  );
}

export default function SubscriptionToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [config, setConfig] = useState<ToastConfig>(DEFAULT_CFG);
  const seenRef = useRef<Set<string>>(new Set());
  const firstFetchRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/settings/toast")
      .then(r => r.ok ? r.json() : DEFAULT_CFG)
      .then(setConfig)
      .catch(() => setConfig(DEFAULT_CFG));
  }, []);

  useEffect(() => {
    if (!config.enabled) { setToasts([]); return; }

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
          setToasts(prev => [...prev, ...newToasts].slice(-config.maxVisible));
        }
      } catch {}
    }

    fetchActivity();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchActivity, config.pollIntervalSec * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [config.enabled, config.pollIntervalSec, config.maxVisible]);

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  if (!config.enabled) return null;

  return (
    <div className="fixed bottom-6 left-5 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast item={t} dismissAfterSec={config.dismissAfterSec} onRemove={() => removeToast(t.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
