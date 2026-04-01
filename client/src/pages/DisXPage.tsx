import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, RotateCcw, ChevronRight, Database, Brain, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const FILTER_LABELS: Record<string, string> = {
  firstName: "Prénom", lastName: "Nom", dob: "Date naiss.", yob: "Année naiss.",
  city: "Ville", email: "Email", phone: "Téléphone", username: "Username",
  ipAddress: "IP", discordId: "Discord ID", address: "Adresse",
  displayName: "Nom affiché", ssn: "NIR", zipCode: "Code postal",
};

const EXAMPLE_QUERIES = [
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
  status: SearchStatus;
  criteria: Criterion[];
  results: any[];
  total: number;
  summary: string;
  errorMsg?: string;
}

function CriterionBadge({ c }: { c: Criterion }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/25">
      <span className="text-primary/50">{FILTER_LABELS[c.type] || c.type}</span>
      <span>{c.value}</span>
    </span>
  );
}

function ResultCard({ record }: { record: any }) {
  const entries = Object.entries(record).filter(([k, v]) =>
    v !== null && v !== undefined && v !== "" && k !== "source" && k !== "_score"
  );
  const source = record.source || record._source || "";
  return (
    <div className="rounded-xl border border-border/30 bg-card/40 p-3 space-y-2">
      {source && (
        <div className="text-[10px] text-primary/60 font-semibold uppercase tracking-wider">{source}</div>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {entries.slice(0, 10).map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <span className="text-[10px] text-muted-foreground/50 uppercase">{FILTER_LABELS[k] || k}</span>
            <span className="text-xs text-foreground font-medium truncate">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusLine({ status }: { status: SearchStatus }) {
  if (status === "extracting") return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Brain className="w-3.5 h-3.5 text-primary animate-pulse" />
      <span>Analyse de la requête en cours...</span>
    </div>
  );
  if (status === "searching") return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Search className="w-3.5 h-3.5 text-primary animate-pulse" />
      <span>Recherche dans les bases de données...</span>
    </div>
  );
  if (status === "summarizing") return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
      <span>Analyse des résultats...</span>
    </div>
  );
  return null;
}

export default function DisXPage() {
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  const updateEntry = (id: number, patch: Partial<SearchEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setInput("");
    setLoading(true);

    const entryId = ++idRef.current;
    const newEntry: SearchEntry = {
      id: entryId, query: content, status: "extracting",
      criteria: [], results: [], total: 0, summary: "",
    };
    setEntries(prev => [...prev, newEntry]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/disx/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: content }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        updateEntry(entryId, { status: "error", errorMsg: err?.error || `HTTP ${res.status}` });
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
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
      updateEntry(entryId, { status: "error", errorMsg: err?.message || "Erreur réseau" });
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] lg:h-screen max-h-screen overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 border-b border-border/30 px-6 py-3 flex items-center justify-between bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base text-foreground">DisX</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-semibold">IA</span>
              <span className="text-[10px] font-bold text-red-500 tracking-wide">soon</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70">Recherche naturelle · Résultats réels</p>
          </div>
        </div>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setEntries([])}
            className="gap-1.5 text-muted-foreground hover:text-foreground" data-testid="button-disx-reset">
            <RotateCcw className="w-3.5 h-3.5" />
            Effacer
          </Button>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">

        {/* Empty state */}
        {entries.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground">Décris la personne que tu cherches</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                DisX analyse ta description, extrait les critères et lance une vraie recherche dans les bases de données Discreen.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground/50 uppercase tracking-wider font-semibold px-1">Exemples</p>
              {EXAMPLE_QUERIES.map((q, i) => (
                <motion.button key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-border/30 bg-card/30 hover:bg-card/60 hover:border-primary/30 transition-all duration-200 group"
                  data-testid={`button-disx-example-${i}`}>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">{q}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 shrink-0 transition-colors" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search entries */}
        <div className="max-w-2xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {entries.map(entry => (
              <motion.div key={entry.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-3">

                {/* User query */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3">
                    <p className="text-sm text-foreground">{entry.query}</p>
                  </div>
                </div>

                {/* Response block */}
                <div className="rounded-2xl border border-border/30 bg-card/40 p-4 space-y-3">

                  {/* Status line */}
                  <StatusLine status={entry.status} />

                  {/* Criteria */}
                  {entry.criteria.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">Critères extraits</p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.criteria.map((c, i) => <CriterionBadge key={i} c={c} />)}
                      </div>
                    </div>
                  )}

                  {/* Results */}
                  {(entry.status === "summarizing" || entry.status === "done") && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
                          Résultats
                        </p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          entry.total > 0
                            ? "bg-green-500/15 text-green-400 border border-green-500/25"
                            : "bg-muted/30 text-muted-foreground border border-border/30"
                        }`}>
                          {entry.total} trouvé{entry.total > 1 ? "s" : ""}
                        </span>
                      </div>

                      {entry.results.length === 0 ? (
                        <div className="rounded-xl border border-border/20 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                          Aucun résultat dans les bases de données pour ces critères.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {entry.results.slice(0, 5).map((r, i) => (
                            <ResultCard key={i} record={r} />
                          ))}
                          {entry.total > 5 && (
                            <p className="text-xs text-muted-foreground/50 text-center">
                              + {entry.total - 5} résultats supplémentaires disponibles via la recherche Paramétrique
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Summary */}
                  {entry.summary && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">Analyse DisX</p>
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        {entry.summary}
                        {entry.status === "summarizing" && (
                          <span className="inline-block w-1 h-3.5 bg-primary/60 animate-pulse ml-0.5 rounded-full align-middle" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Done indicator */}
                  {entry.status === "done" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 pt-1 border-t border-border/20">
                      <CheckCircle2 className="w-3 h-3 text-green-500/60" />
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
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 border-t border-border/30 px-4 md:px-8 py-4 bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto">
          <div className="relative flex items-end gap-2 rounded-2xl border border-border/40 bg-card/50 px-4 py-3 focus-within:border-primary/40 transition-colors">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Décris la personne que tu cherches..."
              rows={1}
              className="flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/40 max-h-32"
              data-testid="input-disx-message"
            />
            <Button size="icon" onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="h-8 w-8 shrink-0 rounded-xl" data-testid="button-disx-send">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-2 text-center">
            Entrée pour lancer · Maj+Entrée pour saut de ligne · Usage légal uniquement
          </p>
        </div>
      </div>
    </div>
  );
}
