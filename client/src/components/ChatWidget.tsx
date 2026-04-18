import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Trash2, VolumeX, ChevronDown } from "lucide-react";
import type { ChatMessage } from "@shared/schema";

const TIER_COLORS: Record<string, string> = {
  admin: "text-destructive",
  pro: "text-yellow-400",
  vip: "text-primary",
  business: "text-purple-400",
  api: "text-green-400",
  free: "text-muted-foreground",
};

const TIER_BADGE: Record<string, string> = {
  admin: "bg-destructive/20 text-destructive border-destructive/30",
  pro: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  vip: "bg-primary/20 text-primary border-primary/30",
  business: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  api: "bg-green-500/20 text-green-400 border-green-500/30",
};

function formatTime(d: string | Date) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWidget() {
  const { user, getAccessToken, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [unread, setUnread] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAdmin = role === "admin";

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    const socket = io(window.location.origin, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat:history", (history: ChatMessage[]) => {
      setMessages(history);
      if (open) scrollToBottom();
    });
    socket.on("chat:message", (msg: ChatMessage) => {
      setMessages(prev => [...prev.slice(-499), msg]);
      if (!open) setUnread(u => u + 1);
      else scrollToBottom();
    });
    socket.on("chat:deleted", ({ id }: { id: number }) => {
      setMessages(prev => prev.filter(m => m.id !== id));
    });
    socket.on("chat:cleared", () => setMessages([]));
    socket.on("chat:error", ({ message }: { message: string }) => {
      setError(message);
      setTimeout(() => setError(null), 4000);
    });

    return () => { socket.disconnect(); };
  }, [user]);

  useEffect(() => {
    if (open) { setUnread(0); scrollToBottom(); }
  }, [open]);

  function sendMessage() {
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit("chat:message", { message: input.trim() });
    setInput("");
  }

  function deleteMessage(id: number) {
    socketRef.current?.emit("chat:delete", { id });
  }

  function muteUser(userId: string, username: string) {
    const dur = window.prompt(`Durée du mute de ${username} en minutes (vide = permanent) :`);
    if (dur === null) return;
    const reason = window.prompt("Raison (optionnel) :") ?? undefined;
    socketRef.current?.emit("chat:mute", {
      userId,
      reason: reason || undefined,
      durationMinutes: dur ? parseInt(dur) : undefined,
    });
  }

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-primary shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-110 relative"
        style={{ width: 52, height: 52 }}
        data-testid="button-open-chat"
      >
        <MessageCircle className="w-6 h-6 text-primary-foreground" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 w-[340px] sm:w-[380px] flex flex-col rounded-2xl border border-border/60 bg-background shadow-2xl overflow-hidden"
          style={{ height: 480 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-colors ${connected ? "bg-green-400" : "bg-muted-foreground"}`} />
              <span className="font-semibold text-sm">Chat Discreen</span>
              <span className="text-xs text-muted-foreground">salon global</span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="w-7 h-7" onClick={scrollToBottom}>
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setOpen(false)} data-testid="button-close-chat">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Aucun message pour l'instant. Sois le premier !
              </div>
            )}
            {messages.map(msg => {
              const isOwn = msg.userId === user?.id;
              return (
                <div key={msg.id} className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : ""}`} data-testid={`chat-msg-${msg.id}`}>
                  <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs font-bold">
                    {msg.avatarUrl
                      ? <img src={msg.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : <span className={TIER_COLORS[msg.tier] ?? ""}>{msg.username[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold ${TIER_COLORS[msg.tier] ?? "text-muted-foreground"}`}>{msg.username}</span>
                      {TIER_BADGE[msg.tier] && (
                        <span className={`text-[9px] px-1 rounded border font-medium ${TIER_BADGE[msg.tier]}`}>{msg.tier.toUpperCase()}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                    </div>
                    <div className={`rounded-xl px-3 py-1.5 text-sm break-words ${isOwn ? "bg-primary/15 border border-primary/20" : "bg-muted"}`}>
                      {msg.message}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                      <button onClick={() => deleteMessage(msg.id)} title="Supprimer" className="text-muted-foreground hover:text-destructive p-0.5">
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {!isOwn && (
                        <button onClick={() => muteUser(msg.userId, msg.username)} title="Muter" className="text-muted-foreground hover:text-yellow-500 p-0.5">
                          <VolumeX className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="px-3 py-2 text-xs text-destructive bg-destructive/10 border-t border-destructive/20">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-3 border-t border-border/40 bg-muted/10">
            <Input
              className="h-8 text-sm"
              placeholder="Écrire un message... (Entrée pour envoyer)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              maxLength={500}
              data-testid="input-chat-message"
            />
            <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendMessage} disabled={!input.trim()} data-testid="button-send-chat">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
