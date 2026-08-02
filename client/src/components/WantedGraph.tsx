import { useState, useMemo } from "react";
import type { WantedProfile } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Phone, MapPin, Hash, MessageSquare, Fingerprint, CreditCard, Car, User, Link2 } from "lucide-react";
import { ReactFlow, Background, Controls, Handle, Position, type Node, type Edge, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/* ── champs groupes (chips) reutilisable pour tout affichage de fiche Wanted ── */
export function FieldGroup({ icon: Icon, label, values }: { icon: React.ElementType; label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label} <span className="text-muted-foreground/60">({values.length})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <Badge key={i} variant="secondary" className="font-normal text-xs">{v}</Badge>
        ))}
      </div>
    </div>
  );
}

export function wantedFieldValues(profile: WantedProfile, field: "emails" | "phones" | "addresses" | "ips" | "discordIds"): string[] {
  const legacy: Partial<Record<typeof field, string | null | undefined>> = {
    emails: profile.email, phones: profile.telephone,
    addresses: (profile as any).adresse, ips: profile.ip, discordIds: profile.discordId,
  };
  const arr = (profile as any)[field] as string[] | undefined;
  const values = arr?.length ? arr : legacy[field] ? [legacy[field] as string] : [];
  return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)));
}

export function wantedAllValues(profile: WantedProfile): string[] {
  return [
    ...wantedFieldValues(profile, "emails"),
    ...wantedFieldValues(profile, "phones"),
    ...wantedFieldValues(profile, "addresses"),
    ...wantedFieldValues(profile, "ips"),
    ...wantedFieldValues(profile, "discordIds"),
    profile.nir, profile.iban, profile.plaque,
  ].filter(Boolean).map(v => (v as string).trim().toLowerCase());
}

export function wantedProfileLabel(p: WantedProfile): string {
  return `${p.civilite || ""} ${p.prenom || ""} ${p.nom || ""}`.replace(/\s+/g, " ").trim() || p.pseudo || `Profil #${p.id}`;
}

/* ── Graphe relationnel ── */

type CategoryKey = "email" | "phone" | "address" | "ip" | "discord" | "nir" | "iban" | "plaque";

const CATEGORIES: Record<CategoryKey, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  email:   { label: "Email",      icon: Mail,         color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.4)" },
  phone:   { label: "Telephone",  icon: Phone,        color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.4)" },
  address: { label: "Adresse",    icon: MapPin,       color: "#fb923c", bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.4)" },
  ip:      { label: "IP",         icon: Hash,         color: "#22d3ee", bg: "rgba(34,211,238,0.12)",  border: "rgba(34,211,238,0.4)" },
  discord: { label: "Discord",    icon: MessageSquare, color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.4)" },
  nir:     { label: "NIR",        icon: Fingerprint,  color: "#f472b6", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.4)" },
  iban:    { label: "IBAN",       icon: CreditCard,   color: "#facc15", bg: "rgba(250,204,21,0.12)",  border: "rgba(250,204,21,0.4)" },
  plaque:  { label: "Plaque",     icon: Car,          color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.4)" },
};

type WantedNodeData = {
  label: string;
  kind: "center" | "value";
  category?: CategoryKey;
  shared?: { profileId: number; profileLabel: string }[];
  onSelectShared?: (profileId: number) => void;
};

