import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { WantedProfile, WantedFilterType } from "@shared/schema";
import { WantedFilterTypes, WantedFilterLabels, WantedFilterToApiParam } from "@shared/schema";
import { FieldGroup, wantedFieldValues, wantedAllValues, wantedProfileLabel, WantedGraphView } from "@/components/graph";
import {
  ShieldAlert, KeyRound, Loader2, Plus, X, RotateCcw, Search,
  User, Mail, Phone, MapPin, Hash, MessageSquare, Fingerprint, CreditCard, Car, FileText,
  Lock, Sparkles, Network, ChevronRight, AtSign, Wifi, SlidersHorizontal, Check,
} from "lucide-react";

const FILTER_ICONS: Record<WantedFilterType, React.ElementType> = {
  nom: User, prenom: User, pseudo: AtSign,
  email: Mail, phone: Phone, ipAddress: Wifi,
  discordId: MessageSquare, discord: MessageSquare, address: MapPin,
  password: KeyRound, iban: CreditCard, bic: CreditCard,
  plaque: Car, nir: Fingerprint, notes: FileText,
};

/* Reprend la palette de couleurs par type deja utilisee dans le graphe
 * relationnel (client/src/components/graph/registry.ts) — meme langage
 * visuel entre les criteres de recherche et les noeuds du graphe. */
const FILTER_COLOR_VAR: Record<WantedFilterType, string> = {
  nom: "--field-person", prenom: "--field-person", pseudo: "--graph-username",
  email: "--field-email", phone: "--field-phone", ipAddress: "--graph-ip",
  discordId: "--graph-discord", discord: "--graph-discord", address: "--field-location",
  password: "--field-id", iban: "--field-finance", bic: "--field-finance",
  plaque: "--graph-vehicle", nir: "--field-id", notes: "--field-date",
};

interface CriterionRow {
  id: string;
  type: WantedFilterType;
  value: string;
}

let nextId = 0;

function initials(profile: WantedProfile): string {
  const label = wantedProfileLabel(profile);
  const parts = label.split(" ").filter(Boolean);
  return (parts[0]?.[0] || "?").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}

/* ── Mini-graphe anime servant d'accroche visuelle sur l'ecran verrouille :
 * des points de donnees (email, tel, IP, discord, adresse) convergent vers
 * une cible centrale qui "verrouille" en boucle — illustre le principe du
 * service (croiser des fuites eparses pour reconstituer un profil). Toutes
 * les aretes ont la meme longueur (noeuds equidistants du centre), d'ou le
 * stroke-dashoffset fixe a 78 dans les keyframes CSS. ── */
