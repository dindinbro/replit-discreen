import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Sparkles, ChevronRight, Brain, CheckCircle2, AlertCircle, Square, Trash2, ShieldAlert, ArrowLeft, Loader2, Check, X,
  Mail, User, MapPin, Hash, Phone, MessagesSquare, Wand2, Network, History, CreditCard, Copy,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const SOURCES = ["Wanted", "Brixhub", "Index"];

const FILTER_LABELS: Record<string, string> = {
  firstName: "Prénom", lastName: "Nom", dob: "Date naiss.", yob: "Année naiss.",
  city: "Ville", email: "Email", phone: "Téléphone", username: "Username",
  ipAddress: "IP", discordId: "Discord ID", address: "Adresse",
  displayName: "Nom affiché", ssn: "NIR", zipCode: "Code postal",
};

/* Reprend la palette de couleurs par type deja utilisee dans le graphe
 * relationnel (client/src/components/graph/registry.ts + WantedPage) — meme
 * langage visuel entre les criteres extraits ici et les noeuds du graphe. */
const FILTER_COLOR_VAR: Record<string, string> = {
  firstName: "--field-person", lastName: "--field-person", displayName: "--field-person",
  dob: "--field-date", yob: "--field-date",
  city: "--field-location", address: "--field-location", zipCode: "--field-location",
  email: "--field-email", phone: "--field-phone",
  username: "--graph-username", ipAddress: "--graph-ip", discordId: "--graph-discord",
  ssn: "--field-id",
};

/* ── Accroche visuelle de l'ecran verrouille : des criteres (email, nom,
 * ville, IP, telephone) convergent vers DisX qui les traite en boucle —
 * meme langage visuel que WantedIntroVisual (client/src/pages/WantedPage.tsx)
 * mais recolore en indigo/violet et recentre sur "extraction" plutot que
 * "verrouillage". Les classes animate-wanted-* sont generiques (scale/
 * opacity/dash uniquement, couleur injectee via stroke) donc reutilisables
 * telles quelles ; seul le coeur a sa propre animation (animate-disx-core,
 * index.css) pour un glow indigo au lieu du rouge de wanted-story-lock. ── */
