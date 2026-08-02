import { useState } from "react";
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
import { FieldGroup, wantedFieldValues, wantedProfileLabel, WantedGraphView } from "@/components/WantedGraph";
import {
  ShieldAlert, KeyRound, Loader2, Plus, X, RotateCcw, Search,
  User, Mail, Phone, MapPin, Hash, MessageSquare, Fingerprint, CreditCard, Car, FileText,
  List, Network, Lock, Sparkles,
} from "lucide-react";

const FILTER_ICONS: Record<WantedFilterType, React.ElementType> = {
  nom: User, prenom: User, pseudo: User,
  email: Mail, phone: Phone, ipAddress: Hash,
  discordId: Hash, discord: MessageSquare, address: MapPin,
  password: KeyRound, iban: CreditCard, bic: CreditCard,
  plaque: Car, nir: Fingerprint, notes: FileText,
};

interface CriterionRow {
  id: string;
  type: WantedFilterType;
  value: string;
}

let nextId = 0;

function RedeemGate() {
  const { refreshRole } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 border-red-500/20 bg-gradient-to-b from-red-500/[0.04] to-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.06] via-transparent to-orange-500/[0.04] pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Lock className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight mb-1.5">Acces Wanted verrouille</h1>
            <p className="text-sm text-muted-foreground">
              Cette section necessite le role <span className="text-red-400 font-medium">Wanted</span>. Entrez un code
              d'activation unique fourni par un administrateur pour deverrouiller l'acces a votre compte.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="WANTED-XXXXXXXX"
              className="font-mono text-center"
              data-testid="input-wanted-code"
            />
            <Button
              onClick={submit}
              disabled={loading || !code.trim()}
              className="shrink-0 bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-wanted-redeem"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function WantedWorkspace() {
  const [criteria, setCriteria] = useState<CriterionRow[]>([]);
  const [results, setResults] = useState<WantedProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "graph">("list");
  const { toast } = useToast();

  const usedTypes = new Set(criteria.map((c) => c.type));
  const availableFilters = WantedFilterTypes.filter((t) => !usedTypes.has(t));

  const addCriterion = (type: string) => {
    setCriteria((prev) => [...prev, { id: String(nextId++), type: type as WantedFilterType, value: "" }]);
  };
  const removeCriterion = (id: string) => setCriteria((prev) => prev.filter((c) => c.id !== id));
  const updateCriterion = (id: string, value: string) =>
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)));
  const reset = () => { setCriteria([]); setResults([]); setSearched(false); };

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
      if (res.ok) setResults(await res.json());
    } catch {
      toast({ title: "Erreur", description: "Recherche impossible.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter builder */}
      <Card className="p-5 md:p-6 border-red-500/15 bg-gradient-to-br from-red-500/[0.03] to-transparent space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold">Criteres de recherche</h2>
          </div>
          {availableFilters.length > 0 && (
            <Select value="" onValueChange={addCriterion}>
              <SelectTrigger className="w-auto min-w-[180px] h-8 text-xs gap-1.5 rounded-full" data-testid="select-add-criterion">
                <Plus className="w-3.5 h-3.5" />
                <SelectValue placeholder="Ajouter un filtre" />
              </SelectTrigger>
              <SelectContent>
                {availableFilters.map((f) => (
                  <SelectItem key={f} value={f}>{WantedFilterLabels[f]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {criteria.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Ajoutez un filtre pour lancer une recherche.
          </div>
        ) : (
          <div className="space-y-2">
            {criteria.map((c) => {
              const Icon = FILTER_ICONS[c.type] || FileText;
              return (
                <div key={c.id} className="flex items-center gap-2 rounded-xl border border-red-500/10 bg-background/50 p-2 pr-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium w-28 shrink-0 hidden sm:block">{WantedFilterLabels[c.type]}</span>
                  <Input
                    value={c.value}
                    onChange={(e) => updateCriterion(c.id, e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runSearch()}
                    placeholder={WantedFilterLabels[c.type]}
                    className="h-8 text-sm flex-1 bg-transparent border-0 focus-visible:ring-1"
                    data-testid={`input-criterion-${c.id}`}
                  />
                  <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0" onClick={() => removeCriterion(c.id)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={runSearch}
            disabled={loading || !criteria.some((c) => c.value.trim())}
            className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white gap-2"
            data-testid="button-run-search"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Rechercher
          </Button>
          <Button variant="outline" onClick={reset} disabled={loading} className="h-10 gap-2">
            <RotateCcw className="w-4 h-4" /> Reinitialiser
          </Button>
        </div>
      </Card>

      {/* Results */}
      {searched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">Resultats</span>
              {results.length > 0 && (
                <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20">{results.length}</Badge>
              )}
            </h3>
            {results.length > 0 && (
              <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1">
                <Button size="sm" variant={viewMode === "list" ? "default" : "ghost"} className="h-7 text-xs" onClick={() => setViewMode("list")} data-testid="button-view-list">
                  <List className="w-3.5 h-3.5 mr-1.5" /> Liste
                </Button>
                <Button size="sm" variant={viewMode === "graph" ? "default" : "ghost"} className="h-7 text-xs" onClick={() => setViewMode("graph")} data-testid="button-view-graph">
                  <Network className="w-3.5 h-3.5 mr-1.5" /> Graphe
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            </div>
          ) : results.length === 0 ? (
            <Card className="p-12 text-center space-y-3 border-dashed border-red-500/20">
              <ShieldAlert className="w-10 h-10 text-red-500/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Aucun profil correspondant.</p>
            </Card>
          ) : viewMode === "graph" ? (
            <WantedGraphView profiles={results} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map((profile) => (
                <Card key={profile.id} className="p-4 space-y-3 border-red-500/15" data-testid={`card-result-${profile.id}`}>
                  <div className="flex items-center gap-2.5 pb-3 border-b border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{wantedProfileLabel(profile)}</p>
                      {profile.pseudo && <p className="text-xs text-muted-foreground truncate">@{profile.pseudo}</p>}
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <FieldGroup icon={Mail} label="Emails" values={wantedFieldValues(profile, "emails")} />
                    <FieldGroup icon={Phone} label="Telephones" values={wantedFieldValues(profile, "phones")} />
                    <FieldGroup icon={MapPin} label="Adresses" values={wantedFieldValues(profile, "addresses")} />
                    <FieldGroup icon={Hash} label="IPs" values={wantedFieldValues(profile, "ips")} />
                    <FieldGroup icon={MessageSquare} label="Discord IDs" values={wantedFieldValues(profile, "discordIds")} />
                    {profile.notes && (
                      <div className="space-y-1 pt-1">
                        <p className="text-xs font-medium text-muted-foreground">Notes</p>
                        <p className="text-xs text-foreground/80 line-clamp-3">{profile.notes}</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WantedPage() {
  const { role, loading } = useAuth();
  const hasAccess = role === "admin" || role === "wanted";

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">Wanted</span>
          </h1>
          <p className="text-sm text-muted-foreground">Recherche parametrique de profils recherches</p>
        </div>
        {role === "wanted" && (
          <Badge className="ml-auto" style={{ color: "#fb923c", background: "rgba(251,146,60,0.1)", borderColor: "rgba(251,146,60,0.3)" }} variant="outline">
            Role Wanted actif
          </Badge>
        )}
      </div>

      {hasAccess ? <WantedWorkspace /> : <RedeemGate />}
    </div>
  );
}
