import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, MessageSquare, ChevronLeft, Send, RefreshCw,
  Lock, XCircle, LifeBuoy, Clock, CheckCircle2, ChevronRight,
} from "lucide-react";
import type { SupportTicket, TicketReply } from "@shared/schema";

/* ── helpers ────────────────────────────────────────────── */
const STATUS_COLOR: Record<string, string> = {
  ouvert:    "bg-green-500/15 text-green-400 border-green-500/30",
  "en cours":"bg-amber-400/15 text-amber-400 border-amber-400/30",
  "fermé":   "bg-muted/60 text-muted-foreground border-border/50",
};
const PRIORITY_COLOR: Record<string, string> = {
  faible: "bg-muted/60 text-muted-foreground border-border/50",
  moyen:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  urgent: "bg-destructive/15 text-destructive border-destructive/30",
};
const CAT_LABEL: Record<string, string> = { bug: "🐛 Bug", paiement: "💳 Paiement", question: "❓ Question", autre: "📋 Autre" };
const PRI_LABEL: Record<string, string> = { faible: "Faible", moyen: "Moyen", urgent: "🔴 Urgent" };

async function authFetch(url: string, options: RequestInit = {}) {
  return fetch(url, { ...options, credentials: "include" });
}

/* ── Stat card ──────────────────────────────────────────── */
function StatCard({ icon: Icon, value, label, accent }: { icon: React.ElementType; value: number; label: string; accent?: boolean }) {
  return (
    <div className="flex-1 rounded-xl border border-border/50 bg-card/60 p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accent ? "bg-primary/15 text-primary" : "bg-secondary/50 text-muted-foreground"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ── New ticket form ────────────────────────────────────── */
function NewTicketForm({ onCreated }: { onCreated: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("question");
  const [priority, setPriority] = useState("moyen");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, priority, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Ticket créé avec succès !" });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setSubject(""); setMessage(""); setCategory("question"); setPriority("moyen");
      onCreated();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <Plus className="w-4 h-4 text-primary" /> Nouveau ticket
      </h2>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sujet</label>
        <Input
          placeholder="Décris ton problème en quelques mots…"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          maxLength={200}
          className="bg-secondary/30 border-border/50 focus-visible:border-primary/60"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Catégorie</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">🐛 Bug</SelectItem>
              <SelectItem value="paiement">💳 Paiement</SelectItem>
              <SelectItem value="question">❓ Question</SelectItem>
              <SelectItem value="autre">📋 Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priorité</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="faible">Faible</SelectItem>
              <SelectItem value="moyen">Moyen</SelectItem>
              <SelectItem value="urgent">🔴 Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Message</label>
        <Textarea
          placeholder="Décris ton problème en détail…"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          maxLength={4000}
          className="bg-secondary/30 border-border/50 focus-visible:border-primary/60 resize-none"
        />
        <p className="text-xs text-muted-foreground/60 text-right">{message.length}/4000</p>
      </div>
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !subject.trim() || !message.trim()}
        className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
      >
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Envoyer le ticket
      </button>
    </div>
  );
}

/* ── Ticket detail ──────────────────────────────────────── */
function TicketDetail({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const [reply, setReply] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<{ ticket: SupportTicket; replies: TicketReply[] }>({
    queryKey: ["/api/tickets", ticketId],
    queryFn: async () => {
      const res = await authFetch(`/api/tickets/${ticketId}`);
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      return d;
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/tickets/${ticketId}/close`, { method: "PATCH" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
    },
    onSuccess: () => {
      toast({ title: "Ticket fermé" });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const { ticket, replies } = data!;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-4 h-4" /> Mes tickets
      </button>

      <div className="rounded-xl border border-border/60 bg-card/60 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold">{ticket.subject}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[ticket.status] ?? ""}`}>{ticket.status}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLOR[ticket.priority] ?? ""}`}>{PRI_LABEL[ticket.priority] ?? ticket.priority}</span>
              <span className="text-xs text-muted-foreground">{CAT_LABEL[ticket.category] ?? ticket.category}</span>
              <span className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString("fr-FR")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ticket.status !== "fermé" && (
              <button
                onClick={() => { if (window.confirm("Fermer ce ticket ?")) closeMutation.mutate(); }}
                disabled={closeMutation.isPending}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
              >
                {closeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Fermer
              </button>
            )}
            <button onClick={() => refetch()} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {replies.map(r => (
          <div key={r.id} className={`flex gap-3 ${r.isAdmin ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${r.isAdmin ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {r.isAdmin ? "S" : (r.username?.[0] ?? "?").toUpperCase()}
            </div>
            <div className={`flex-1 max-w-[80%] ${r.isAdmin ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{r.isAdmin ? "Support" : r.username}</span>
                <span>{new Date(r.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${r.isAdmin ? "bg-primary/10 border border-primary/20 text-foreground" : "bg-secondary/40 text-foreground border border-border/30"}`}>
                {r.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      {ticket.status !== "fermé" ? (
        <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
          <Textarea
            placeholder="Écrire une réponse…"
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={3}
            maxLength={4000}
            className="bg-secondary/30 border-border/50 focus-visible:border-primary/60 resize-none"
          />
          <button
            onClick={() => replyMutation.mutate()}
            disabled={replyMutation.isPending || !reply.trim()}
            className="w-full h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Répondre
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card/30 p-4 flex items-center gap-3 text-muted-foreground">
          <Lock className="w-4 h-4 shrink-0" />
          <span className="text-sm">Ce ticket est fermé. Créez-en un nouveau si vous avez d'autres questions.</span>
        </div>
      )}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────── */
export default function TicketsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: tickets = [], isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/tickets"],
    queryFn: async () => {
      const res = await authFetch("/api/tickets");
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!user,
  });

  if (!user) return (
    <div className="max-w-xl mx-auto py-20 text-center px-4">
      <LifeBuoy className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
      <p className="text-muted-foreground mb-4">Connectez-vous pour accéder au support.</p>
      <button onClick={() => navigate("/login")} className="h-9 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
        Se connecter
      </button>
    </div>
  );

  if (selectedId !== null) return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <TicketDetail ticketId={selectedId} onBack={() => setSelectedId(null)} />
    </div>
  );

  const open = tickets.filter(t => t.status === "ouvert").length;
  const pending = tickets.filter(t => t.status === "en cours").length;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      {/* Hero */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold font-display">Centre d'aide</h1>
        <p className="text-muted-foreground text-sm">Créez un ticket et notre équipe vous répondra rapidement.</p>
        <div className="pt-2">
          <button
            onClick={() => setShowNew(v => !v)}
            className="inline-flex items-center gap-2 h-9 px-5 rounded-lg border border-border/60 bg-card/60 text-sm font-medium hover:bg-secondary/40 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouveau ticket
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <StatCard icon={MessageSquare} value={tickets.length} label="Total" />
        <StatCard icon={CheckCircle2} value={open} label="Ouverts" accent />
        <StatCard icon={Clock} value={pending} label="En attente" />
      </div>

      {/* New form */}
      {showNew && <NewTicketForm onCreated={() => setShowNew(false)} />}

      {/* List */}
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70">Mes tickets</p>
        {isLoading ? (
          <div className="rounded-xl border border-border/50 bg-card/40 p-12 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Chargement de vos tickets…</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card/40 p-12 text-center">
            <LifeBuoy className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun ticket pour l'instant.</p>
            <button onClick={() => setShowNew(true)} className="mt-3 text-sm text-primary hover:underline">
              Créer mon premier ticket
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {tickets.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className="flex items-center gap-4 rounded-xl border border-border/50 bg-card/50 px-4 py-3.5 cursor-pointer hover:bg-secondary/30 hover:border-border transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {CAT_LABEL[t.category] ?? t.category} · {new Date((t as any).updatedAt ?? t.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLOR[t.priority] ?? ""}`}>{PRI_LABEL[t.priority] ?? t.priority}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[t.status] ?? ""}`}>{t.status}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