function DisXIntroVisual() {
  const CX = 110, CY = 110, R = 78, NODE_R = 15;
  const nodes: { Icon: React.ElementType; angle: number; colorVar: string }[] = [
    { Icon: Mail, angle: -90, colorVar: "--field-email" },
    { Icon: User, angle: -18, colorVar: "--field-person" },
    { Icon: MapPin, angle: 54, colorVar: "--field-location" },
    { Icon: Hash, angle: 126, colorVar: "--graph-ip" },
    { Icon: Phone, angle: 198, colorVar: "--field-phone" },
  ];
  const points = nodes.map(({ angle }) => {
    const rad = (angle * Math.PI) / 180;
    return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
  });
  const branchDelay = (i: number) => `${i * 110}ms`;

  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto animate-wanted-zoom">
        <svg viewBox="0 0 220 220" className="w-full h-full overflow-visible">
          {points.map((p, i) => (
            <line
              key={`draw-${i}`}
              x1={CX} y1={CY} x2={p.x} y2={p.y}
              stroke={`hsl(var(${nodes[i].colorVar}))`}
              strokeWidth={1.5}
              strokeDasharray={78}
              className="animate-wanted-draw"
              style={{ animationDelay: branchDelay(i) }}
            />
          ))}
          {points.map((p, i) => (
            <line
              key={`flow-${i}`}
              x1={CX} y1={CY} x2={p.x} y2={p.y}
              stroke={`hsl(var(${nodes[i].colorVar}))`}
              strokeWidth={2}
              strokeDasharray="3 9"
              className="animate-wanted-flow"
              style={{ animationDelay: branchDelay(i) }}
            />
          ))}

          <circle cx={CX} cy={CY} r={22} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} className="animate-wanted-ping" />
          <circle cx={CX} cy={CY} r={22} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} className="animate-wanted-ping" style={{ animationDelay: "180ms" }} />

          <g className="animate-disx-core">
            <circle cx={CX} cy={CY} r={22} fill="hsl(var(--primary) / 0.14)" stroke="hsl(var(--primary))" strokeWidth={1.5} />
            <foreignObject x={CX - 11} y={CY - 11} width={22} height={22}>
              <Brain className="w-[22px] h-[22px]" style={{ color: "hsl(var(--primary))" }} />
            </foreignObject>
          </g>

          {points.map((p, i) => {
            const { Icon, colorVar } = nodes[i];
            return (
              <g
                key={`node-${i}`}
                className="animate-wanted-node"
                style={{ animationDelay: branchDelay(i), transformOrigin: `${p.x}px ${p.y}px` }}
              >
                <circle cx={p.x} cy={p.y} r={NODE_R} fill="rgba(255,255,255,0.06)" stroke={`hsl(var(${colorVar}))`} strokeWidth={1.5} />
                <foreignObject x={p.x - 8} y={p.y - 8} width={16} height={16}>
                  <Icon className="w-4 h-4" style={{ color: `hsl(var(${colorVar}))` }} />
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="relative h-4 text-center">
        <p className="absolute inset-0 text-[11px] text-muted-foreground animate-wanted-caption-1">Vous décrivez en langage naturel</p>
        <p className="absolute inset-0 text-[11px] text-muted-foreground animate-wanted-caption-2">DisX extrait les critères automatiquement</p>
        <p className="absolute inset-0 text-[11px] font-medium text-primary animate-wanted-caption-3">Recherche croisée lancée sur nos sources</p>
      </div>
    </div>
  );
}

/* Toile de fond "reseau neuronal" derriere tout le contenu de la page DisX
 * (une fois l'acces debloque) — noeuds et synapses places a la main (pas de
 * simulation physique) qui respirent en boucle, avec quelques aretes ou un
 * signal voyage en continu. Le cerveau du header n'est plus un logo isole :
 * toute la page baigne dans le meme langage visuel, a tres faible opacite
 * pour ne jamais concurrencer le contenu au premier plan. */
const NEURAL_NODES: { x: number; y: number }[] = [
  { x: 40, y: 50 }, { x: 120, y: 30 }, { x: 200, y: 60 }, { x: 300, y: 40 }, { x: 370, y: 90 },
  { x: 60, y: 140 }, { x: 150, y: 120 }, { x: 250, y: 150 }, { x: 340, y: 170 },
  { x: 90, y: 220 }, { x: 190, y: 240 }, { x: 280, y: 230 }, { x: 30, y: 260 }, { x: 360, y: 260 },
];
const NEURAL_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [1, 6], [2, 6], [2, 7], [3, 7], [4, 8],
  [5, 6], [6, 7], [7, 8], [5, 9], [6, 10], [7, 10], [7, 11], [8, 11], [8, 13], [9, 10],
  [10, 11], [11, 13], [9, 12], [10, 12],
];
const NEURAL_ACTIVE_EDGES = new Set([1, 4, 8, 12, 16, 20]);

function NeuralField() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full opacity-[0.18]" aria-hidden="true">
      {NEURAL_EDGES.map(([a, b], i) => {
        const n1 = NEURAL_NODES[a], n2 = NEURAL_NODES[b];
        const active = NEURAL_ACTIVE_EDGES.has(i);
        return (
          <line
            key={i}
            x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
            stroke={i % 2 === 0 ? "rgba(99,102,241,0.55)" : "rgba(139,92,246,0.55)"}
            strokeWidth={0.6}
            strokeDasharray={active ? "3 7" : undefined}
            style={active ? { animation: `wanted-flow-dash ${2.4 + (i % 3) * 0.6}s linear infinite` } : undefined}
          />
        );
      })}
      {NEURAL_NODES.map((n, i) => (
        <circle
          key={i}
          cx={n.x} cy={n.y} r={i % 3 === 0 ? 2.6 : 1.8}
          fill={i % 2 === 0 ? "rgba(99,102,241,0.75)" : "rgba(139,92,246,0.75)"}
          className="animate-wanted-card-glow"
          style={{ animationDelay: `${(i * 0.35).toFixed(2)}s`, transformBox: "fill-box", transformOrigin: "center" }}
        />
      ))}
    </svg>
  );
}

const DISX_FEATURES: { icon: React.ElementType; text: string }[] = [
  { icon: MessagesSquare, text: "Décrivez une personne en langage naturel, sans formulaire" },
  { icon: Wand2, text: "Extraction automatique des critères (nom, email, ville, IP...)" },
  { icon: Network, text: "Recherche croisée dans Wanted, Brixhub et l'index Discreen" },
  { icon: History, text: "Fil de recherches conservé pour affiner au fil de la conversation" },
];

