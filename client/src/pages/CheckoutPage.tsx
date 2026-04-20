import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, RefreshCw, Clock, AlertTriangle, CheckCircle2,
  XCircle, Loader2, ArrowLeft, Bitcoin, Search, ChevronDown,
  ShieldCheck, Key, Ticket,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// ── Crypto icon (letter fallback) ──────────────────────────────────────────
const CRYPTO_COLORS: Record<string, string> = {
  btc: "#f7931a", eth: "#627eea", ltc: "#bfbbbb", usdt: "#26a17b",
  usdc: "#2775ca", bnb: "#f0b90b", sol: "#9945ff", xmr: "#ff6600",
  trx: "#ef0027", doge: "#c2a633", matic: "#8247e5", avax: "#e84142",
  ada: "#0033ad", dot: "#e6007a", atom: "#2e3148",
};

function CryptoIcon({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const color = CRYPTO_COLORS[symbol.toLowerCase()] ?? "#888";
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Copy button ─────────────────────────────────────────────────────────────
function CopyButton({ text, label = "" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button size="sm" variant="outline" onClick={copy} className="gap-1.5 shrink-0" data-testid={`button-copy-${label}`}>
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copié" : "Copier"}
    </Button>
  );
}

// ── Countdown timer ─────────────────────────────────────────────────────────
function Countdown({ expiresAt }: { expiresAt: string | null }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining === null) return null;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const isLow = remaining < 300000;

  return (
    <div className={`flex items-center gap-2 text-sm font-mono ${isLow && remaining > 0 ? "text-orange-500" : remaining === 0 ? "text-destructive" : "text-muted-foreground"}`}>
      <Clock className="w-3.5 h-3.5" />
      {remaining === 0
        ? "Expiré"
        : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:        { label: "En attente de crypto",   color: "text-muted-foreground", icon: Clock },
  waiting:        { label: "En attente de paiement", color: "text-yellow-500",       icon: Clock },
  confirming:     { label: "Confirmation réseau…",   color: "text-blue-500",         icon: RefreshCw },
  confirmed:      { label: "Confirmé !",             color: "text-green-500",         icon: CheckCircle2 },
  finished:       { label: "Paiement reçu !",        color: "text-green-500",         icon: CheckCircle2 },
  partially_paid: { label: "Partiellement payé",     color: "text-orange-500",        icon: AlertTriangle },
  failed:         { label: "Échec",                  color: "text-destructive",       icon: XCircle },
  expired:        { label: "Expiré",                 color: "text-destructive",       icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["waiting"];
  const Icon = cfg.icon;
  const isSpinning = status === "confirming";
  return (
    <span className={`flex items-center gap-1.5 text-sm font-medium ${cfg.color}`}>
      <Icon className={`w-4 h-4 ${isSpinning ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

// ── POPULAR currencies to surface ───────────────────────────────────────────
const POPULAR_DEFAULTS = ["btc", "eth", "ltc", "usdt", "usdc", "trx", "doge", "sol", "xmr", "bnb"];

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const [, navigate] = useLocation();
  const { getAccessToken } = useAuth();
  const { toast } = useToast();

  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId") ?? "";
  const sessionToken = params.get("token") ?? "";

  // State
  type CheckoutStep = "select-crypto" | "payment" | "success" | "error";
  const [step, setStep] = useState<CheckoutStep>("select-crypto");
  const [session, setSession] = useState<any>(null);
  const [currencies, setCurrencies] = useState<{ popular: string[]; all: string[] }>({ popular: POPULAR_DEFAULTS, all: [] });
  const [currencySearch, setCurrencySearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loadingCurrency, setLoadingCurrency] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const successShownRef = useRef(false);

  const getToken = useCallback(() => getAccessToken(), [getAccessToken]);

  // Load session on mount
  useEffect(() => {
    if (!orderId) { setSessionError("Order ID manquant"); setSessionLoading(false); return; }
    const token = getToken();
    fetch(`/api/payment/${orderId}?token=${sessionToken}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        if (data.message) { setSessionError(data.message); return; }
        setSession(data);
        // If already has payment details → skip to payment step
        if (data.payAddress && data.status !== "pending") {
          setPaymentDetails({ paymentId: data.paymentId, payAddress: data.payAddress, payAmount: data.payAmount, payCurrency: data.payCurrency, expiresAt: data.expiresAt, status: data.status });
          setSelectedCurrency(data.payCurrency);
          if (["finished", "confirmed"].includes(data.status)) { setStep("success"); }
          else if (["failed", "expired"].includes(data.status)) { setStep("error"); }
          else { setStep("payment"); }
        }
      })
      .catch(() => setSessionError("Impossible de charger la session"))
      .finally(() => setSessionLoading(false));
  }, [orderId, sessionToken, getToken]);

  // Load currencies
  useEffect(() => {
    const token = getToken();
    fetch("/api/nowpayments/currencies", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(data => { if (data.popular) setCurrencies(data); })
      .catch(() => {});
  }, [getToken]);

  // Poll payment status
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const token = getToken();
      try {
        const r = await fetch(`/api/payment/${orderId}?token=${sessionToken}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await r.json();
        if (data.status) {
          setPaymentDetails((prev: any) => ({ ...prev, status: data.status, payAmount: data.payAmount ?? prev?.payAmount }));
          if (["finished", "confirmed"].includes(data.status) && !successShownRef.current) {
            successShownRef.current = true;
            clearInterval(pollRef.current!);
            setStep("success");
          } else if (["failed", "expired"].includes(data.status)) {
            clearInterval(pollRef.current!);
            setStep("error");
          }
        }
      } catch { /* ignore */ }
    }, 6000);
  }, [orderId, sessionToken, getToken]);

  useEffect(() => {
    if (step === "payment") startPolling();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, startPolling]);

  async function handleSelectCurrency(currency: string) {
    setSelectedCurrency(currency);
    setLoadingCurrency(true);
    try {
      const token = getToken();
      const res = await fetch("/api/payment/choose-currency", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ orderId, sessionToken, currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur création paiement");
      setPaymentDetails(data);
      setStep("payment");
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur réseau", variant: "destructive" });
      setSelectedCurrency(null);
    } finally {
      setLoadingCurrency(false);
    }
  }

  const filteredCurrencies = (() => {
    const q = currencySearch.toLowerCase().trim();
    const list = showAll ? currencies.all : currencies.popular.length > 0 ? currencies.popular : POPULAR_DEFAULTS;
    if (!q) return list;
    return (currencies.all.length > 0 ? currencies.all : list).filter(c => c.includes(q));
  })();

  // ── UI ──────────────────────────────────────────────────────────────────────
  if (sessionLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (sessionError) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 text-center max-w-md">
        <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Session introuvable</h2>
        <p className="text-muted-foreground mb-4">{sessionError}</p>
        <Link href="/pricing"><Button>Retour aux offres</Button></Link>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/6 via-background to-background pointer-events-none" />
      <div className="relative container max-w-xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate("/pricing")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
            <ArrowLeft className="w-4 h-4" />
            Retour aux offres
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Bitcoin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Paiement Crypto</h1>
              {session && <p className="text-sm text-muted-foreground">{session.label}</p>}
            </div>
            {session && (
              <div className="ml-auto text-right">
                <div className="text-2xl font-bold text-primary">{session.priceEur}€</div>
                {session.discountCode && (
                  <div className="text-xs text-green-500">-{session.discountPercent}% ({session.discountCode})</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-7">
          {(["select-crypto", "payment", "success"] as const).map((s, i) => {
            const labels = ["Choisir crypto", "Paiement", "Confirmation"];
            const activeIdx = step === "select-crypto" ? 0 : step === "payment" ? 1 : 2;
            const isDone = i < activeIdx;
            const isActive = i === activeIdx;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {isDone ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                  {labels[i]}
                </div>
                {i < 2 && <div className="w-4 h-px bg-border" />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">

          {/* STEP: Select Crypto */}
          {step === "select-crypto" && (
            <motion.div key="select" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-1">Choisir votre crypto</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Sélectionnez la crypto avec laquelle vous souhaitez payer. Le montant exact sera calculé au taux du moment.
                </p>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une crypto…"
                    className="pl-9"
                    value={currencySearch}
                    onChange={e => { setCurrencySearch(e.target.value); if (e.target.value) setShowAll(true); }}
                    data-testid="input-crypto-search"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {filteredCurrencies.slice(0, showAll && !currencySearch ? undefined : 10).map(c => (
                    <button
                      key={c}
                      disabled={loadingCurrency}
                      onClick={() => handleSelectCurrency(c)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left hover:border-primary/60 hover:bg-primary/5 ${selectedCurrency === c ? "border-primary bg-primary/10" : "border-border"}`}
                      data-testid={`button-crypto-${c}`}
                    >
                      <CryptoIcon symbol={c} size={30} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm uppercase">{c}</div>
                      </div>
                      {loadingCurrency && selectedCurrency === c && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                    </button>
                  ))}
                </div>

                {!currencySearch && !showAll && currencies.all.length > 10 && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 border border-dashed border-border rounded-lg transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Voir toutes les cryptos ({currencies.all.length})
                  </button>
                )}

                <div className="mt-5 p-3 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-primary" />
                  Paiement sécurisé via NOWPayments · Aucune donnée financière stockée
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP: Payment */}
          {step === "payment" && paymentDetails && (
            <motion.div key="payment" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
              <Card className="p-6 space-y-6">

                {/* Status */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={paymentDetails.status} />
                  <Countdown expiresAt={paymentDetails.expiresAt} />
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-white rounded-2xl shadow-sm">
                    <QRCodeSVG
                      value={paymentDetails.payAddress}
                      size={180}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Scannez pour obtenir l'adresse</p>
                </div>

                {/* Amount */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Montant exact à envoyer</p>
                    <div className="flex items-center gap-2">
                      <CryptoIcon symbol={paymentDetails.payCurrency} size={20} />
                      <span className="font-mono text-lg font-bold">{paymentDetails.payAmount}</span>
                      <span className="text-sm text-muted-foreground uppercase">{paymentDetails.payCurrency}</span>
                      <CopyButton text={String(paymentDetails.payAmount)} label="amount" />
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-3">
                    <p className="text-xs text-muted-foreground mb-1">Adresse de réception</p>
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-xs break-all flex-1 text-foreground">{paymentDetails.payAddress}</span>
                      <CopyButton text={paymentDetails.payAddress} label="address" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                  <span>Votre licence / demande sera activée automatiquement après confirmation réseau. Ne fermez pas cette page.</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setStep("select-crypto"); setPaymentDetails(null); setSelectedCurrency(null); }} className="gap-1.5">
                    <ArrowLeft className="w-4 h-4" />
                    Changer de crypto
                  </Button>
                  <Button variant="ghost" size="sm" onClick={startPolling} className="gap-1.5 ml-auto">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Actualiser
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP: Success */}
          {(step === "success" || (step === "payment" && paymentDetails && ["finished", "confirmed"].includes(paymentDetails.status))) && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
              <Card className="p-8 text-center space-y-5">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}>
                  <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Paiement confirmé !</h2>
                  <p className="text-muted-foreground text-sm">
                    {session?.orderType === "subscription"
                      ? "Votre paiement a bien été reçu. Votre clé de licence a été générée."
                      : "Votre paiement a été reçu. Votre demande a été envoyée à notre équipe."}
                  </p>
                </div>

                {session?.orderType === "subscription" ? (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-left space-y-2">
                    <p className="font-medium flex items-center gap-2">
                      <Key className="w-4 h-4 text-green-500" />
                      Récupérer votre licence
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Une clé de licence a été générée pour votre commande. Rendez-vous sur la page Tarifs pour l'activer avec le bouton "Utiliser une clé de licence".
                    </p>
                    <Link href={`/payment-success?order=${orderId}&token=${sessionToken}`}>
                      <Button size="sm" className="gap-2 mt-2">
                        <Key className="w-4 h-4" />
                        Voir ma clé de licence
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-left space-y-2">
                    <p className="font-medium flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-green-500" />
                      Demande en cours de traitement
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Notre équipe a reçu votre demande et la traitera sous 48h. Vous pouvez suivre l'avancement via vos tickets.
                    </p>
                    <Link href="/tickets">
                      <Button size="sm" variant="outline" className="gap-2 mt-2">
                        <Ticket className="w-4 h-4" />
                        Voir mes tickets
                      </Button>
                    </Link>
                  </div>
                )}

                <Link href="/pricing">
                  <Button variant="ghost" size="sm">Retour aux offres</Button>
                </Link>
              </Card>
            </motion.div>
          )}

          {/* STEP: Error */}
          {step === "error" && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <Card className="p-8 text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Paiement échoué ou expiré</h2>
                  <p className="text-muted-foreground text-sm">Le paiement n'a pas abouti. Vous pouvez réessayer avec un nouveau paiement.</p>
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Link href="/pricing"><Button>Réessayer</Button></Link>
                  <Link href="/tickets"><Button variant="outline">Contacter le support</Button></Link>
                </div>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
