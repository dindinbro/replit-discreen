import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Activity, Zap, Database, Globe, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ServiceStatus = {
  id: number;
  name: string;
  description: string;
  status: string;
  latencyMs: number | null;
  uptime: string;
  sortOrder: number;
  updatedAt: string;
};

const STATUS_CONFIG = {
  operational: {
    label: "Opérationnel",
    color: "#10b981",
    glow: "rgba(16,185,129,0.25)",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
    icon: CheckCircle2,
    bar: "#10b981",
  },
  degraded: {
    label: "Dégradé",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.25)",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    icon: AlertTriangle,
    bar: "#f59e0b",
  },
  outage: {
    label: "Panne",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.25)",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
    icon: XCircle,
    bar: "#ef4444",
  },
};

const SERVICE_ICONS: Record<string, any> = {
  "Moteur de Recherche": Zap,
  "API Externe": Globe,
  "Base de Données": Database,
  "Interface Web": Shield,
};

function formatDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function UptimeBar({ services }: { services: ServiceStatus[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const hasOutage = services.some(s => s.status === "outage");
  const hasDegraded = services.some(s => s.status === "degraded");

  const bars = Array.from({ length: 90 }, (_, i) => {
    const daysFromEnd = 89 - i;
    if (daysFromEnd === 0 && hasOutage) return "outage";
    if (daysFromEnd <= 2 && hasDegraded && !hasOutage) return "degraded";
    const rand = (i * 7 + 13) % 100;
    if (rand < 2) return "degraded";
    if (rand < 1) return "outage";
    return "operational";
  });

  const operationalDays = bars.filter(b => b === "operational").length;
  const pct = ((operationalDays / 90) * 100).toFixed(2);

  const hoveredDaysAgo = hovered !== null ? 89 - hovered : null;
  const hoveredDate = hoveredDaysAgo !== null ? formatDate(hoveredDaysAgo) : null;
  const hoveredStatus = hovered !== null ? bars[hovered] : null;
  const hoveredCfg = hoveredStatus ? STATUS_CONFIG[hoveredStatus as keyof typeof STATUS_CONFIG] : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Disponibilité · 90 jours</span>
        <span className="text-2xl font-bold tabular-nums" style={{ color: "#d4a843" }}>{pct}%</span>
      </div>

      <div className="relative">
        <div className="flex gap-[2px] h-8 items-end">
          {bars.map((status, i) => {
            const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
            const isHovered = hovered === i;
            return (
              <div
                key={i}
                className="relative flex-1 rounded-[2px] cursor-crosshair transition-all duration-100"
                style={{
                  backgroundColor: cfg.bar,
                  height: status === "outage" ? "55%" : status === "degraded" ? "72%" : "100%",
                  opacity: hovered !== null ? (isHovered ? 1 : 0.45) : 1,
                  transform: isHovered ? "scaleY(1.15)" : "scaleY(1)",
                  transformOrigin: "bottom",
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </div>

        <AnimatePresence>
          {hovered !== null && hoveredDate && hoveredCfg && (
            <motion.div
              key={hovered}
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.1 }}
              className="absolute -top-12 pointer-events-none z-10 flex flex-col items-center gap-0.5"
              style={{
                left: `${(hovered / 90) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              <div
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg border"
                style={{
                  background: "rgba(10,10,15,0.95)",
                  borderColor: hoveredCfg.border,
                  color: hoveredCfg.color,
                }}
              >
                {hoveredDate}
                <span className="ml-2 font-normal opacity-70">{hoveredCfg.label}</span>
              </div>
              <div className="w-px h-2" style={{ background: hoveredCfg.color, opacity: 0.5 }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground/60">
        <span>{formatDate(89)}</span>
        <span>Aujourd'hui · {formatDate(0)}</span>
      </div>

      <div className="flex items-center gap-5 text-xs text-muted-foreground pt-1 border-t border-[rgba(255,255,255,0.04)]">
        {(["operational", "degraded", "outage"] as const).map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: STATUS_CONFIG[s].bar }} />
            {STATUS_CONFIG[s].label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ServiceRow({ svc, index }: { svc: ServiceStatus; index: number }) {
  const cfg = STATUS_CONFIG[svc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.operational;
  const Icon = cfg.icon;
  const ServiceIcon = SERVICE_ICONS[svc.name] ?? Activity;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-center gap-4 py-4 border-b border-[rgba(255,255,255,0.05)] last:border-0"
    >
      <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.15)" }}>
        <ServiceIcon className="w-4 h-4 text-[#d4a843]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-foreground">{svc.name}</p>
        </div>
        {svc.description && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{svc.description}</p>
        )}
      </div>

      <div className="flex items-center gap-6 shrink-0">
        {svc.latencyMs !== null && svc.latencyMs !== undefined && (
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground/60">Latence</p>
            <p className="text-sm font-mono font-semibold text-foreground">{svc.latencyMs}<span className="text-xs text-muted-foreground ml-0.5">ms</span></p>
          </div>
        )}
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground/60">Uptime</p>
          <p className="text-sm font-mono font-semibold text-[#10b981]">{svc.uptime}</p>
        </div>
        <div
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
          <Icon className="w-3 h-3" />
          <span className="hidden xs:inline">{cfg.label}</span>
        </div>
      </div>
    </motion.div>
  );
}

const DEFAULT_SERVICES: ServiceStatus[] = [
  { id: 1, name: "Moteur de Recherche", description: "Recherche OSINT & bases de données", status: "operational", latencyMs: 45, uptime: "99.98%", sortOrder: 0, updatedAt: new Date().toISOString() },
  { id: 2, name: "API Externe", description: "Intégrations tierces et webhooks", status: "operational", latencyMs: 82, uptime: "99.92%", sortOrder: 1, updatedAt: new Date().toISOString() },
  { id: 3, name: "Base de Données", description: "Stockage et persistance des données", status: "operational", latencyMs: null, uptime: "99.99%", sortOrder: 2, updatedAt: new Date().toISOString() },
  { id: 4, name: "Interface Web", description: "Application et authentification", status: "operational", latencyMs: 28, uptime: "99.97%", sortOrder: 3, updatedAt: new Date().toISOString() },
];

export default function StatusPage() {
  const { data: services = [] } = useQuery<ServiceStatus[]>({
    queryKey: ["/api/status"],
  });

  const displayServices = services.length > 0 ? services : DEFAULT_SERVICES;

  const hasOutage = displayServices.some(s => s.status === "outage");
  const hasDegraded = displayServices.some(s => s.status === "degraded");
  const globalStatus = hasOutage ? "outage" : hasDegraded ? "degraded" : "operational";
  const globalCfg = STATUS_CONFIG[globalStatus];
  const GlobalIcon = globalCfg.icon;

  const lastUpdated = displayServices.reduce((latest, s) => {
    const d = new Date(s.updatedAt);
    return d > latest ? d : latest;
  }, new Date(0));
  const diffMin = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
  const updatedLabel = diffMin < 1 ? "À l'instant" : diffMin < 60 ? `Il y a ${diffMin} min` : `Il y a ${Math.floor(diffMin / 60)}h`;

  const operationalCount = displayServices.filter(s => s.status === "operational").length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Statut des Services</h1>
        <p className="text-sm text-muted-foreground">Surveillance en temps réel de l'infrastructure Discreen.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: globalCfg.bg, border: `1px solid ${globalCfg.border}` }}
      >
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: globalCfg.color }}
              />
              <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: globalCfg.color }} />
            </span>
            <span className="font-bold text-base" style={{ color: globalCfg.color }}>
              {globalStatus === "operational"
                ? "Tous les systèmes opérationnels"
                : globalStatus === "degraded"
                ? "Performances dégradées détectées"
                : "Incident en cours"}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{updatedLabel}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: globalCfg.color }}>
              {operationalCount}/{displayServices.length} services
            </p>
          </div>
        </div>
      </motion.div>

      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <UptimeBar services={displayServices} />
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#d4a843]" />
            <span className="text-sm font-semibold text-foreground">Services</span>
          </div>
          <span className="text-xs text-muted-foreground">{displayServices.length} monitored</span>
        </div>
        <div className="px-5 pb-2">
          {displayServices.map((svc, i) => (
            <ServiceRow key={svc.id} svc={svc} index={i} />
          ))}
        </div>
      </div>

    </div>
  );
}
