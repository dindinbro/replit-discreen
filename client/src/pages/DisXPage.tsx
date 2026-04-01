import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, RotateCcw, ChevronRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLE_QUERIES = [
  "Je cherche un Kevin Martin, il a un frère qui s'appelle Dylan, ils habitent à Bordeaux, Kevin doit avoir 24-26 ans.",
  "Retrouve la famille Benali à Toulouse — le père s'appelle Mohamed, il a une fille prénommée Sarah née vers 2001.",
  "Je cherche une femme prénommée Nadia, elle habite dans le 93, son mari s'appelle Karim et ils ont un fils de 8 ans environ.",
  "Cherche Julien Moreau né vers 1988 à Strasbourg, il a une sœur prénommée Camille, même nom de famille.",
  "Je cherche un pseudo gamer connu sous le nom de 'ShadowFox', joue à GTA FiveM, probablement français.",
];

function formatMessage(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("📋") || line.startsWith("🎯") || line.startsWith("🔍") || line.startsWith("⚠️")) {
      const [emoji, ...rest] = line.split(" ");
      const text = rest.join(" ");
      const boldParsed = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return (
        <div key={i} className="mt-3 first:mt-0">
          <div className="flex items-start gap-2">
            <span className="text-base shrink-0">{emoji}</span>
            <span className="text-sm font-medium text-foreground" dangerouslySetInnerHTML={{ __html: boldParsed }} />
          </div>
        </div>
      );
    }
    if (line.startsWith("- ") || line.startsWith("• ")) {
      const text = line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return (
        <div key={i} className="flex items-start gap-2 ml-4 mt-1">
          <span className="text-primary/60 mt-0.5 shrink-0">·</span>
          <span className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-1" />;
    const boldParsed = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return (
      <p key={i} className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: boldParsed }} />
    );
  });
}

export default function DisXPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/disx/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-8),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.content) {
              full += data.content;
              setStreamingContent(full);
            }
          } catch {}
        }
      }

      setMessages(prev => [...prev, { role: "assistant", content: full }]);
      setStreamingContent("");
    } catch (err: any) {
      const msg = err?.message || "Erreur inconnue";
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Erreur : ${msg}` }]);
      setStreamingContent("");
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reset = () => {
    setMessages([]);
    setStreamingContent("");
    setInput("");
  };

  const isEmpty = messages.length === 0 && !streamingContent;

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
            </div>
            <p className="text-[11px] text-muted-foreground/70">Assistant OSINT · Analyse en langage naturel</p>
          </div>
        </div>
        {!isEmpty && (
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-muted-foreground hover:text-foreground" data-testid="button-disx-reset">
            <RotateCcw className="w-3.5 h-3.5" />
            Nouvelle session
          </Button>
        )}
      </div>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {/* Empty state — example queries */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground">Décris la personne que tu cherches</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                DisX analyse ta description en langage naturel, extrait les identifiants clés et te propose la meilleure stratégie de recherche sur Discreen.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-semibold px-1">Exemples</p>
              {EXAMPLE_QUERIES.map((q, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-border/30 bg-card/30 hover:bg-card/60 hover:border-primary/30 transition-all duration-200 group"
                  data-testid={`button-disx-example-${i}`}
                >
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-snug flex-1">{q}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 shrink-0 transition-colors" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Conversation */}
        <div className="max-w-2xl mx-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                  msg.role === "user"
                    ? "bg-primary/20 border border-primary/30 text-primary"
                    : "bg-card border border-border/40 text-muted-foreground"
                }`}>
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary/10 border border-primary/20 text-right"
                    : "bg-card/60 border border-border/30"
                }`}>
                  {msg.role === "user"
                    ? <p className="text-sm text-foreground">{msg.content}</p>
                    : <div className="space-y-1">{formatMessage(msg.content)}</div>
                  }
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Streaming */}
          {streamingContent && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-card border border-border/40">
                <Bot className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-card/60 border border-border/30">
                <div className="space-y-1">{formatMessage(streamingContent)}</div>
                <span className="inline-block w-1 h-4 bg-primary/60 animate-pulse ml-0.5 rounded-full" />
              </div>
            </motion.div>
          )}

          {/* Loading dots */}
          {loading && !streamingContent && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-card border border-border/40">
                <Bot className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-card/60 border border-border/30 flex items-center gap-1.5">
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/50"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          )}
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
            <Button
              size="icon"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="h-8 w-8 shrink-0 rounded-xl"
              data-testid="button-disx-send"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-2 text-center">
            Entrée pour envoyer · Maj+Entrée pour saut de ligne · Usage légal uniquement
          </p>
        </div>
      </div>
    </div>
  );
}
