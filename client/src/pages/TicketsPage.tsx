import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Ticket, ChevronLeft, Send, RefreshCw, Lock, XCircle } from "lucide-react";
import type { SupportTicket, TicketReply } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  ouvert: "bg-green-500/15 text-green-400 border-green-500/30",
  "en cours": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "fermé": "bg-muted text-muted-foreground border-border",
};

const PRIORITY_COLORS: Record<string, string> = {
  faible: "bg-muted text-muted-foreground border-border",
  moyen: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  urgent: "bg-destructive/15 text-destructive border-destructive/30",
};

const CAT_LABELS: Record<string, string> = { bug: "🐛 Bug", paiement: "💳 Paiement", question: "❓ Question", autre: "📋 Autre" };
const PRI_LABELS: Record<string, string> = { faible: "Faible", moyen: "Moyen", urgent: "🔴 Urgent" };

function NewTicketForm({ onCreated, getAccessToken }: { onCreated: () => void; getAccessToken: () => string | null }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("question");
  const [priority, setPriority] = useState("moyen");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const token = getAccessToken();
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    <Card className="p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Plus className="w-5 h-5 text-primary" /> Nouveau ticket
      </h2>
      <div>
        <label className="text-sm font-medium mb-1 block">Sujet</label>
        <Input
          placeholder="Décris ton problème en quelques mots..."
          value={subject}
          onChange={e => setSubject(e.target.value)}
          maxLength={200}
          data-testid="input-ticket-subject"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Catégorie</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="select-ticket-category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">🐛 Bug</SelectItem>
              <SelectItem value="paiement">💳 Paiement</SelectItem>
              <SelectItem value="question">❓ Question</SelectItem>
              <SelectItem value="autre">📋 Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Priorité</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger data-testid="select-ticket-priority"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="faible">Faible</SelectItem>
              <SelectItem value="moyen">Moyen</SelectItem>
              <SelectItem value="urgent">🔴 Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Message</label>
        <Textarea
          placeholder="Décris ton problème en détail..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          maxLength={4000}
          data-testid="textarea-ticket-message"
        />
        <p className="text-xs text-muted-foreground mt-1">{message.length}/4000</p>
      </div>
      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !subject.trim() || !message.trim()}
        className="w-full"
        data-testid="button-submit-ticket"
      >
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
        Envoyer le ticket
      </Button>
    </Card>
  );
}

function TicketDetail({ ticketId, getAccessToken, onBack }: { ticketId: number; getAccessToken: () => string | null; onBack: () => void }) {
  const [reply, setReply] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<{ ticket: SupportTicket; replies: TicketReply[] }>({
    queryKey: ["/api/tickets", ticketId],
    queryFn: async () => {
      const token = getAccessToken();
      const res = await fetch(`/api/tickets/${ticketId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const token = getAccessToken();
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
      const token = getAccessToken();
      const res = await fetch(`/api/tickets/${ticketId}/close`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
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

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const { ticket, replies } = data!;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2" data-testid="button-back-tickets">
        <ChevronLeft className="w-4 h-4" /> Mes tickets
      </Button>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">{ticket.subject}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[ticket.status] ?? ""}`}>{ticket.status}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>{PRI_LABELS[ticket.priority] ?? ticket.priority}</span>
              <span className="text-xs text-muted-foreground">{CAT_LABELS[ticket.category] ?? ticket.category}</span>
              <span className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString("fr-FR")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ticket.status !== "fermé" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => { if (window.confirm("Fermer ce ticket ? Tu ne pourras plus y répondre.")) closeMutation.mutate(); }}
                disabled={closeMutation.isPending}
                data-testid="button-close-ticket"
              >
                {closeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Fermer le ticket
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {replies.map(r => (
          <div key={r.id} className={`flex gap-3 ${r.isAdmin ? "flex-row-reverse" : ""}`} data-testid={`reply-${r.id}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${r.isAdmin ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {r.isAdmin ? "A" : (r.username?.[0] ?? "?").toUpperCase()}
            </div>
            <div className={`flex-1 max-w-[80%] ${r.isAdmin ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{r.isAdmin ? "Support" : r.username}</span>
                <span>{new Date(r.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${r.isAdmin ? "bg-primary/10 border border-primary/20 text-foreground" : "bg-muted text-foreground"}`}>
                {r.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      {ticket.status !== "fermé" ? (
        <Card className="p-4 space-y-3">
          <Textarea
            placeholder="Écrire une réponse..."
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={3}
            maxLength={4000}
            data-testid="textarea-reply"
          />
          <Button
            onClick={() => replyMutation.mutate()}
            disabled={replyMutation.isPending || !reply.trim()}
            className="w-full"
            data-testid="button-send-reply"
          >
            {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Envoyer
          </Button>
        </Card>
      ) : (
        <Card className="p-4 flex items-center gap-3 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="text-sm">Ce ticket est fermé. Crée un nouveau ticket si tu as d'autres questions.</span>
        </Card>
      )}
    </div>
  );
}

export default function TicketsPage() {
  const { user, getAccessToken } = useAuth();
  const [, navigate] = useLocation();
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: tickets = [], isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/tickets"],
    queryFn: async () => {
      const token = getAccessToken();
      const res = await fetch("/api/tickets", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <Ticket className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Connecte-toi pour accéder au support.</p>
        <Button className="mt-4" onClick={() => navigate("/login")}>Se connecter</Button>
      </div>
    );
  }

  if (selectedId !== null) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <TicketDetail ticketId={selectedId} getAccessToken={getAccessToken as () => string | null} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" /> Mes tickets support
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowNew(v => !v)} data-testid="button-new-ticket">
          <Plus className="w-4 h-4 mr-2" /> Nouveau ticket
        </Button>
      </div>

      {showNew && <NewTicketForm onCreated={() => setShowNew(false)} getAccessToken={getAccessToken as () => string | null} />}

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : tickets.length === 0 ? (
        <Card className="p-12 text-center">
          <Ticket className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun ticket pour l'instant.</p>
          <Button className="mt-4" onClick={() => setShowNew(true)}>Créer mon premier ticket</Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <Card
              key={t.id}
              className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setSelectedId(t.id)}
              data-testid={`ticket-card-${t.id}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.subject}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">{CAT_LABELS[t.category] ?? t.category}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.updatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[t.priority] ?? ""}`}>{PRI_LABELS[t.priority] ?? t.priority}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[t.status] ?? ""}`}>{t.status}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
