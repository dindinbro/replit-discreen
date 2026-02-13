import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, CreditCard, CheckCircle, Plus, X } from "lucide-react";

export default function InfoRequestPage() {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();

  const [emails, setEmails] = useState<string[]>([""]);
  const [pseudos, setPseudos] = useState<string[]>([""]);
  const [discordIds, setDiscordIds] = useState<string[]>([""]);
  const [ips, setIps] = useState<string[]>([""]);
  const [phones, setPhones] = useState<string[]>([""]);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "payment">("form");

  const addField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter(prev => [...prev, ""]);
  const removeField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => setter(prev => prev.filter((_, i) => i !== index));
  const updateField = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => setter(prev => prev.map((v, i) => i === index ? value : v));

  const DynamicFields = ({ label, values, setter, placeholder }: { label: string; values: string[]; setter: React.Dispatch<React.SetStateAction<string[]>>; placeholder: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Button type="button" variant="ghost" size="sm" onClick={() => addField(setter)} data-testid={`button-add-${label.toLowerCase()}`}>
          <Plus className="w-3 h-3 mr-1" /> Ajouter
        </Button>
      </div>
      <div className="space-y-2">
        {values.map((val: string, i: number) => (
          <div key={i} className="flex gap-2">
            <Input
              value={val}
              onChange={e => updateField(setter, i, e.target.value)}
              placeholder={placeholder}
              data-testid={`input-${label.toLowerCase()}-${i}`}
            />
            {values.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeField(setter, i)} data-testid={`button-remove-${label.toLowerCase()}-${i}`}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  async function handleNext() {
    const hasAnyField = [...emails, ...pseudos, ...discordIds, ...ips, ...phones].some(f => f.trim().length > 0);
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
        discordId: discordIds.filter(Boolean).join(", ") || null,
        email: emails.filter(Boolean).join(", ") || null,
        pseudo: pseudos.filter(Boolean).join(", ") || null,
        ipAddress: ips.filter(Boolean).join(", ") || null,
        phone: phones.filter(Boolean).join(", ") || null,
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
          setEmails([""]);
          setPseudos([""]);
          setDiscordIds([""]);
          setIps([""]);
          setPhones([""]);
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

  const filledEmails = emails.filter(Boolean);
  const filledPseudos = pseudos.filter(Boolean);
  const filledDiscordIds = discordIds.filter(Boolean);
  const filledIps = ips.filter(Boolean);
  const filledPhones = phones.filter(Boolean);

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DynamicFields label="Emails" values={emails} setter={setEmails} placeholder="exemple@email.com" />
              <DynamicFields label="Pseudos" values={pseudos} setter={setPseudos} placeholder="Pseudo de la personne" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DynamicFields label="Discord IDs" values={discordIds} setter={setDiscordIds} placeholder="123456789012345678" />
              <DynamicFields label="IPs" values={ips} setter={setIps} placeholder="192.168.1.1" />
            </div>

            <DynamicFields label="Telephones" values={phones} setter={setPhones} placeholder="+33 6 00 00 00 00" />

            <div className="space-y-2">
              <label className="text-sm font-medium">Informations supplementaires</label>
              <Textarea
                data-testid="textarea-additionalInfo"
                placeholder="Ajoutez toute information supplementaire utile (autres pseudos, numeros de telephone, etc.)..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                className="min-h-[100px]"
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
                {filledEmails.length > 0 && <p>Email(s) : {filledEmails.join(", ")}</p>}
                {filledPseudos.length > 0 && <p>Pseudo(s) : {filledPseudos.join(", ")}</p>}
                {filledDiscordIds.length > 0 && <p>Discord ID(s) : {filledDiscordIds.join(", ")}</p>}
                {filledIps.length > 0 && <p>IP(s) : {filledIps.join(", ")}</p>}
                {filledPhones.length > 0 && <p>Telephone(s) : {filledPhones.join(", ")}</p>}
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
