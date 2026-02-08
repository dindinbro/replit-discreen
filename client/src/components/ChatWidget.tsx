import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Loader2, ShieldCheck, ArrowLeft, RotateCcw } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TopicNode {
  label: string;
  response?: string;
  children?: TopicNode[];
}

const TOPIC_TREE: TopicNode[] = [
  {
    label: "Abonnements",
    response: "Voici nos differents abonnements. Quel plan t'interesse ?",
    children: [
      {
        label: "Free",
        response: "Le plan Free est gratuit : 5 recherches par jour, bases de donnees limitees, recherche basique uniquement. Ideal pour decouvrir la plateforme.",
      },
      {
        label: "VIP - 6,99\u20ac/mois",
        response: "Le plan VIP a 6,99\u20ac/mois inclut : 50 recherches/jour, acces aux donnees FiveM, recherche par Email/IP, recherches Discord et externes, et acces a toutes les bases de donnees.",
      },
      {
        label: "PRO - 14,99\u20ac/mois",
        response: "Le plan PRO a 14,99\u20ac/mois inclut : 200 recherches/jour, toutes les fonctionnalites VIP + systeme de parrainage.",
      },
      {
        label: "Business - 24,99\u20ac/mois",
        response: "Le plan Business a 24,99\u20ac/mois inclut : 500 recherches/jour, toutes les fonctionnalites PRO + support prioritaire.",
      },
      {
        label: "API - 49,99\u20ac/mois",
        response: "Le plan API a 49,99\u20ac/mois inclut : recherches illimitees, cle API dediee, endpoint /api/v1/search, support premium et possibilite de revente. Gere tes cles depuis /api-keys.",
      },
    ],
  },
  {
    label: "Paiement",
    response: "Que veux-tu savoir sur le paiement ?",
    children: [
      {
        label: "Comment payer ?",
        response: "Les paiements sont traites via Plisio en crypto-monnaie. Rends-toi sur la page Tarifs (/pricing), choisis ton plan et suis le processus de paiement. Ton abonnement sera active automatiquement apres confirmation.",
      },
      {
        label: "Cle de licence",
        response: "Tu peux activer un abonnement avec une cle de licence. Sur la page Tarifs (/pricing), clique sur \"Utiliser une cle de licence\" et entre ta cle. Chaque cle est a usage unique.",
      },
      {
        label: "Duree de l'abonnement",
        response: "Les abonnements payants durent 30 jours et sont renouveles mensuellement. Les credits de recherche se renouvellent automatiquement chaque jour a minuit. Les recherches non utilisees ne sont pas cumulables.",
      },
    ],
  },
  {
    label: "Probleme de cle",
    response: "Quel probleme rencontres-tu avec ta cle ?",
    children: [
      {
        label: "Cle invalide",
        response: "Si ta cle de licence est invalide, verifie que tu l'as bien copiee sans espace supplementaire. Si le probleme persiste, ouvre un ticket sur Discord pour obtenir de l'aide.",
      },
      {
        label: "Cle deja utilisee",
        response: "Chaque cle de licence est a usage unique. Si ta cle a deja ete utilisee, tu devras en obtenir une nouvelle. Contacte le support via Discord.",
      },
      {
        label: "Cle API",
        response: "Pour les cles API (plan API uniquement), rends-toi sur /api-keys pour creer, lister ou revoquer tes cles. L'endpoint principal est /api/v1/search.",
      },
    ],
  },
  {
    label: "Recherches",
    response: "Que veux-tu savoir sur les recherches ?",
    children: [
      {
        label: "Comment chercher ?",
        response: "Connecte-toi, va sur la page d'accueil ou /search, selectionne un critere (email, pseudo, telephone, IP...) et lance ta recherche. Les resultats sont groupes par source.",
      },
      {
        label: "Types de recherche",
        response: "Les types disponibles : recherche par criteres (interne), recherche globale (LeakOSINT), recherche Discord, decodeur NIR, recherche telephone, et GeoIP. Certains necessitent un plan VIP ou superieur.",
      },
      {
        label: "Limite atteinte",
        response: "Chaque plan a un nombre de recherches quotidiennes. Les credits se renouvellent chaque jour a minuit. Si tu as atteint ta limite, tu peux passer a un plan superieur sur /pricing.",
      },
    ],
  },
  {
    label: "Mon compte",
    response: "Que veux-tu savoir sur ton compte ?",
    children: [
      {
        label: "Modifier mon profil",
        response: "Rends-toi sur /profile (accessible via le menu sur ton nom dans l'en-tete). Tu peux y changer ton avatar (URL), ton nom d'affichage (Pro+ uniquement) et activer la 2FA avec Google Authenticator.",
      },
      {
        label: "Compte gele",
        response: "Si ton compte est gele, contacte le support via Discord. Un administrateur examinera ta situation et pourra degeler ton compte si necessaire.",
      },
      {
        label: "Supprimer mon compte",
        response: "Tu peux demander la suppression de ton compte a tout moment. Contacte le support via Discord ou la page /contact pour faire ta demande.",
      },
    ],
  },
  {
    label: "Autre question",
    response: "Pour toute autre question, tu peux :\n\n1. Ouvrir un ticket sur Discord\n2. Utiliser la page /contact\n3. Consulter la documentation sur /documentation\n\nTu peux aussi taper ta question ci-dessous et je ferai de mon mieux pour t'aider.",
  },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTopics, setCurrentTopics] = useState<TopicNode[]>(TOPIC_TREE);
  const [topicStack, setTopicStack] = useState<{ label: string; topics: TopicNode[] }[]>([]);
  const [atLeaf, setAtLeaf] = useState(false);
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
  }, [messages, currentTopics, atLeaf, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setMessages([]);
    setCurrentTopics(TOPIC_TREE);
    setTopicStack([]);
    setAtLeaf(false);
    setConversationId(null);
    setInput("");
  };

  const handleTopicClick = (topic: TopicNode) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: topic.label },
      { role: "assistant", content: topic.response || "" },
    ]);

    if (topic.children && topic.children.length > 0) {
      setTopicStack((prev) => [...prev, { label: topic.label, topics: currentTopics }]);
      setCurrentTopics(topic.children);
      setAtLeaf(false);
    } else {
      setAtLeaf(true);
    }
  };

  const handleBack = () => {
    if (topicStack.length > 0) {
      const prev = topicStack[topicStack.length - 1];
      setCurrentTopics(prev.topics);
      setTopicStack((s) => s.slice(0, -1));
      setAtLeaf(false);
    }
  };

  const handleRestart = () => {
    setCurrentTopics(TOPIC_TREE);
    setTopicStack([]);
    setAtLeaf(false);
  };

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
    setAtLeaf(false);

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

      if (!res.ok) throw new Error("Request failed");

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
              // skip
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.content !== ""),
        {
          role: "assistant",
          content: "Desole, une erreur est survenue. Veuillez reessayer.",
        },
      ]);
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

  const showingTopics = !isStreaming && !atLeaf;

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
                onClick={handleClose}
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-col h-[420px] overflow-y-auto p-3 space-y-3 bg-background/50">
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

              {showingTopics && (
                <div className="flex flex-col gap-1.5 pl-8" data-testid="chat-topic-bubbles">
                  {topicStack.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      className="justify-start gap-1 text-muted-foreground w-fit"
                      data-testid="button-chat-back"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Retour
                    </Button>
                  )}
                  {currentTopics.map((topic, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTopicClick(topic)}
                      className="justify-start rounded-full w-fit"
                      data-testid={`button-chat-topic-${i}`}
                    >
                      {topic.label}
                    </Button>
                  ))}
                </div>
              )}

              {atLeaf && !isStreaming && (
                <div className="flex flex-col gap-1.5 pl-8" data-testid="chat-leaf-actions">
                  {topicStack.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      className="justify-start gap-1 w-fit text-muted-foreground"
                      data-testid="button-chat-back-leaf"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Retour
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRestart}
                    className="justify-start gap-1 w-fit text-muted-foreground"
                    data-testid="button-chat-restart"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Menu principal
                  </Button>
                </div>
              )}

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
