import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, CreditCard, CheckCircle, Search } from "lucide-react";

export default function InfoRequestPage() {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();

  const [discordId, setDiscordId] = useState("");
  const [email, setEmail] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "payment">("form");

  async function handleNext() {
    const hasAnyField = [discordId, email, pseudo, ipAddress].some(f => f.trim().length > 0);
    if (!hasAnyField) {
      toast({ title: "Erreur", description: "Veuillez remplir au moins un champ.", variant: "destructive" });
      return;
    }
    setStep("payment");
  }

  async function handlePay() {
    setLoading(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast({ title: "Erreur", description: "Non authentifie", variant: "destructive" });
        setLoading(false);
        return;
      }

      const formData = {
        discordId: discordId.trim() || null,
        email: email.trim() || null,
        pseudo: pseudo.trim() || null,
        ipAddress: ipAddress.trim() || null,
        additionalInfo: additionalInfo.trim() || null,
      };

      const res = await fetch("/api/create-service-invoice", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "info", formData }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.invoice_url) {
          window.open(data.invoice_url, "_blank");
          toast({
            title: "Facture creee",
            description: "La facture a ete ouverte dans un nouvel onglet. Une fois le paiement effectue, votre demande sera automatiquement envoyee.",
          });
          setDiscordId("");
          setEmail("");
          setPseudo("");
          setIpAddress("");
          setAdditionalInfo("");
          setStep("form");
        }
      } else {
        const data = await res.json();
        toast({ title: "Erreur", description: data.message || "Impossible de creer la facture", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Demande d'Information</h1>
        <p className="text-muted-foreground">
          Remplissez ce formulaire pour obtenir les informations d'une personne. Fournissez au moins un identifiant (Discord ID, Email, Pseudo, IP, etc.).
        </p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${step === "form" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <span>1</span>
          <span>Formulaire</span>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${step === "payment" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <span>2</span>
          <span>Paiement</span>
        </div>
      </div>

      {step === "form" && (
        <Card className="p-6">
          <div className="space-y-6" data-testid="form-info-request">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discordId">Discord ID</Label>
                <Input
                  id="discordId"
                  data-testid="input-discordId"
                  placeholder="123456789012345678"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  placeholder="exemple@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pseudo">Pseudo</Label>
                <Input
                  id="pseudo"
                  data-testid="input-pseudo"
                  placeholder="Pseudo de la personne"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ipAddress">Adresse IP</Label>
                <Input
                  id="ipAddress"
                  data-testid="input-ipAddress"
                  placeholder="192.168.1.1"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalInfo">Informations supplementaires</Label>
              <Textarea
                id="additionalInfo"
                data-testid="textarea-additionalInfo"
                placeholder="Ajoutez toute information supplementaire utile (autres pseudos, numeros de telephone, etc.)..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                className="resize-none"
                rows={5}
              />
            </div>

            <Button
              type="button"
              onClick={handleNext}
              data-testid="button-next"
              className="w-full"
            >
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {step === "payment" && (
        <Card className="p-6">
          <div className="space-y-6 text-center">
            <CreditCard className="w-12 h-12 mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Paiement requis</h2>
            <p className="text-muted-foreground">
              La demande d'information necessite un paiement de <span className="font-bold text-foreground">50,00 EUR</span> en crypto-monnaie.
            </p>

            <Card className="p-4 bg-muted/50">
              <h3 className="font-medium mb-3 text-left">Recapitulatif</h3>
              <div className="text-sm text-left space-y-1 text-muted-foreground">
                {discordId && <p>Discord ID : {discordId}</p>}
                {email && <p>Email : {email}</p>}
                {pseudo && <p>Pseudo : {pseudo}</p>}
                {ipAddress && <p>IP : {ipAddress}</p>}
                {additionalInfo && <p>Infos : {additionalInfo}</p>}
              </div>
            </Card>

            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Votre demande sera envoyee automatiquement apres le paiement</span>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                data-testid="button-back"
              >
                Retour
              </Button>
              <Button
                onClick={handlePay}
                disabled={loading}
                data-testid="button-pay"
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creation de la facture...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payer 50,00 EUR
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
