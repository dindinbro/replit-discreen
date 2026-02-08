import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Loader2,
  ShieldCheck,
  Code,
  AlertTriangle,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ApiKeyEntry {
  id: number;
  keyPrefix: string;
  name: string;
  createdAt: string;
}

export default function ApiKeysPage() {
  const { user, getAccessToken, role } = useAuth();
  const { toast } = useToast();
  const [newKeyName, setNewKeyName] = useState("Default");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const keysQuery = useQuery<ApiKeyEntry[]>({
    queryKey: ["/api/api-keys"],
    enabled: !!user,
    queryFn: async () => {
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/api-keys", { headers });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
  });

  const subscriptionQuery = useQuery<{ tier: string; isAdmin?: boolean } | null>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
    queryFn: async () => {
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/subscription", { headers });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const token = getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/api-keys", { method: "POST", headers, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedKey(data.key);
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setNewKeyName("Default");
    },
    onError: (err: Error) => {
      const msg = err.message;
      if (msg.includes("403")) {
        toast({
          title: "Abonnement requis",
          description: "L'abonnement API est requis pour generer des cles.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de creer la cle API.",
          variant: "destructive",
        });
      }
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "Cle revoquee",
        description: "La cle API a ete revoquee avec succes.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de revoquer la cle API.",
        variant: "destructive",
      });
    },
  });

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copie", description: "Cle API copiee dans le presse-papiers." });
    }
  };

  const handleCreateKey = () => {
    createMutation.mutate(newKeyName || "Default");
  };

  const isApiTier = role === "admin" || subscriptionQuery.data?.tier === "api" || subscriptionQuery.data?.isAdmin === true;
  const keys = keysQuery.data || [];

  return (
    <main className="relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-background to-background pointer-events-none" />

      <div className="relative container max-w-4xl mx-auto px-4 py-12 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-lg">
              <Key className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-api-keys-title">Cles API</h1>
              <p className="text-sm text-muted-foreground" data-testid="text-api-keys-subtitle">Gerez vos cles d'acces pour l'API Discreen</p>
            </div>
          </div>
        </motion.div>

        {!isApiTier && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground" data-testid="text-api-tier-warning">Abonnement API requis</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-api-tier-description">
                    Pour generer et utiliser des cles API, vous devez souscrire a l'abonnement API (49.99 EUR/mois).
                    Rendez-vous sur la page Prix pour vous abonner.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-your-keys-title">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Vos Cles
              </h2>
              <Button
                onClick={() => setShowCreateDialog(true)}
                disabled={!isApiTier}
                data-testid="button-create-api-key"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Cle
              </Button>
            </div>

            {keysQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : keys.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Key className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm" data-testid="text-no-keys">Aucune cle API generee</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {keys.map((k, i) => (
                    <motion.div
                      key={k.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-primary/10 p-2 rounded-md shrink-0">
                              <Key className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate" data-testid={`text-key-name-${k.id}`}>{k.name}</p>
                              <p className="text-xs text-muted-foreground font-mono" data-testid={`text-key-prefix-${k.id}`}>
                                {k.keyPrefix}...
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">
                              {new Date(k.createdAt).toLocaleDateString("fr-FR")}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => revokeMutation.mutate(k.id)}
                              disabled={revokeMutation.isPending}
                              data-testid={`button-revoke-key-${k.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-api-docs-title">
              <Code className="w-5 h-5 text-primary" />
              Documentation API
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Utilisez vos cles API pour effectuer des recherches programmatiques via l'endpoint:</p>
              <div className="bg-secondary rounded-md p-3 font-mono text-xs" data-testid="text-api-endpoint">
                <span className="text-primary">POST</span> /api/v1/search
              </div>
              <p>Ajoutez votre cle dans l'en-tete de la requete:</p>
              <div className="bg-secondary rounded-md p-3 font-mono text-xs space-y-1" data-testid="text-api-example">
                <div>{"{"}</div>
                <div className="pl-4">"headers": {"{"}</div>
                <div className="pl-8">"X-Api-Key": "<span className="text-primary">votre_cle_api</span>",</div>
                <div className="pl-8">"Content-Type": "application/json"</div>
                <div className="pl-4">{"}"}</div>
                <div className="pl-4">"body": {"{"}</div>
                <div className="pl-8">"criteria": [{"{"} "type": "email", "value": "test@example.com" {"}"}]</div>
                <div className="pl-4">{"}"}</div>
                <div>{"}"}</div>
              </div>
              <p>Recherches illimitees avec l'abonnement API.</p>
            </div>
          </Card>
        </motion.div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Creer une Cle API</DialogTitle>
            <DialogDescription>
              Donnez un nom a votre cle pour l'identifier facilement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="key-name">Nom de la cle</Label>
              <Input
                id="key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Ex: Production, Test..."
                data-testid="input-key-name"
              />
            </div>
            <Button
              onClick={handleCreateKey}
              disabled={createMutation.isPending}
              className="w-full"
              data-testid="button-confirm-create-key"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Key className="w-4 h-4 mr-2" />
              )}
              Generer la Cle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdKey} onOpenChange={(open) => { if (!open) { setCreatedKey(null); setShowCreateDialog(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Cle API Generee
            </DialogTitle>
            <DialogDescription>
              Copiez cette cle maintenant. Elle ne sera plus affichee apres la fermeture de cette fenetre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-secondary rounded-md p-3 font-mono text-xs break-all" data-testid="text-generated-key">
              {createdKey}
            </div>
            <Button
              onClick={handleCopy}
              className="w-full"
              data-testid="button-copy-key"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copie
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier la Cle
                </>
              )}
            </Button>
            <p className="text-xs text-amber-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Cette cle ne sera plus visible apres fermeture. Conservez-la en lieu sur.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