function WantedIntroVisual() {
  const CX = 110, CY = 110, R = 78, NODE_R = 15;
  const nodes: { Icon: React.ElementType; angle: number; color: string }[] = [
    { Icon: Mail, angle: -90, color: "hsl(var(--field-email))" },
    { Icon: Phone, angle: -18, color: "hsl(var(--field-phone))" },
    { Icon: Hash, angle: 54, color: "hsl(var(--graph-ip))" },
    { Icon: MessageSquare, angle: 126, color: "hsl(var(--graph-discord))" },
    { Icon: MapPin, angle: 198, color: "hsl(var(--field-location))" },
  ];
  const points = nodes.map(({ angle }) => {
    const rad = (angle * Math.PI) / 180;
    return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
  });

  // Chaque "branche" (noeud + sa ligne + son flux) partage le meme decalage
  // pour rester en phase avec elle-meme d'un cycle a l'autre, tout en
  // demarrant legerement apres ses voisines — cf. le commentaire dans
  // index.css sur pourquoi une meme duree de cycle rend ce decalage stable.
  const branchDelay = (i: number) => `${i * 110}ms`;

  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto animate-wanted-zoom">
        <svg viewBox="0 0 220 220" className="w-full h-full overflow-visible">
          {points.map((p, i) => (
            <line
              key={`draw-${i}`}
              x1={CX} y1={CY} x2={p.x} y2={p.y}
              stroke={nodes[i].color}
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
              stroke={nodes[i].color}
              strokeWidth={2}
              strokeDasharray="3 9"
              className="animate-wanted-flow"
              style={{ animationDelay: branchDelay(i) }}
            />
          ))}

          <circle cx={CX} cy={CY} r={20} fill="none" stroke="#f87171" strokeWidth={1.5} className="animate-wanted-ping" />
          <circle cx={CX} cy={CY} r={20} fill="none" stroke="#f87171" strokeWidth={1.5} className="animate-wanted-ping" style={{ animationDelay: "180ms" }} />

          <g className="animate-wanted-lock">
            <circle cx={CX} cy={CY} r={20} fill="rgba(239,68,68,0.12)" stroke="#f87171" strokeWidth={1.5} />
            {[0, 90, 180, 270].map((rot) => (
              <path
                key={rot}
                d={`M ${CX - 30} ${CY - 30} l 8 0 M ${CX - 30} ${CY - 30} l 0 8`}
                stroke="#f87171"
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
                transform={`rotate(${rot} ${CX} ${CY})`}
              />
            ))}
          </g>

          {points.map((p, i) => {
            const { Icon, color } = nodes[i];
            return (
              <g
                key={`node-${i}`}
                className="animate-wanted-node"
                style={{ animationDelay: branchDelay(i), transformOrigin: `${p.x}px ${p.y}px` }}
              >
                <circle cx={p.x} cy={p.y} r={NODE_R} fill="rgba(255,255,255,0.06)" stroke={color} strokeWidth={1.5} />
                <foreignObject x={p.x - 8} y={p.y - 8} width={16} height={16}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legende textuelle synchronisee sur le meme cycle de 6s que le
       * graphe : elle nomme explicitement chaque phase (collecte / recoupement
       * / identification) pour que l'animation explique reellement le
       * service au lieu d'etre juste decorative. */}
      <div className="relative h-4 text-center">
        <p className="absolute inset-0 text-[11px] text-muted-foreground animate-wanted-caption-1">Collecte des fuites eparses</p>
        <p className="absolute inset-0 text-[11px] text-muted-foreground animate-wanted-caption-2">Recoupement automatique des sources</p>
        <p className="absolute inset-0 text-[11px] font-medium text-red-500 animate-wanted-caption-3">Profil identifie et cartographie</p>
      </div>
    </div>
  );
}

/* ── Prix et fonctionnalites de l'abonnement Wanted ──
 * Le montant est fixe cote serveur (WANTED_PRICE_EUR dans routes.ts) —
 * ne changer ce libelle que si le prix serveur change en meme temps. */
const WANTED_PRICE_LABEL = "19,99€";

const WANTED_FEATURES: string[] = [
  "Recherche croisee sur email, telephone, IP, Discord, adresse...",
  "Cartographie relationnelle en direct entre les profils lies",
  "Fiches completes : contacts, documents, vehicule, notes",
  "Detection automatique des doublons et informations partagees",
  "Recherches et cartographies illimitees pendant l'abonnement",
];

/* ── Ecran verrouille : tarif, fonctionnalites et acces (paiement ou code) ── */
function RedeemGate() {
  const { refreshRole, getAccessToken } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const submit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/wanted/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Acces active", description: "Le role Wanted a ete deverrouille sur votre compte." });
        setCode("");
        await refreshRole();
      } else {
        toast({ title: "Code refuse", description: data.message || "Code invalide.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de contacter le serveur.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async () => {
    setPayLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/payment/init", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type: "wanted" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Impossible de creer le paiement.");
      if (data.orderId) {
        window.location.href = `/checkout?orderId=${data.orderId}&token=${data.sessionToken}`;
      }
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Paiement impossible.", variant: "destructive" });
      setPayLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-500/[0.05] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #f87171 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>
      <div className="relative z-10 max-w-md w-full text-center space-y-8">
        <WantedIntroVisual />
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500/70">Zone restreinte</p>
          <h1 className="text-3xl font-bold tracking-tight">Acces Wanted</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Le moteur qui relie les fuites eparses en un graphe exploitable — retrouvez et cartographiez un profil en quelques secondes.
          </p>
        </div>

        <Card className="group relative overflow-hidden rounded-2xl border-red-500/25 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur p-6 text-left space-y-5 animate-wanted-card-border">
          {/* Halo ambiant qui respire derriere la carte */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-red-500/[0.1] blur-3xl pointer-events-none animate-wanted-card-glow" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-red-500/[0.06] blur-3xl pointer-events-none animate-wanted-card-glow" style={{ animationDelay: "1.2s" }} />

          {/* Liseret de lumiere qui balaie doucement la carte */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-red-500/[0.06] to-transparent animate-wanted-shine" />
          </div>

          {/* Trait lumineux qui balaie le haut de la carte */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden pointer-events-none">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-red-500/80 to-transparent animate-wanted-topbar" />
          </div>

          <div className="relative flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-500/80 flex items-center gap-1.5">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                Abonnement Wanted
              </p>
              <div className="flex items-baseline gap-1.5 mt-1 animate-wanted-price-in">
                <span className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent animate-wanted-price-glow">{WANTED_PRICE_LABEL}</span>
                <span className="text-sm text-muted-foreground">/ mois</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 animate-wanted-badge">
              <CreditCard className="w-5 h-5 text-red-500" />
            </div>
          </div>

          <div className="relative h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />

          <div className="relative -mx-2 space-y-0.5">
            {WANTED_FEATURES.map((text, i) => (
              <div
                key={i}
                className="group/feature flex items-start gap-2.5 rounded-lg px-2 py-1.5 animate-wanted-feature-in transition-colors duration-200 hover:bg-red-500/[0.06]"
                style={{ animationDelay: `${150 + i * 90}ms` }}
              >
                <div className="relative w-5 h-5 shrink-0 mt-0.5">
                  <span
                    className="absolute inset-0 rounded-md bg-red-500/30 animate-wanted-feature-ring"
                    style={{ animationDelay: `${150 + i * 90}ms` }}
                  />
                  <div
                    className="relative w-5 h-5 rounded-md bg-red-500/10 flex items-center justify-center transition-all duration-300 group-hover/feature:scale-110 group-hover/feature:bg-red-500/20 animate-wanted-feature-pop"
                    style={{ animationDelay: `${150 + i * 90}ms` }}
                  >
                    <Check className="w-3 h-3 text-red-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed transition-colors duration-200 group-hover/feature:text-foreground/85">{text}</p>
              </div>
            ))}
          </div>

          <Button
            onClick={subscribe}
            disabled={payLoading}
            className="relative w-full h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white gap-1.5 overflow-hidden transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] animate-wanted-cta"
            data-testid="button-wanted-subscribe"
          >
            <span className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-18deg] -translate-x-[150%] group-hover:translate-x-[350%] transition-transform duration-700 ease-out" />
            {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            S'abonner — {WANTED_PRICE_LABEL}/mois
          </Button>
          <p className="relative text-[10px] text-center text-muted-foreground">
            Paiement securise en cryptomonnaie · Activation automatique du compte
          </p>
        </Card>

        <div className="space-y-3">
          {!showCodeInput ? (
            <button
              onClick={() => setShowCodeInput(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              data-testid="button-show-code-input"
            >
              Vous avez deja un code d'activation ?
            </button>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Code d'activation unique, delivre par un administrateur.</p>
              <div className="flex items-center gap-2 rounded-full border border-red-500/25 bg-card/60 backdrop-blur pl-5 pr-1.5 py-1.5 focus-within:border-red-500/50 transition-colors">
                <Lock className="w-4 h-4 text-red-500/60 shrink-0" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="WANTED-XXXXXXXX"
                  className="border-0 bg-transparent font-mono text-center focus-visible:ring-0 shadow-none"
                  data-testid="input-wanted-code"
                />
                <Button
                  onClick={submit}
                  disabled={loading || !code.trim()}
                  size="sm"
                  className="shrink-0 rounded-full bg-red-600 hover:bg-red-700 text-white gap-1.5"
                  data-testid="button-wanted-redeem"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Activer
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Etat vide de la colonne droite (avant recherche / aucun resultat) ── */
function WantedEmptyState({ variant }: { variant: "idle" | "no-results" }) {
  const Icon = variant === "idle" ? Network : Search;
  return (
    <div className="relative h-[calc(100vh-260px)] min-h-[560px] flex flex-col items-center justify-center text-center gap-6 rounded-2xl border border-dashed border-red-500/20 px-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full bg-red-500/[0.06] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "radial-gradient(circle, #f87171 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
      </div>
      <div className="relative mx-auto w-24 h-24 rounded-full border-2 border-red-500/25 flex items-center justify-center shrink-0">
        {variant === "idle" && <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping" />}
        <Icon className="w-10 h-10 text-red-500/70" />
      </div>
      <div className="relative space-y-2">
        <p className="text-lg font-semibold text-foreground/85 max-w-sm">
          {variant === "idle" ? "Pret a cartographier" : "Aucun profil correspondant"}
        </p>
        <p className="text-sm text-muted-foreground max-w-sm">
          {variant === "idle"
            ? "Renseignez un critere a gauche puis lancez une recherche : fiches et graphe relationnel s'affichent ici."
            : "Aucune fiche ne correspond a ces criteres — essayez une autre combinaison."}
        </p>
      </div>
    </div>
  );
}

/* ── Panneau de recherche (colonne gauche) ── */
function SearchPanel({
  criteria, availableFilters, onAdd, onRemove, onChange, onSearch, onReset, loading,
}: {
  criteria: CriterionRow[];
  availableFilters: WantedFilterType[];
  onAdd: (type: string) => void;
  onRemove: (id: string) => void;
  onChange: (id: string, value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  loading: boolean;
}) {
  return (
    <Card className="p-4 space-y-4 border-red-500/15 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.4]">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-red-500/[0.06] blur-3xl" />
      </div>

      <div className="relative flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-red-500" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Criteres</p>
          <p className="text-[10px] text-muted-foreground">Combinez plusieurs champs</p>
        </div>
      </div>

      {criteria.length > 0 && (
        <div className="relative space-y-1.5">
          {criteria.map((c) => {
            const Icon = FILTER_ICONS[c.type] || FileText;
            const colorVar = FILTER_COLOR_VAR[c.type];
            return (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 pl-2 pr-1 py-1.5 focus-within:border-red-500/30 transition-colors"
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `hsl(var(${colorVar}) / 0.14)`, color: `hsl(var(${colorVar}))` }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <Input
                  value={c.value}
                  onChange={(e) => onChange(c.id, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSearch()}
                  placeholder={WantedFilterLabels[c.type]}
                  className="h-6 text-xs flex-1 bg-transparent border-0 px-1 focus-visible:ring-0 shadow-none"
                  data-testid={`input-criterion-${c.id}`}
                />
                <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => onRemove(c.id)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {availableFilters.length > 0 && (
        <Select value="" onValueChange={onAdd}>
          <SelectTrigger
            className={`relative w-full h-9 text-xs gap-1.5 rounded-xl px-3 ${
              criteria.length === 0
                ? "border-dashed border-red-500/25 text-muted-foreground hover:border-red-500/40"
                : "border-border/60 text-muted-foreground"
            }`}
            data-testid="select-add-criterion"
          >
            <Plus className="w-3.5 h-3.5" />
            <SelectValue placeholder="Ajouter un critere" />
          </SelectTrigger>
          <SelectContent>
            {availableFilters.map((f) => {
              const Icon = FILTER_ICONS[f] || FileText;
              const colorVar = FILTER_COLOR_VAR[f];
              return (
                <SelectItem key={f} value={f}>
                  <span className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: `hsl(var(${colorVar}))` }} />
                    {WantedFilterLabels[f]}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      <div className="relative flex gap-1.5 pt-1">
        <Button
          onClick={onSearch}
          disabled={loading || !criteria.some((c) => c.value.trim())}
          size="sm"
          className="flex-1 h-9 text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5 rounded-xl"
          data-testid="button-run-search"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Rechercher
        </Button>
        <Button variant="outline" size="sm" onClick={onReset} disabled={loading} className="h-9 w-9 p-0 rounded-xl">
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}

/* ── Ligne de resultat compacte (colonne gauche) ── */
function ResultRow({ profile, active, sharedCount, onClick }: { profile: WantedProfile; active: boolean; sharedCount: number; onClick: () => void }) {
  const counts = [
    wantedFieldValues(profile, "emails").length,
    wantedFieldValues(profile, "phones").length,
    wantedFieldValues(profile, "addresses").length,
    wantedFieldValues(profile, "ips").length,
    wantedFieldValues(profile, "discordIds").length,
  ].reduce((a, b) => a + b, 0);

  return (
    <button
      onClick={onClick}
      data-testid={`row-result-${profile.id}`}
      className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
        active ? "bg-red-500/10 border border-red-500/30" : "border border-transparent hover:bg-secondary/40"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
          active ? "bg-red-500 text-white" : "bg-secondary text-muted-foreground"
        }`}
      >
        {initials(profile)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{wantedProfileLabel(profile)}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {counts} info{counts !== 1 ? "s" : ""}{sharedCount > 0 && <span className="text-amber-500"> · {sharedCount} partagee{sharedCount > 1 ? "s" : ""}</span>}
        </p>
      </div>
      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${active ? "text-red-500" : "text-muted-foreground/40"}`} />
    </button>
  );
}

/* ── Panneau de detail (colonne droite) ── */
function DetailPanel({ profile, allResults }: { profile: WantedProfile; allResults: WantedProfile[] }) {
  const [showGraph, setShowGraph] = useState(false);

  return (
    <Card className="p-5 md:p-6 space-y-5 border-red-500/15" data-testid={`detail-${profile.id}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {profile.images?.[0] ? (
            <img src={profile.images[0]} alt="" className="w-12 h-12 rounded-2xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-400 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {initials(profile)}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold leading-tight">{wantedProfileLabel(profile)}</h2>
            <p className="text-xs text-muted-foreground">
              {[profile.pseudo && `@${profile.pseudo}`, profile.ville, profile.dateNaissance].filter(Boolean).join(" · ") || `Profil #${profile.id}`}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={showGraph ? "default" : "outline"}
          className={`gap-1.5 rounded-full ${showGraph ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
          onClick={() => setShowGraph((v) => !v)}
          data-testid="button-toggle-graph"
        >
          <Network className="w-3.5 h-3.5" /> {showGraph ? "Voir la fiche" : "Voir le graphe"}
        </Button>
      </div>

      {showGraph ? (
        <WantedGraphView profiles={allResults} initialCenterId={profile.id} compact />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {(profile.images?.filter(Boolean).length || 0) > 0 && (
            <div className="sm:col-span-2 flex gap-2 flex-wrap">
              {profile.images!.filter(Boolean).map((src, i) => (
                <img key={i} src={src} alt="" className="w-16 h-16 rounded-md object-cover border border-border/50" />
              ))}
            </div>
          )}
          <FieldGroup icon={Mail} label="Emails" values={wantedFieldValues(profile, "emails")} />
          <FieldGroup icon={Phone} label="Telephones" values={wantedFieldValues(profile, "phones")} />
          <FieldGroup icon={MapPin} label="Adresses" values={wantedFieldValues(profile, "addresses")} />
          <FieldGroup icon={Hash} label="IPs" values={wantedFieldValues(profile, "ips")} />
          <FieldGroup icon={MessageSquare} label="Discord IDs" values={wantedFieldValues(profile, "discordIds")} />
          <FieldGroup icon={Fingerprint} label="Documents" values={[profile.nir, profile.iban, profile.plaque].filter(Boolean) as string[]} />
          {profile.notes && (
            <div className="sm:col-span-2 space-y-1 pt-1 border-t border-border/40">
              <p className="text-xs font-medium text-muted-foreground pt-2">Notes</p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{profile.notes}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Espace de travail (recherche + resultats) ── */
function WantedWorkspace() {
  const [criteria, setCriteria] = useState<CriterionRow[]>([]);
  const [results, setResults] = useState<WantedProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { toast } = useToast();

  const usedTypes = new Set(criteria.map((c) => c.type));
  const availableFilters = WantedFilterTypes.filter((t) => !usedTypes.has(t));
  const selected = results.find((p) => p.id === selectedId) || results[0] || null;

  const sharedCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of results) {
      const values = new Set(wantedAllValues(p));
      let count = 0;
      for (const other of results) {
        if (other.id === p.id) continue;
        if (wantedAllValues(other).some((v) => values.has(v))) count++;
      }
      map.set(p.id, count);
    }
    return map;
  }, [results]);

  const addCriterion = (type: string) => setCriteria((prev) => [...prev, { id: String(nextId++), type: type as WantedFilterType, value: "" }]);
  const removeCriterion = (id: string) => setCriteria((prev) => prev.filter((c) => c.id !== id));
  const updateCriterion = (id: string, value: string) => setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)));
  const reset = () => { setCriteria([]); setResults([]); setSearched(false); setSelectedId(null); };

  const runSearch = async () => {
    const filled = criteria.filter((c) => c.value.trim());
    if (!filled.length) {
      toast({ title: "Criteres manquants", description: "Ajoutez au moins un critere de recherche.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      filled.forEach((c) => params.append(WantedFilterToApiParam[c.type], c.value.trim()));
      const res = await fetch(`/api/wanted/search?${params.toString()}`, { credentials: "include" });
      if (res.ok) {
        const data: WantedProfile[] = await res.json();
        setResults(data);
        setSelectedId(data[0]?.id ?? null);
      }
    } catch {
      toast({ title: "Erreur", description: "Recherche impossible.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
      {/* Colonne gauche : recherche + liste */}
      <div className="space-y-4 lg:sticky lg:top-6">
        <SearchPanel
          criteria={criteria}
          availableFilters={availableFilters}
          onAdd={addCriterion}
          onRemove={removeCriterion}
          onChange={updateCriterion}
          onSearch={runSearch}
          onReset={reset}
          loading={loading}
        />

        {searched && (
          <Card className="p-2 border-red-500/15">
            <div className="flex items-center justify-between px-1.5 py-1 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resultats</span>
              {results.length > 0 && (
                <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] h-4 px-1.5">{results.length}</Badge>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              </div>
            ) : results.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Aucun profil correspondant.</p>
            ) : (
              <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
                {results.map((p) => (
                  <ResultRow key={p.id} profile={p} active={p.id === selectedId} sharedCount={sharedCounts.get(p.id) || 0} onClick={() => setSelectedId(p.id)} />
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Colonne droite : detail */}
      <div>
        {!searched ? (
          <WantedEmptyState variant="idle" />
        ) : selected ? (
          <DetailPanel profile={selected} allResults={results} />
        ) : !loading && (
          <WantedEmptyState variant="no-results" />
        )}
      </div>
    </div>
  );
}

export default function WantedPage() {
  const { role, loading } = useAuth();
  const hasAccess = role === "admin" || role === "wanted";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) return <RedeemGate />;

  return (
    <div className="min-h-screen">
      <div className="border-b border-red-500/10 bg-gradient-to-b from-red-500/[0.04] to-transparent">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">Wanted</span>
            </h1>
            <p className="text-xs text-muted-foreground">Recherche parametrique et cartographie relationnelle</p>
          </div>
          {role === "wanted" && (
            <Badge className="ml-auto" style={{ color: "#fb923c", background: "rgba(251,146,60,0.1)", borderColor: "rgba(251,146,60,0.3)" }} variant="outline">
              Role Wanted actif
            </Badge>
          )}
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <WantedWorkspace />
      </div>
    </div>
  );
}