function WantedGraphNode({ data }: NodeProps & { data: WantedNodeData }) {
  const isCenter = data.kind === "center";
  const isShared = !!data.shared?.length;
  const cat = data.category ? CATEGORIES[data.category] : undefined;
  const Icon = isCenter ? User : cat?.icon || Hash;

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border-2 shadow-md max-w-[220px] ${
        isCenter ? "px-4 py-2.5" : "px-3 py-2"
      } ${isShared ? "cursor-pointer" : ""}`}
      style={
        isCenter
          ? { background: "hsl(var(--primary))", borderColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
          : isShared
          ? { background: "rgba(245,158,11,0.18)", borderColor: "#f59e0b", color: "#fbbf24" }
          : { background: cat?.bg, borderColor: cat?.border, color: cat?.color }
      }
      onClick={() => { if (isShared && data.shared) data.onSelectShared?.(data.shared[0].profileId); }}
      title={isShared ? `Partage avec: ${data.shared!.map(s => s.profileLabel).join(", ")}` : undefined}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <div
        className={`shrink-0 flex items-center justify-center rounded-lg ${isCenter ? "w-7 h-7" : "w-6 h-6"}`}
        style={isCenter ? { background: "rgba(255,255,255,0.2)" } : { background: isShared ? "rgba(245,158,11,0.25)" : cat ? cat.border : undefined }}
      >
        <Icon className={isCenter ? "w-3.5 h-3.5" : "w-3 h-3"} />
      </div>
      <div className="min-w-0">
        {!isCenter && (
          <p className="text-[9px] uppercase tracking-wider font-semibold opacity-70 leading-none mb-0.5">
            {isShared ? "Partage" : cat?.label}
          </p>
        )}
        <p className={`truncate font-semibold ${isCenter ? "text-sm" : "text-xs"}`}>{data.label}</p>
      </div>
      {isShared && <Link2 className="w-3.5 h-3.5 shrink-0" />}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

const wantedNodeTypes = { wanted: WantedGraphNode };

function radialPositions(count: number, radius: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / Math.max(count, 1) - Math.PI / 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

export function buildWantedGraph(profile: WantedProfile, allProfiles: WantedProfile[], onSelectShared: (id: number) => void): { nodes: Node[]; edges: Edge[] } {
  type Branch = { value: string; category: CategoryKey };
  const branches: Branch[] = [
    ...wantedFieldValues(profile, "emails").map(value => ({ value, category: "email" as const })),
    ...wantedFieldValues(profile, "phones").map(value => ({ value, category: "phone" as const })),
    ...wantedFieldValues(profile, "addresses").map(value => ({ value, category: "address" as const })),
    ...wantedFieldValues(profile, "ips").map(value => ({ value, category: "ip" as const })),
    ...wantedFieldValues(profile, "discordIds").map(value => ({ value, category: "discord" as const })),
  ];
  if (profile.nir) branches.push({ value: profile.nir, category: "nir" });
  if (profile.iban) branches.push({ value: profile.iban, category: "iban" });
  if (profile.plaque) branches.push({ value: profile.plaque, category: "plaque" });

  // Radius scales up with node count so denser profiles don't overlap.
  const radius = Math.max(260, 130 + branches.length * 22);
  const positions = radialPositions(branches.length, radius);
  const nodes: Node[] = [
    { id: "center", type: "wanted", position: { x: 0, y: 0 }, draggable: false, data: { label: wantedProfileLabel(profile), kind: "center" } as WantedNodeData },
  ];
  const edges: Edge[] = [];

  branches.forEach((b, i) => {
    const norm = b.value.trim().toLowerCase();
    const sharedWith = allProfiles.filter(p => p.id !== profile.id && wantedAllValues(p).includes(norm));
    const nodeId = `branch-${i}`;
    const catColor = CATEGORIES[b.category].color;
    nodes.push({
      id: nodeId,
      type: "wanted",
      position: positions[i],
      data: {
        label: b.value,
        kind: "value",
        category: b.category,
        shared: sharedWith.length ? sharedWith.map(p => ({ profileId: p.id, profileLabel: wantedProfileLabel(p) })) : undefined,
        onSelectShared,
      } as WantedNodeData,
    });
    edges.push({
      id: `e-${nodeId}`,
      source: "center",
      target: nodeId,
      animated: sharedWith.length > 0,
      style: sharedWith.length ? { stroke: "#f59e0b", strokeWidth: 2.5 } : { stroke: catColor, strokeWidth: 1.5, opacity: 0.45 },
    });
  });

  return { nodes, edges };
}

function GraphLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
      {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => {
        const c = CATEGORIES[key];
        return (
          <span key={key} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
            {c.label}
          </span>
        );
      })}
    </div>
  );
}

export function WantedGraphView({ profiles }: { profiles: WantedProfile[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(profiles[0]?.id ?? null);
  const selected = profiles.find(p => p.id === selectedId) || profiles[0];

  const { nodes, edges } = useMemo(() => {
    if (!selected) return { nodes: [] as Node[], edges: [] as Edge[] };
    return buildWantedGraph(selected, profiles, setSelectedId);
  }, [selected, profiles]);

  if (!profiles.length) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Aucun profil Wanted a afficher.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground shrink-0">Profil centre :</span>
        <Select value={selectedId ? String(selectedId) : undefined} onValueChange={(v) => setSelectedId(Number(v))}>
          <SelectTrigger className="w-64 h-8 text-sm" data-testid="select-graph-profile">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {profiles.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{wantedProfileLabel(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs gap-1 ml-auto border-amber-500/40 text-amber-500">
          <Link2 className="w-3 h-3" /> Valeur partagee avec un autre profil (cliquer pour y aller)
        </Badge>
      </div>
      <GraphLegend />
      <div className="h-[560px] rounded-lg border border-border/50 bg-secondary/5 overflow-hidden">
        <ReactFlow
          key={selected?.id}
          nodes={nodes}
          edges={edges}
          nodeTypes={wantedNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
          minZoom={0.3}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
