import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  User,
  Camera,
  Pencil,
  ShieldCheck,
  Shield,
  Lock,
  Unlock,
  Save,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLE_CONFIG: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  admin: { variant: "destructive", label: "Admin" },
  free: { variant: "secondary", label: "Free" },
  vip: { variant: "outline", label: "VIP" },
  pro: { variant: "default", label: "PRO" },
  business: { variant: "default", label: "Business" },
  api: { variant: "outline", label: "API" },
};


interface ProfileData {
  id: string;
  email: string;
  role: string;
  frozen: boolean;
  created_at: string;
  unique_id: number;
  display_name: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const { user, role, loading: authLoading, getAccessToken, refreshRole } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [loadingTwoFa, setLoadingTwoFa] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [copied, setCopied] = useState(false);

  const canChangeName = role === "admin";

  useEffect(() => {
    fetchProfile();
    fetchTwoFaStatus();
  }, []);

  async function fetchProfile() {
    try {
      const token = getAccessToken();
      if (!token) return;
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setDisplayName(data.display_name || "");
        setAvatarUrl(data.avatar_url || "");
      }
    } catch (err) {
      console.error("fetchProfile error:", err);
    } finally {
      setLoadingProfile(false);
    }
  }

  async function fetchTwoFaStatus() {
    try {
      const token = getAccessToken();
      if (!token) return;
      const res = await fetch("/api/profile/2fa/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTwoFaEnabled(data.enabled);
      }
    } catch (err) {
      console.error("fetchTwoFaStatus error:", err);
    } finally {
      setLoadingTwoFa(false);
    }
  }

  async function saveAvatar() {
    setSavingAvatar(true);
    try {
      const token = getAccessToken();
      if (!token) return;
      const res = await fetch("/api/profile/avatar", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ avatar_url: avatarUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Photo de profil mise a jour" });
        setAvatarDialogOpen(false);
        setProfile((p) => p ? { ...p, avatar_url: data.avatar_url } : p);
      } else {
        toast({ title: "Erreur", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre a jour la photo.", variant: "destructive" });
    } finally {
      setSavingAvatar(false);
    }
  }

  async function saveDisplayName() {
    setSavingName(true);
    try {
      const token = getAccessToken();
      if (!token) return;
      const res = await fetch("/api/profile/display-name", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Pseudo mis a jour" });
        setProfile((p) => p ? { ...p, display_name: data.display_name } : p);
        await refreshRole();
      } else {
        toast({ title: "Erreur", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre a jour le pseudo.", variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  }

  async function startEnroll() {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Discreen A2F",
      });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return;
      }
      if (data) {
        setTotpUri(data.totp.uri);
        setTotpSecret(data.totp.secret);
        setFactorId(data.id);
      }
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible de demarrer l'inscription A2F.", variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  }

  async function verifyEnroll() {
    if (!factorId || verifyCode.length !== 6) return;
    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) {
        toast({ title: "Erreur", description: challengeError.message, variant: "destructive" });
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      if (verifyError) {
        toast({ title: "Erreur", description: "Code invalide. Verifiez et reessayez.", variant: "destructive" });
        return;
      }
      toast({ title: "A2F active avec succes" });
      setTwoFaEnabled(true);
      setTotpUri(null);
      setTotpSecret(null);
      setFactorId(null);
      setVerifyCode("");
    } catch {
      toast({ title: "Erreur", description: "Verification echouee.", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  }

  async function disableTwoFa() {
    setDisabling(true);
    try {
      const token = getAccessToken();
      if (!token) return;
      const res = await fetch("/api/profile/2fa", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "A2F desactivee" });
        setTwoFaEnabled(false);
      } else {
        const data = await res.json();
        toast({ title: "Erreur", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de desactiver l'A2F.", variant: "destructive" });
    } finally {
      setDisabling(false);
    }
  }

  function copySecret() {
    if (totpSecret) {
      navigator.clipboard.writeText(totpSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Non connecte</h2>
          <p className="text-muted-foreground text-sm">Connectez-vous pour acceder a votre profil.</p>
          <Button onClick={() => navigate("/login")} data-testid="button-go-login">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Se connecter
          </Button>
        </Card>
      </div>
    );
  }

  const roleConfig = ROLE_CONFIG[profile.role] || ROLE_CONFIG.free;

  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto h-16 flex items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <User className="w-6 h-6 text-primary" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">
              Di<span className="text-primary">screen</span>
            </span>
            <Badge variant="outline" className="ml-2">Mon Compte</Badge>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-8 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-display font-bold">Informations du compte</h1>
          </div>
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div
                  className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border cursor-pointer"
                  onClick={() => setAvatarDialogOpen(true)}
                  data-testid="button-change-avatar"
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div
                  className="absolute inset-0 w-20 h-20 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => setAvatarDialogOpen(true)}
                >
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold truncate">{profile.display_name || profile.email?.split("@")[0]}</h2>
                  <Badge variant={roleConfig.variant} data-testid="badge-profile-role">{roleConfig.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                <p className="text-xs text-muted-foreground">ID: #{profile.unique_id}</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Adresse e-mail</p>
                <p className="text-sm">{profile.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Membre depuis</p>
                <p className="text-sm">{new Date(profile.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Pencil className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-display font-bold">Modifier le pseudo</h2>
          </div>
          <Card className="p-6 space-y-4">
            {canChangeName ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="display-name">Pseudo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="display-name"
                      data-testid="input-display-name"
                      placeholder="Votre pseudo (2-30 caracteres)"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={30}
                    />
                    <Button
                      data-testid="button-save-name"
                      onClick={saveDisplayName}
                      disabled={savingName || displayName.trim().length < 2}
                    >
                      {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Ce pseudo sera affiche a la place de votre e-mail.</p>
              </>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium">Fonctionnalite reservee aux administrateurs</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Seuls les administrateurs peuvent modifier leur pseudo.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-display font-bold">Authentification a deux facteurs (A2F)</h2>
          </div>
          <Card className="p-6 space-y-4">
            {loadingTwoFa ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : twoFaEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">A2F activee</p>
                    <p className="text-xs text-muted-foreground">Votre compte est protege par l'authentification a deux facteurs.</p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={disableTwoFa}
                  disabled={disabling}
                  data-testid="button-disable-2fa"
                >
                  {disabling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
                  Desactiver l'A2F
                </Button>
              </div>
            ) : totpUri ? (
              <div className="space-y-4">
                <p className="text-sm">Scannez ce QR code avec Google Authenticator ou une application compatible :</p>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`}
                    alt="QR Code A2F"
                    className="w-48 h-48"
                    data-testid="img-totp-qr"
                  />
                </div>
                {totpSecret && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Ou entrez ce code manuellement :</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all select-all">{totpSecret}</code>
                      <Button variant="ghost" size="icon" onClick={copySecret} data-testid="button-copy-secret">
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="verify-code">Code de verification (6 chiffres)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="verify-code"
                      data-testid="input-2fa-code"
                      placeholder="000000"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="font-mono text-center tracking-widest"
                    />
                    <Button
                      data-testid="button-verify-2fa"
                      onClick={verifyEnroll}
                      disabled={verifying || verifyCode.length !== 6}
                    >
                      {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verifier"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">A2F desactivee</p>
                    <p className="text-xs text-muted-foreground">Activez l'authentification a deux facteurs pour securiser votre compte.</p>
                  </div>
                </div>
                <Button
                  onClick={startEnroll}
                  disabled={enrolling}
                  data-testid="button-enable-2fa"
                >
                  {enrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                  Activer l'A2F
                </Button>
              </div>
            )}
          </Card>
        </section>
      </main>

      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la photo de profil</DialogTitle>
            <DialogDescription>
              Entrez l'URL de votre nouvelle photo de profil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {avatarUrl && (
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border">
                  <img
                    src={avatarUrl}
                    alt="Apercu"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                    }}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="avatar-url">URL de l'image</Label>
              <Input
                id="avatar-url"
                data-testid="input-avatar-url"
                placeholder="https://exemple.com/photo.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAvatarDialogOpen(false)} data-testid="button-cancel-avatar">
                Annuler
              </Button>
              <Button onClick={saveAvatar} disabled={savingAvatar} data-testid="button-save-avatar">
                {savingAvatar ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
