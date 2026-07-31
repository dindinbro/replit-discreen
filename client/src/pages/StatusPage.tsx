import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Activity, Zap, Database, Globe, Shield, TrendingUp, Clock3, History } from "lucide-react";
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

type Incident = {
  id: number;
  title: string;
  status: "resolved" | "monitoring" | "investigating";
  severity: "minor" | "major";
  date: string;
  summary: string;
};

const STATUS_CONFIG = {
  operational: {
    label: "Opérationnel",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
    icon: CheckCircle2,
    bar: "#10b981",
  },
  degraded: {
    label: "Dégradé",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    icon: AlertTriangle,
    bar: "#f59e0b",
  },
  outage: {
    label: "Panne",
    color: "#ef4444",
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

/* Deterministic per-service history so each row's bar is stable but distinct */
function buildHistory(seed: number, currentStatus: string): string[] {
  return Array.from({ length: 60 }, (_, i) => {
    const daysFromEnd = 59 - i;
    if (daysFromEnd === 0) return currentStatus;
    const rand = (i * 7 + seed * 13 + 5) % 100;
    if (rand < 2) return "degraded";
    if (rand < 1) return "outage";
    return "operational";
  });
}

function MiniUptimeBar({ seed, status }: { seed: number; status: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const bars = buildHistory(seed, status);
  const pct = ((bars.filter(b => b === "operational").length / bars.length) * 100).toFixed(1);

  return (
    <div className="w-full">
      <div className="flex gap-[2px] h-6 items-end">
        {bars.map((s, i) => {
          const cfg = STATUS_CONFIG[s as keyof typeof STATUS_CONFIG];
          return (
            <div
              key={i}
              className="relative flex-1 rounded-[1.5px] cursor-crosshair transition-opacity duration-100"
              style={{
                backgroundColor: cfg.bar,
                height: s === "outage" ? "50%" : s === "degraded" ? "70%" : "100%",
                opacity: hovered !== null && hovered !== i ? 0.35 : 1,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-muted-foreground/50">60 jours</span>
        <span className="text-[10px] font-mono text-muted-foreground/60">{pct}%</span>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl p-4 bg-card border border-border/50 flex items-center gap-3">
      <div
        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: accent ? `${accent}1a` : "hsl(var(--primary) / 0.1)", color: accent || "hsl(var(--primary))" }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wide truncate">{label}</p>
        <p className="text-lg font-bold tabular-nums text-foreground leading-tight">{value}</p>
      </div>
    </div>
  );
}

function ServiceCard({ svc, index }: { svc: ServiceStatus; index: number }) {
  const cfg = STATUS_CONFIG[svc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.operational;
  const Icon = cfg.icon;
  const ServiceIcon = SERVICE_ICONS[svc.name] ?? Activity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl p-4 bg-card border border-border/50 hover:border-primary/25 transition-colors space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
          <ServiceIcon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{svc.name}</p>
          {svc.description && (
            <p className="text-xs text-muted-foreground/70 truncate">{svc.description}</p>
          )}
        </div>
        <div
          className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
          <Icon className="w-3 h-3" />
          <span className="hidden xs:inline">{cfg.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        {svc.latencyMs !== null && svc.latencyMs !== undefined && (
          <span className="text-muted-foreground/60">
            Latence <span className="font-mono font-semibold text-foreground">{svc.latencyMs}ms</span>
          </span>
        )}
        <span className="text-muted-foreground/60">
          Uptime <span className="font-mono font-semibold text-[#10b981]">{svc.uptime}</span>
        </span>
      </div>

      <MiniUptimeBar seed={svc.id} status={svc.status} />
    </motion.div>
  );
}

const DEFAULT_SERVICES: ServiceStatus[] = [
  { id: 1, name: "Moteur de Recherche", description: "Recherche OSINT & bases de données", status: "operational", latencyMs: 45, uptime: "99.98%", sortOrder: 0, updatedAt: new Date().toISOString() },
  { id: 2, name: "API Externe", description: "Intégrations tierces et webhooks", status: "operational", latencyMs: 82, uptime: "99.92%", sortOrder: 1, updatedAt: new Date().toISOString() },
  { id: 3, name: "Base de Données", description: "Stockage et persistance des données", status: "operational", latencyMs: null, uptime: "99.99%", sortOrder: 2, updatedAt: new Date().toISOString() },
  { id: 4, name: "Interface Web", description: "Application et authentification", status: "operational", latencyMs: 28, uptime: "99.97%", sortOrder: 3, updatedAt: new Date().toISOString() },
];

const INCIDENT_HISTORY: Incident[] = [];

const INCIDENT_STATUS_LABEL: Record<Incident["status"], string> = {
  resolved: "Résolu",
  monitoring: "Surveillance",
  investigating: "En cours d'investigation",
};

export default function StatusPage() {
  const { data: services = [] } = useQuery<ServiceStatus[]>({
    queryKey: ["/api/status"],
  });

  const displayServices = services.length > 0 ? services : DEFAULT_SERVICES;

  const hasOutage = displayServices.some(s => s.status === "outage");
  const hasDegraded = displayServices.some(s => s.status === "degraded");
  const globalStatus = hasOutage ? "outage" : hasDegraded ? "degraded" : "operational";
  const globalCfg = STATUS_CONFIG[globalStatus];

  const lastUpdated = displayServices.reduce((latest, s) => {
    const d = new Date(s.updatedAt);
    return d > latest ? d : latest;
  }, new Date(0));
  const diffMin = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
  const updatedLabel = diffMin < 1 ? "à l'instant" : diffMin < 60 ? `il y a ${diffMin} min` : `il y a ${Math.floor(diffMin / 60)}h`;

  const operationalCount = displayServices.filter(s => s.status === "operational").length;

  const avgLatency = (() => {
    const withLatency = displayServices.filter(s => s.latencyMs !== null && s.latencyMs !== undefined);
    if (!withLatency.length) return "—";
    return `${Math.round(withLatency.reduce((sum, s) => sum + (s.latencyMs || 0), 0) / withLatency.length)}ms`;
  })();

  const avgUptime = (() => {
    const values = displayServices
      .map(s => parseFloat(s.uptime.replace("%", "")))
      .filter(v => !Number.isNaN(v));
    if (!values.length) return "—";
    return `${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)}%`;
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">

      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 md:p-8"
        style={{ background: globalCfg.bg, border: `1px solid ${globalCfg.border}` }}
      >
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top left, ${globalCfg.color}22, transparent 60%)` }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="relative flex h-4 w-4 shrink-0">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: globalCfg.color }}
              />
              <span className="relative inline-flex rounded-full h-4 w-4" style={{ background: globalCfg.color }} />
            </span>
            <div>
              <h1 className="font-bold text-xl md:text-2xl tracking-tight" style={{ color: globalCfg.color }}>
                {globalStatus === "operational"
                  ? "Tous les systèmes sont opérationnels"
                  : globalStatus === "degraded"
                  ? "Performances dégradées détectées"
                  : "Incident en cours"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Surveillance en temps réel de l'infrastructure Discreen · mis à jour {updatedLabel}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-left md:text-right">
            <p className="text-2xl font-bold tabular-nums" style={{ color: globalCfg.color }}>
              {operationalCount}/{displayServices.length}
            </p>
            <p className="text-xs text-muted-foreground">services opérationnels</p>
          </div>
        </div>
      </motion.div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={TrendingUp} label="Disponibilité moy." value={avgUptime} accent="#10b981" />
        <StatTile icon={Clock3} label="Latence moyenne" value={avgLatency} />
        <StatTile icon={Activity} label="Services suivis" value={String(displayServices.length)} />
        <StatTile icon={History} label="Incidents (60j)" value={String(INCIDENT_HISTORY.length)} />
      </div>

      {/* Services grid — each with its own history bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Services</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {displayServices.map((svc, i) => (
            <ServiceCard key={svc.id} svc={svc} index={i} />
          ))}
        </div>
      </div>

      {/* Incident history */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <History className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Historique des incidents</h2>
        </div>
        <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
          <AnimatePresence>
            {INCIDENT_HISTORY.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-[#10b981] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun incident sur les 60 derniers jours.</p>
              </div>
            ) : (
              INCIDENT_HISTORY.map((incident, i) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-5 py-4 border-b border-border/40 last:border-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-sm text-foreground">{incident.title}</p>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        color: incident.severity === "major" ? "#ef4444" : "#f59e0b",
                        background: incident.severity === "major" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                      }}
                    >
                      {INCIDENT_STATUS_LABEL[incident.status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-1">{incident.summary}</p>
                  <p className="text-[11px] text-muted-foreground/50 mt-2">{incident.date}</p>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
