import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldAlert, Bot, Brain, CreditCard, Check, Loader2, Sparkles, Lock, ChevronLeft, Zap,
} from "lucide-react";

/* Le montant est fixe cote serveur (WANTED_PRICE_EUR dans routes.ts) —
 * ne changer ce libelle que si le prix serveur change en meme temps. */
const WANTED_PRICE_LABEL = "19,99€";

/* Meme palette que les pages dediees (WantedPage: red-500, DiscordScanPage:
 * violet, DisXPage: primary indigo) — sert uniquement a colorer l'icone de
 * chaque ligne pour signaler d'un coup d'oeil quel module elle couvre,
 * sans repeter trois blocs entiers comme dans les versions precedentes. */
const RED = "text-red-500";
const VIOLET = "text-violet-400";
const INDIGO = "text-primary";

const MODULE_CHIPS = [
  { label: "Wanted", icon: ShieldAlert, color: RED, status: "Inclus" },
  { label: "DisX", icon: Brain, color: INDIGO, status: "Inclus" },
  { label: "Discord Scan", icon: Bot, color: VIOLET, status: "Bientôt disponible" },
];

const FEATURES: { text: string; color: string }[] = [
  { text: "Recherche croisée illimitée : email, téléphone, IP, Discord, adresse...", color: RED },
  { text: "Cartographie relationnelle en direct entre les profils liés", color: RED },
  { text: "DisX comprend le langage naturel et cherche à votre place", color: INDIGO },
  { text: "Discord Scan inclus automatiquement dès son lancement", color: VIOLET },
  { text: "Activation immédiate sur votre compte après paiement", color: RED },
];

export default function PricingPage() {
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
    <div className="min-h-screen px-4 py-16 relative overflow-hidden flex flex-col items-center justify-center">
      {/* ── Fond texture + animation ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card/40" />
        <div className="absolute top-0 left-1/4 w-[560px] h-[560px] rounded-full bg-red-500/[0.08] blur-3xl animate-pricing-orb-a" />
        <div className="absolute top-24 right-1/5 w-[520px] h-[520px] rounded-full bg-violet-500/[0.07] blur-3xl animate-pricing-orb-b" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[640px] h-[420px] rounded-full bg-primary/[0.08] blur-3xl animate-pricing-orb-c" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute inset-0 pricing-noise animate-pricing-noise" />
        <div
          className="absolute -top-1/2 left-0 w-[140%] h-[60px] animate-pricing-beam"
          style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent)", filter: "blur(20px)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-pricing-back">
            <ChevronLeft className="w-4 h-4" />
            Retour
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">Modules</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            Un abonnement.<br />Tous les modules.
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            Wanted, DisX et Discord Scan réunis dans un seul accès.
          </p>
        </div>

        {/* Carte unique : tout se comprend d'un coup d'oeil */}
        <Card className="relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-card/70 backdrop-blur-xl p-8 sm:p-10 text-left space-y-6 shadow-[0_0_80px_-20px_rgba(99,102,241,0.4)] animate-wanted-card-border">
          <div className="absolute top-0 left-0 right-0 h-[3px] overflow-hidden pointer-events-none">
            <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent animate-wanted-topbar" />
          </div>

          <div className="relative flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
              <Sparkles className="w-3 h-3" />
              Formule complète
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
              <Zap className="w-3 h-3" />
              Activation immédiate
            </span>
          </div>

          <div className="relative flex items-baseline gap-2 animate-wanted-price-in">
            <span className="text-6xl sm:text-7xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent animate-wanted-price-glow">{WANTED_PRICE_LABEL}</span>
            <span className="text-base text-muted-foreground">/ mois</span>
          </div>

          {/* Les trois modules, en un regard */}
          <div className="relative grid grid-cols-3 gap-3">
            {MODULE_CHIPS.map(({ label, icon: Icon, color, status }) => (
              <div key={label} className="rounded-2xl border border-border/50 bg-background/40 px-3 py-5 text-center space-y-2">
                <Icon className={`w-7 h-7 mx-auto ${color}`} />
                <p className="text-sm font-semibold truncate">{label}</p>
                <p className={`text-[11px] font-bold uppercase leading-tight ${status === "Inclus" ? "text-emerald-400" : "text-amber-400"}`}>{status}</p>
              </div>
            ))}
          </div>

          <div className="relative h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {FEATURES.map(({ text, color }, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 animate-wanted-feature-in"
                style={{ animationDelay: `${120 + i * 70}ms` }}
              >
                <Check className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
                <p className="text-sm text-muted-foreground leading-snug">{text}</p>
              </div>
            ))}
          </div>

          <Button
            onClick={subscribe}
            disabled={payLoading}
            className="relative w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-base font-semibold gap-2 overflow-hidden transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] animate-wanted-cta"
            data-testid="button-pricing-subscribe"
          >
            {payLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
            S'abonner — {WANTED_PRICE_LABEL}/mois
          </Button>
          <p className="relative text-xs text-center text-muted-foreground -mt-3">
            Paiement sécurisé en cryptomonnaie
          </p>

          <div className="relative text-center pt-1">
            {!showCodeInput ? (
              <button
                onClick={() => setShowCodeInput(true)}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                data-testid="button-show-code-input"
              >
                Vous avez déjà un code d'activation ?
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Code d'activation unique, délivré par un administrateur.</p>
                <div className="flex items-center gap-2 rounded-full border border-primary/25 bg-background/60 backdrop-blur pl-5 pr-1.5 py-1.5 focus-within:border-primary/50 transition-colors">
                  <Lock className="w-4 h-4 text-primary/60 shrink-0" />
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="WANTED-XXXXXXXX"
                    className="border-0 bg-transparent font-mono text-center text-sm focus-visible:ring-0 shadow-none"
                    data-testid="input-pricing-code"
                  />
                  <Button
                    onClick={submit}
                    disabled={loading || !code.trim()}
                    size="sm"
                    className="shrink-0 rounded-full gap-1.5"
                    data-testid="button-pricing-redeem"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Activer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
