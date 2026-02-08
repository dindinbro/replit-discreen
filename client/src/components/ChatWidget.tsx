import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Loader2, ShieldCheck } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const createConversation = async (): Promise<number> => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Support Chat" }),
    });
    const data = await res.json();
    setConversationId(data.id);
    return data.id;
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      let convId = conversationId;
      if (!convId) {
        convId = await createConversation();
      }

      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.done) break;
              if (json.content) {
                assistantContent += json.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch {
              // skip parse errors
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Desole, une erreur est survenue. Veuillez reessayer.",
          };
          return updated;
        }
        return [
          ...prev,
          {
            role: "assistant",
            content: "Desole, une erreur est survenue. Veuillez reessayer.",
          },
        ];
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-[1000] w-[380px] max-w-[calc(100vw-2rem)]">
          <Card
            className="flex flex-col overflow-visible shadow-2xl border border-border"
            data-testid="card-chat-widget"
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-primary/10 rounded-t-md">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <span className="font-semibold text-sm block leading-tight">
                    Assistant Discreen
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    En ligne
                  </span>
                </div>
              </div>
              <Button
                data-testid="button-chat-close"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setOpen(false);
                  setMessages([]);
                  setConversationId(null);
                  setInput("");
                }}
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-col h-[380px] overflow-y-auto p-3 space-y-3 bg-background/50">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary flex-shrink-0 flex items-center justify-center mt-1">
                  <ShieldCheck className="w-3 h-3 text-primary-foreground" />
                </div>
                <div
                  className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%] text-sm leading-relaxed"
                  data-testid="text-chat-greeting"
                >
                  En quoi puis-je vous aider ?
                </div>
              </div>

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  data-testid={`chat-message-${msg.role}-${i}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-primary flex-shrink-0 flex items-center justify-center mb-0.5">
                      <ShieldCheck className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-tl-sm"
                    }`}
                  >
                    {msg.content || (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex items-center gap-2 p-3 border-t border-border">
              <input
                ref={inputRef}
                data-testid="input-chat-message"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question..."
                disabled={isStreaming}
                className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
              />
              <Button
                data-testid="button-chat-send"
                size="icon"
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className="rounded-full flex-shrink-0"
                title="Envoyer"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Button
        data-testid="button-chat-toggle"
        className="fixed bottom-4 right-4 z-[1000] rounded-full shadow-lg"
        size="icon"
        onClick={() => setOpen(!open)}
        title={open ? "Fermer" : "Assistant"}
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
      </Button>
    </>
  );
}