const EXAMPLE_QUERIES = [
  "Je recherche cette email email@gmail.com et j'ai aussi sa date de naissance 01/01/2001",
  "Je cherche un homme prénommé Lucas, il habite à Lyon, travaille dans l'informatique, environ 30 ans.",
  "Trouve-moi des infos sur une fille prénommée Inès Durand, elle est de Paris 13e, née autour de 1999.",
  "Je cherche le numéro de téléphone ou l'email d'un certain Thomas Petit, il est électricien à Marseille.",
  "Un gars connu sous le pseudo 'NightWolf94' sur les jeux en ligne, probablement sur Discord aussi.",
  "Je cherche une personne avec l'adresse IP 185.220.101.45, c'est quoi sa localisation approximative ?",
];

type SearchStatus = "idle" | "extracting" | "searching" | "summarizing" | "done" | "error";

interface Criterion { type: string; value: string; }
interface SearchEntry {
  id: number;
  query: string;
  timestamp: number;
  status: SearchStatus;
  criteria: Criterion[];
  results: any[];
  total: number;
  summary: string;
  errorMsg?: string;
}

function colorVarFor(type: string): string {
  return FILTER_COLOR_VAR[type] || "--field-id";
}

function CriterionChip({ c }: { c: Criterion }) {
  const colorVar = colorVarFor(c.type);
  return (
    <span
      className="inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border text-sm"
      style={{
        borderColor: `hsl(var(${colorVar}) / 0.4)`,
        background: `hsl(var(${colorVar}) / 0.1)`,
      }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `hsl(var(${colorVar}))` }} />
      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: `hsl(var(${colorVar}))` }}>
        {FILTER_LABELS[c.type] || c.type}
      </span>
      <span className="text-foreground font-medium">{c.value}</span>
    </span>
  );
}

function recordLabel(record: any): string {
  return record.pseudo || [record.prenom, record.nom].filter(Boolean).join(" ")
    || record.firstName || record.username || record.email || "Profil";
}

function recordEntries(record: any): [string, any][] {
  return Object.entries(record).filter(([k, v]) =>
    v !== null && v !== undefined && v !== "" &&
    !["source", "_score", "_source", "id", "createdAt", "updatedAt", "_wantedProfile", "images"].includes(k)
  );
}

interface RecordOrigin { x: number; y: number; scale: number; }

/* Provenance d'un resultat non-Wanted (voir server/brixhub.ts + searchSqlite.ts:
 * "brixhub" est une valeur fixe, tout le reste (index local, pont Discreen)
 * est regroupe sous "Index" faute d'enum stable cote serveur). */
function sourceMeta(record: any): { label: string; badgeClass: string; dotClass: string } | null {
  const src = record._source || record.source;
  if (!src) return null;
  if (src === "brixhub") {
    return { label: "Brixhub", badgeClass: "text-violet-400 bg-violet-500/15 border-violet-500/30", dotClass: "bg-violet-500" };
  }
  return { label: "Index", badgeClass: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30", dotClass: "bg-cyan-500" };
}

function ResultCard({ record, onOpen }: { record: any; onOpen: (record: any, origin: RecordOrigin) => void }) {
  const isWanted = record._wantedProfile === true;
  const photo = isWanted && Array.isArray(record.images) ? record.images.find(Boolean) : null;
  const label = recordLabel(record);
  const entries = recordEntries(record);
  const src = !isWanted ? sourceMeta(record) : null;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    onOpen(record, {
      x: (r.left + r.width / 2) - vw / 2,
      y: (r.top + r.height / 2) - vh / 2,
      scale: Math.min(Math.max(r.width / 480, 0.3), 0.7),
    });
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden rounded-xl border pl-5 pr-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]",
        isWanted
          ? "border-red-500/40 bg-red-500/[0.05] hover:border-red-500/60 hover:shadow-[0_10px_28px_-12px_rgba(239,68,68,0.45)]"
          : "border-border/40 bg-muted/15 hover:border-primary/50 hover:shadow-[0_10px_28px_-12px_rgba(99,102,241,0.4)]"
      )}
      data-testid="button-disx-result-card"
    >
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        isWanted ? "bg-red-500" : src ? src.dotClass : "bg-primary/60"
      )} />
      <div className="flex items-center gap-2.5 mb-2.5">
        {photo ? (
          <img src={photo} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
        ) : isWanted ? (
          <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
        ) : null}
        <span className="text-sm font-bold text-foreground truncate flex-1">{label}</span>
        {isWanted ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full shrink-0">
            Wanted
          </span>
        ) : src ? (
          <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 border", src.badgeClass)}>
            {src.label}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {entries.slice(0, 10).map(([k, v]) => (
          <div key={k} className="flex flex-col min-w-0">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide font-semibold">{FILTER_LABELS[k] || k}</span>
            <span className="text-sm text-foreground/90 truncate">{String(v)}</span>
          </div>
        ))}
      </div>
      {entries.length > 10 && (
        <p className="text-[11px] text-primary/60 font-semibold mt-2">+ {entries.length - 10} autres champs · voir plus</p>
      )}
    </button>
  );
}

