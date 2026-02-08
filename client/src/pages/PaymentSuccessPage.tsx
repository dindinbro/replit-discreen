import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Copy, Key, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function PaymentSuccessPage() {
  const { toast } = useToast();
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order");
  const orderToken = params.get("token");

  const fetchKey = useCallback(async () => {
    if (!orderId || !orderToken) {
      setError("Lien de paiement invalide ou incomplet.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/license-by-order/${encodeURIComponent(orderId)}?token=${encodeURIComponent(orderToken)}`);
      if (res.ok) {
        const data = await res.json();
        setLicenseKey(data.key);
        setTier(data.tier);
        setLoading(false);
        return true;
      }
      if (res.status === 404) {
        return false;
      }
      setError("Erreur lors de la recuperation de la cle.");
      setLoading(false);
      return true;
    } catch {
      setError("Erreur de connexion au serveur.");
      setLoading(false);
      return true;
    }
  }, [orderId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let attempts = 0;
    const maxAttempts = 60;

    async function poll() {
      const done = await fetchKey();
      attempts++;
      setRetryCount(attempts);
      if (done || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts && !done) {
          setError("Le paiement n'a pas encore ete confirme. Verifiez votre email ou contactez le support.");
          setLoading(false);
        }
      }
    }

    poll();
    interval = setInterval(poll, 5000);

    return () => clearInterval(interval);
  }, [fetchKey, orderId, orderToken]);

  function handleCopy() {
    if (!licenseKey) return;
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    toast({ title: "Cle copiee", description: "La cle de licence a ete copiee dans le presse-papiers." });
    setTimeout(() => setCopied(false), 2000);
  }

  const tierLabels: Record<string, string> = {
    vip: "VIP",
    pro: "PRO",
    business: "Business",
    api: "API",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 space-y-6">
          {loading ? (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <h2 className="text-xl font-semibold" data-testid="text-payment-loading">En attente de confirmation...</h2>
              <p className="text-sm text-muted-foreground">
                Votre paiement est en cours de verification. Cela peut prendre quelques minutes.
              </p>
              <p className="text-xs text-muted-foreground">
                Tentative {retryCount} / 60
              </p>
            </div>
          ) : error ? (
            <div className="text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold" data-testid="text-payment-error">Un probleme est survenu</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Link href="/pricing">
                <Button data-testid="button-back-pricing">
                  Retour aux prix
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <CheckCircle className="w-14 h-14 text-primary mx-auto" />
                <h2 className="text-2xl font-bold" data-testid="text-payment-success">Paiement confirme</h2>
                {tier && (
                  <Badge variant="default" className="text-sm" data-testid="badge-tier">
                    {tierLabels[tier] || tier}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                  <Key className="w-4 h-4" />
                  Votre cle de licence
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={licenseKey || ""}
                    className="font-mono text-center text-sm"
                    data-testid="input-license-key"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopy}
                    data-testid="button-copy-key"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-md p-4 space-y-2">
                <p className="text-sm font-medium">Comment activer votre abonnement :</p>
                <ol className="text-xs text-muted-foreground text-left space-y-1 list-decimal list-inside">
                  <li>Copiez la cle ci-dessus</li>
                  <li>Allez sur la page Prix</li>
                  <li>Cliquez sur "Utiliser une cle de licence"</li>
                  <li>Collez votre cle et validez</li>
                </ol>
              </div>

              <Link href="/pricing">
                <Button className="w-full gap-2" data-testid="button-go-pricing">
                  Activer ma cle
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
