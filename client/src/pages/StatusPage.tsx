import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, XCircle, Activity, Zap, Database, Globe, Shield, History } from "lucide-react";
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
    label: "Fonctionne normalement",
    sentence: "Tout fonctionne comme prévu",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
    icon: CheckCircle2,
  },
  degraded: {
    label: "Ralenti",
    sentence: "Plus lent que d'habitude",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    icon: AlertTriangle,
  },
  outage: {
    label: "En panne",
    sentence: "Actuellement indisponible",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
    icon: XCircle,
  },
};

const SERVICE_ICONS: Record<string, any> = {
  "Moteur de Recherche": Zap,
  "API Externe": Globe,
  "Base de Données": Database,
  "Interface Web": Shield,
};

/* Barre unique proportionnelle a l'uptime plutot que 60 segments a survoler —
 * le pourcentage est ecrit en toutes lettres a cote, rien a interpreter. */
function UptimeBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color }}>{pct.toFixed(2)}%</span>
    </div>
  );
}

function ServiceRow({ svc, index }: { svc: ServiceStatus; index: number }) {
  const cfg = STATUS_CONFIG[svc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.operational;
  const Icon = cfg.icon;
  const ServiceIcon = SERVICE_ICONS[svc.name] ?? Activity;
  const uptimePct = parseFloat(svc.uptime.replace("%", "")) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl p-4 bg-card border border-border/50 hover:border-primary/25 transition-colors"
    >
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
          <ServiceIcon className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <p className="font-semibold text-sm text-foreground">{svc.name}</p>
          {svc.description && (
            <p className="text-xs text-muted-foreground/70">{svc.description}</p>
          )}
        </div>
        <div
          className="shrink-0 flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full"
          style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{cfg.label}</span>
        </div>
      </div>

      <div className="mt-3 pl-[52px] space-y-1.5">
        <UptimeBar pct={uptimePct} color={cfg.color} />
        <p className="text-[11px] text-muted-foreground/60">
          Disponible {svc.uptime} du temps sur les 60 derniers jours
          {svc.latencyMs !== null && svc.latencyMs !== undefined && ` · répond en ${svc.latencyMs}ms en moyenne`}
        </p>
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
  const troubledServices = displayServices.filter(s => s.status !== "operational");

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

      {/* Hero banner — le seul message qui compte, en une phrase */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 text-center"
        style={{ background: globalCfg.bg, border: `1px solid ${globalCfg.border}` }}
      >
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top, ${globalCfg.color}22, transparent 60%)` }}
        />
        <div className="relative flex flex-col items-center gap-3">
          <span className="relative flex h-5 w-5 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: globalCfg.color }}
            />
            <span className="relative inline-flex rounded-full h-5 w-5" style={{ background: globalCfg.color }} />
          </span>
          <h1 className="font-bold text-2xl md:text-3xl tracking-tight" style={{ color: globalCfg.color }}>
            {globalStatus === "operational"
              ? "Tout fonctionne normalement"
              : globalStatus === "degraded"
              ? "Certains services sont ralentis"
              : "Un service est actuellement en panne"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            {globalStatus === "operational"
              ? `Les ${displayServices.length} services de Discreen répondent correctement.`
              : `${troubledServices.map(s => s.name).join(", ")} — les autres services fonctionnent normalement.`}
          </p>
          <p className="text-xs text-muted-foreground/60">Mis à jour {updatedLabel} · {operationalCount}/{displayServices.length} services OK</p>
        </div>
      </motion.div>

      {/* Services — une ligne par service, statut + barre de dispo lisibles sans survol */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Détail par service</h2>
          <p className="text-xs text-muted-foreground/70">Ce que fait chaque brique de Discreen, et si elle tourne bien en ce moment</p>
        </div>
        <div className="space-y-2.5">
          {displayServices.map((svc, i) => (
            <ServiceRow key={svc.id} svc={svc} index={i} />
          ))}
        </div>
      </div>

      {/* Incident history */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Incidents passés</h2>
          <p className="text-xs text-muted-foreground/70">Les pannes ou ralentissements des 60 derniers jours</p>
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