function RecordDetailOverlay({ record, origin, onClose }: { record: any; origin: RecordOrigin; onClose: () => void }) {
  const isWanted = record._wantedProfile === true;
  const photos: string[] = isWanted && Array.isArray(record.images) ? record.images.filter(Boolean) : [];
  const label = recordLabel(record);
  const entries = recordEntries(record);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fromCard = { opacity: 0, x: origin.x, y: origin.y, scale: origin.scale };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-background/55 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      />
      <motion.div
        initial={fromCard}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        exit={fromCard}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border/40 bg-card shadow-2xl p-6"
        data-testid="dialog-disx-record"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          data-testid="button-disx-record-close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          {photos[0] ? (
            <img src={photos[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          ) : isWanted ? (
            <div className="w-14 h-14 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{label}</p>
            {isWanted && (
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full mt-1">
                Profil Wanted
              </span>
            )}
          </div>
        </div>

        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mt-4">
            {photos.map((src, i) => (
              <img key={i} src={src} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-border/30" />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3.5 mt-5">
          {entries.map(([k, v]) => (
            <div key={k} className="flex flex-col min-w-0">
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide font-semibold">{FILTER_LABELS[k] || k}</span>
              <span className="text-sm text-foreground break-words">{String(v)}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

const PIPELINE_STEPS: { key: "extracting" | "searching" | "summarizing"; label: string }[] = [
  { key: "extracting", label: "Extraction" },
  { key: "searching", label: "Recherche" },
  { key: "summarizing", label: "Synthèse" },
];
const STEP_ORDER = PIPELINE_STEPS.map(s => s.key);

function PipelineTracker({ status }: { status: SearchStatus }) {
  if (status === "idle" || status === "error") return null;
  const doneIdx = status === "done" ? PIPELINE_STEPS.length : STEP_ORDER.indexOf(status as any);

  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "shrink-0 w-6 h-6 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center",
        status !== "done" && "animate-pulse"
      )}>
        <Brain className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex items-center flex-1">
      {PIPELINE_STEPS.map((step, i) => {
        const state = i < doneIdx ? "done" : i === doneIdx ? "active" : "pending";
        return (
          <div key={step.key} className={cn("flex items-center", i < PIPELINE_STEPS.length - 1 ? "flex-1" : "")}>
            <div className="flex items-center gap-2 shrink-0">
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                state === "done" && "bg-primary border-primary",
                state === "active" && "border-primary bg-primary/15",
                state === "pending" && "border-border/50 bg-transparent"
              )}>
                {state === "done" ? (
                  <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                ) : (
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    state === "active" && "bg-primary animate-pulse",
                    state === "pending" && "bg-border/60"
                  )} />
                )}
              </div>
              <span className={cn(
                "text-xs font-bold uppercase tracking-wide",
                state === "done" && "text-primary/80",
                state === "active" && "text-primary",
                state === "pending" && "text-muted-foreground/40"
              )}>
                {step.label}
              </span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className={cn("h-0.5 flex-1 mx-3 rounded-full", state === "done" ? "bg-primary/50" : "bg-border/30")} />
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

/* Aperçu du gabarit de ResultCard pendant le statut "searching" — evite un
 * trou vide entre le tracker et les resultats, et annonce visuellement la
 * forme des cartes a venir plutot qu'un simple spinner. */
function ResultCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/25 bg-muted/10 pl-5 pr-4 py-3.5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-3.5 w-24 rounded-full bg-muted/40 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2 w-10 rounded-full bg-muted/25 animate-pulse" />
            <div className="h-3 w-full rounded-full bg-muted/30 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DisXPage() {
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{ record: any; origin: RecordOrigin } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  const updateEntry = (id: number, patch: Partial<SearchEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const stopSearch = () => {
    abortRef.current?.abort();
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setEntries([]);
    setInput("");
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const entryId = ++idRef.current;
    const newEntry: SearchEntry = {
      id: entryId, query: content, timestamp: Date.now(), status: "extracting",
      criteria: [], results: [], total: 0, summary: "",
    };
    setEntries(prev => [...prev, newEntry]);

    try {
      const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;

      const res = await fetch("/api/disx/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: content }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        updateEntry(entryId, { status: "error", errorMsg: err?.error || `HTTP ${res.status}` });
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      // Un evenement SSE volumineux (ex: profil Wanted avec plusieurs emails/notes)
      // peut etre coupe en plein milieu entre deux reader.read() : sans buffer, la
      // ligne "data: {...}" tronquee echoue le JSON.parse (catch silencieux) et
      // l'evenement est perdu, meme si le reste (summary) arrive intact ensuite.
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "extracting") {
              updateEntry(entryId, { status: "extracting" });
            } else if (event.type === "criteria") {
              updateEntry(entryId, { criteria: event.data });
            } else if (event.type === "searching") {
              updateEntry(entryId, { status: "searching" });
            } else if (event.type === "results") {
              updateEntry(entryId, {
                results: event.data.results,
                total: event.data.total,
                status: "summarizing",
              });
            } else if (event.type === "summary") {
              setEntries(prev => prev.map(e =>
                e.id === entryId ? { ...e, summary: e.summary + event.content } : e
              ));
            } else if (event.type === "error") {
              updateEntry(entryId, { status: "error", errorMsg: event.message });
            } else if (event.type === "done") {
              updateEntry(entryId, { status: "done" });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        updateEntry(entryId, { status: "done" });
      } else {
        updateEntry(entryId, { status: "error", errorMsg: err?.message || "Erreur réseau" });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/25 to-violet-500/25 border border-primary/30 flex items-center justify-center">
            <Brain className="w-7 h-7 text-primary animate-disx-core" />
          </div>
          <Loader2 className="absolute -bottom-2 -right-2 w-6 h-6 animate-spin text-primary bg-background rounded-full p-0.5" />
        </div>
      </div>
    );
  }

  const hasAccess = role === "admin" || role === "wanted";

  if (!user || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-3xl" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        </div>

        <div className="relative z-10 max-w-md w-full text-center space-y-8">
          <DisXIntroVisual />

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Zone restreinte</p>
            <h1 className="text-3xl font-bold tracking-tight">Accès DisX</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              L'assistant qui comprend le langage naturel et lance une vraie recherche croisée à votre place — réservé aux membres Wanted et aux administrateurs.
            </p>
          </div>

          <Card className="relative overflow-hidden rounded-2xl border-primary/25 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur p-6 text-left space-y-5 animate-wanted-card-border">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/[0.1] blur-3xl pointer-events-none animate-wanted-card-glow" />
            <div className="absolute top-0 left-0 right-0 h-px overflow-hidden pointer-events-none">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent animate-wanted-topbar" />
            </div>

            <div className="relative space-y-0.5 -mx-2">
              {DISX_FEATURES.map(({ icon: FIcon, text }, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 animate-wanted-feature-in transition-colors duration-200 hover:bg-primary/[0.06]"
                  style={{ animationDelay: `${150 + i * 90}ms` }}
                >
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FIcon className="w-3 h-3 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <Button
              onClick={() => navigate("/pricing")}
              className="relative w-full h-10 rounded-xl gap-1.5 animate-wanted-cta"
              data-testid="button-disx-pricing"
            >
              <CreditCard className="w-4 h-4" />
              Voir les tarifs
            </Button>
          </Card>

          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-go-home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-0px)] lg:h-screen max-h-screen overflow-hidden bg-background">

      {/* ── Ambient backdrop ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl animate-wanted-card-glow"
          style={{ background: "rgba(99,102,241,0.16)" }}
        />
        <div
          className="absolute -bottom-40 -right-24 w-[32rem] h-[32rem] rounded-full blur-3xl animate-wanted-card-glow"
          style={{ background: "rgba(139,92,246,0.13)", animationDelay: "1.4s" }}
        />
        <NeuralField />
        <div className="absolute inset-0 pricing-noise animate-pricing-noise" />
      </div>

      {/* ── Header ── */}
      <div className="relative shrink-0 border-b border-border/30 px-6 py-4 flex items-center justify-between bg-background/90 backdrop-blur-sm">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="flex items-center gap-3.5">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/25 to-violet-500/25 border border-primary/30 flex items-center justify-center shadow-[0_0_24px_-4px_rgba(99,102,241,0.55)]">
            <Brain className="w-5 h-5 text-primary animate-disx-core" />
            <span
              className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_2px_rgba(139,92,246,0.7)] animate-disx-orbit"
              style={{ marginTop: "-3px", marginLeft: "-3px" }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-display font-extrabold text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">DisX</span>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                role === "admin"
                  ? "text-violet-300 bg-violet-500/15 border-violet-500/30"
                  : "text-red-300 bg-red-500/15 border-red-500/30"
              )}>
                {role === "admin" ? "Admin" : "Wanted"}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                En ligne
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border/30 bg-muted/20">
            {SOURCES.map(s => (
              <span key={s} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400/80" />
                {s}
              </span>
            ))}
          </div>
          {entries.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 bg-muted/20 text-xs font-bold text-muted-foreground tabular-nums">
              {entries.length} recherche{entries.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="relative flex-1 overflow-y-auto px-4 md:px-8 py-8">

        {/* Empty state */}
        {entries.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border border-primary/40 animate-wanted-ping" />
                <div className="absolute inset-0 rounded-full border border-primary/40 animate-wanted-ping" style={{ animationDelay: "180ms" }} />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 blur-xl animate-wanted-card-glow" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-primary/25 flex items-center justify-center">
                  <Brain className="w-9 h-9 text-primary animate-disx-core" />
                </div>
              </div>
              <h2 className="text-3xl font-display font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
                Décris la personne que tu cherches
              </h2>
              <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
                DisX comprend le langage naturel, extrait les critères et lance une vraie recherche croisée
                dans les profils Wanted, Brixhub et l'index Discreen.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {[
                  { icon: Network, label: "Wanted · Brixhub · Index" },
                  { icon: Wand2, label: "Zéro formulaire" },
                  { icon: History, label: "Contexte conservé" },
                ].map(({ icon: SIcon, label }, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/30 bg-muted/15 text-xs font-medium text-muted-foreground/80">
                    <SIcon className="w-3.5 h-3.5 text-primary/70" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-bold px-1">Requêtes d'exemple</p>
              {EXAMPLE_QUERIES.map((q, i) => (
                <motion.button key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -2 }}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left flex items-center gap-3.5 px-5 py-4 rounded-2xl border border-border/40 bg-card/40 hover:bg-card/70 hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.15),0_12px_28px_-10px_rgba(99,102,241,0.4)] transition-all duration-200 group"
                  data-testid={`button-disx-example-${i}`}>
                  <span className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Sparkles className="w-4 h-4 text-primary/80" />
                  </span>
                  <span className="text-sm text-foreground/90 group-hover:text-foreground transition-colors flex-1 leading-snug">{q}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/70 shrink-0 transition-colors" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search entries */}
        <div className="max-w-3xl mx-auto space-y-5 relative">
          {entries.length > 1 && (
            <div className="absolute left-[21px] top-9 bottom-9 w-px pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/25 via-border/40 to-transparent" />
              <div className="absolute left-1/2 w-1.5 h-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_2px_rgba(99,102,241,0.65)] animate-disx-signal" />
            </div>
          )}
          <AnimatePresence initial={false}>
            {entries.map((entry, idx) => (
              <motion.div key={entry.id}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                className="flex gap-3.5">

                {/* Case number badge */}
                <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-primary/30 flex items-center justify-center font-display font-extrabold text-sm text-primary">
                  {String(idx + 1).padStart(2, "0")}
                </div>

                <div className="flex-1 min-w-0 rounded-2xl border border-border/35 bg-card/40 overflow-hidden shadow-sm">

                  {/* Query header bar — presente la requete comme une commande envoyee a DisX */}
                  <div className="px-5 py-3.5 border-b border-border/25 flex items-start gap-2.5 bg-gradient-to-r from-primary/[0.04] to-transparent">
                    <span className="mt-[3px] font-mono text-xs font-bold text-primary/60 shrink-0 select-none">&gt;_</span>
                    <p className="text-base font-semibold text-foreground leading-snug flex-1">{entry.query}</p>
                    <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0 tabular-nums mt-1.5">
                      {new Date(entry.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="p-5 space-y-5">

                    {/* Pipeline tracker */}
                    <PipelineTracker status={entry.status} />

                    {/* Criteria */}
                    {entry.criteria.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-bold">Critères extraits</p>
                        <div className="flex flex-wrap gap-2">
                          {entry.criteria.map((c, i) => <CriterionChip key={i} c={c} />)}
                        </div>
                      </div>
                    )}

                    {/* Results skeleton while the search is in flight */}
                    {entry.status === "searching" && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-bold">Résultats</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <ResultCardSkeleton />
                          <ResultCardSkeleton />
                        </div>
                      </div>
                    )}

                    {/* Results */}
                    {(entry.status === "summarizing" || entry.status === "done") && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-bold">
                            Résultats
                          </p>
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full",
                            entry.total > 0
                              ? "bg-green-500/15 text-green-400 border border-green-500/25"
                              : "bg-muted/30 text-muted-foreground border border-border/30"
                          )}>
                            {entry.total} trouvé{entry.total > 1 ? "s" : ""}
                          </span>
                        </div>

                        {entry.results.length === 0 ? (
                          <div className="rounded-xl border border-border/25 bg-muted/15 px-4 py-3.5 text-sm text-muted-foreground">
                            Aucun résultat dans Wanted, Brixhub ou l'index pour ces critères.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {entry.results.slice(0, 6).map((r, i) => (
                              <ResultCard
                                key={i}
                                record={r}
                                onOpen={(record, origin) => setSelectedRecord({ record, origin })}
                              />
                            ))}
                          </div>
                        )}
                        {entry.total > 6 && (
                          <p className="text-sm text-muted-foreground/60 text-center pt-0.5">
                            + {entry.total - 6} résultats supplémentaires disponibles via la recherche Paramétrique
                          </p>
                        )}
                      </div>
                    )}

                    {/* AI Summary */}
                    {entry.summary && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-bold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-primary/70" />
                            Analyse DisX
                          </p>
                          {entry.status === "done" && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(entry.summary);
                                toast({ description: "Analyse copiée" });
                              }}
                              className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/50 hover:text-primary transition-colors"
                              data-testid="button-disx-copy-summary"
                            >
                              <Copy className="w-3 h-3" />
                              Copier
                            </button>
                          )}
                        </div>
                        <div className="rounded-xl border-l-[3px] border-primary/40 bg-primary/[0.05] pl-4 pr-3 py-3 text-sm text-muted-foreground leading-relaxed">
                          {entry.summary}
                          {entry.status === "summarizing" && (
                            <span className="inline-block w-1 h-3.5 bg-primary/60 animate-pulse ml-0.5 rounded-full align-middle" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Done indicator */}
                    {entry.status === "done" && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/50 pt-2 border-t border-border/20">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70" />
                        Recherche terminée
                      </div>
                    )}

                    {/* Error */}
                    {entry.status === "error" && (
                      <div className="flex items-center gap-2 text-sm text-red-400">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {entry.errorMsg || "Une erreur est survenue"}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input area ── */}
      <div className="relative shrink-0 border-t border-border/30 px-4 md:px-8 py-4 bg-background/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Action buttons row */}
          <div className="flex items-center gap-2 justify-end">
            {loading && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopSearch}
                  className="h-7 gap-1.5 text-xs font-semibold border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50"
                  data-testid="button-disx-stop"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Stopper
                </Button>
              </motion.div>
            )}
            {entries.length > 0 && !loading && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="h-7 gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  data-testid="button-disx-clear"
                >
                  <Trash2 className="w-3 h-3" />
                  Effacer
                </Button>
              </motion.div>
            )}
          </div>

          {/* Prompt row */}
          <div className="relative flex items-end gap-2.5 rounded-2xl border border-border/40 bg-card/50 px-4 py-3.5 focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.14)] transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Décris la personne que tu cherches..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/40 max-h-32 disabled:opacity-50"
              data-testid="input-disx-message"
            />
            <Button size="icon" onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 border-0 shadow-[0_0_18px_-4px_rgba(99,102,241,0.65)] disabled:shadow-none disabled:opacity-40"
              data-testid="button-disx-send">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/50 text-center">
            Entrée pour lancer · Maj+Entrée pour saut de ligne · Usage légal uniquement
          </p>
        </div>
      </div>

      {/* ── Record detail overlay ── */}
      <AnimatePresence>
        {selectedRecord && (
          <RecordDetailOverlay
            record={selectedRecord.record}
            origin={selectedRecord.origin}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
