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
  Link,
  Unlink,
  Heart,
  Monitor,
  Smartphone,
  Globe,
  Trash2,
  Gift,
  Trophy,
  Star,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { REFERRAL_RANKS, getReferralRank } from "@shared/schema";

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
  discord_id: string | null;
  is_supporter: boolean;
}

export default function ProfilePage() {
  const { t } = useTranslation();
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

  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [savingDiscord, setSavingDiscord] = useState(false);

  const [activeTab, setActiveTab] = useState<"compte" | "securite" | "discord" | "parrainage" | "sessions">("compte");
  const [referralStats, setReferralStats] = useState<{ code: string; totalCredits: number; referralCount: number } | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(true);
  const [copiedReferral, setCopiedReferral] = useState(false);

  interface SessionInfo {
    id: number;
    userAgent: string;
    lastActiveAt: string;
    createdAt: string;
  }
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [removingSessionId, setRemovingSessionId] = useState<number | null>(null);

  const canChangeName = role === "admin";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadingProfile(false);
      return;
    }
    fetchProfile();
    fetchTwoFaStatus();
    fetchSessions();
    fetchReferralStats();
  }, [authLoading, user]);

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

  async function fetchSessions() {
    try {
      const token = getAccessToken();
      if (!token) return;
      const res = await fetch("/api/session/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("fetchSessions error:", err);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function fetchReferralStats() {
    try {
      const token = getAccessToken();
      if (!token) return;
      const res = await fetch("/api/referral/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReferralStats(data);
      }
    } catch (err) {
      console.error("fetchReferralStats error:", err);
    } finally {
      setLoadingReferral(false);
    }
  }

  function parseUserAgent(ua: string): { browser: string; os: string; isMobile: boolean } {
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    let browser = "Navigateur inconnu";
    let os = "OS inconnu";

    if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
    else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
    else if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) browser = "Google Chrome";
    else if (/Firefox\//i.test(ua)) browser = "Firefox";
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

    if (/Windows/i.test(ua)) os = "Windows";
    else if (/Mac OS/i.test(ua)) os = "macOS";
    else if (/Linux/i.test(ua) && !isMobile) os = "Linux";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad/i.test(ua)) os = "iOS";

    return { browser, os, isMobile };
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "A l'instant";
    if (mins < 60) return `Il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  }

  async function removeSession(sessionId: number) {
    setRemovingSessionId(sessionId);
    try {
      const token = getAccessToken();
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;
      await fetch("/api/session", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      await fetchSessions();
      toast({ title: "Session deconnectee" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setRemovingSessionId(null);
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
        toast({ title: t("profile.avatarUpdated") });
        setAvatarDialogOpen(false);
        setProfile((p) => p ? { ...p, avatar_url: data.avatar_url } : p);
        await refreshRole();
      } else {
        toast({ title: t("common.error"), description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error"), description: t("profile.avatarUpdateError"), variant: "destructive" });
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
        toast({ title: t("profile.usernameUpdated") });
        setProfile((p) => p ? { ...p, display_name: data.display_name } : p);
        await refreshRole();
      } else {
        toast({ title: t("common.error"), description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error"), description: t("profile.usernameUpdateError"), variant: "destructive" });
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
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
        return;
      }
      if (data) {
        setTotpUri(data.totp.uri);
        setTotpSecret(data.totp.secret);
        setFactorId(data.id);
      }
    } catch (err) {
      toast({ title: t("common.error"), description: t("profile.twoFaEnrollError"), variant: "destructive" });
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
        toast({ title: t("common.error"), description: challengeError.message, variant: "destructive" });
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      if (verifyError) {
        toast({ title: t("common.error"), description: t("profile.invalidCode"), variant: "destructive" });
        return;
      }
      toast({ title: t("profile.twoFaActivatedSuccess") });
      setTwoFaEnabled(true);
      setTotpUri(null);
      setTotpSecret(null);
      setFactorId(null);
      setVerifyCode("");
    } catch {
      toast({ title: t("common.error"), description: t("profile.verificationFailed"), variant: "destructive" });
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
        toast({ title: t("profile.twoFaDeactivated") });
        setTwoFaEnabled(false);
      } else {
        const data = await res.json();
        toast({ title: t("common.error"), description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: t("common.error"), description: t("profile.twoFaDisableError"), variant: "destructive" });
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
          <h2 className="text-xl font-semibold">{t("profile.notLoggedIn")}</h2>
          <p className="text-muted-foreground text-sm">{t("profile.notLoggedInDesc")}</p>
          <Button onClick={() => navigate("/login")} data-testid="button-go-login">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("profile.goLogin")}
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
            <Badge variant="outline" className="ml-2">{t("profile.title")}</Badge>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")} data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("profile.back")}
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
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
                {profile.is_supporter && (
                  <Badge variant="outline" className="border-pink-500/30 text-pink-500" data-testid="badge-supporter">
                    <Heart className="w-3 h-3 mr-1" />
                    {t("profile.supporter")}
                  </Badge>
                )}
                {referralStats && (() => {
                  const rank = getReferralRank(referralStats.totalCredits);
                  return (
                    <Badge variant="outline" data-testid="badge-referral-rank" style={{ borderColor: rank.current.color + "50", color: rank.current.color }}>
                      <Trophy className="w-3 h-3 mr-1" />
                      {rank.current.name}
                    </Badge>
                  );
                })()}
              </div>
              <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
              <p className="text-xs text-muted-foreground">ID: #{profile.unique_id}</p>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-secondary/50 border border-border/50">
          {([
            { id: "compte" as const, label: "Compte", icon: User },
            { id: "securite" as const, label: "Sécurité", icon: ShieldCheck },
            { id: "discord" as const, label: "Discord", icon: Link },
            { id: "parrainage" as const, label: "Parrainage", icon: Gift },
            { id: "sessions" as const, label: "Sessions", icon: Monitor },
          ]).map((tab) => (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground bg-transparent hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "compte" && (
          <section className="space-y-4">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Pencil className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-display font-bold">{t("profile.editUsername")}</h3>
              </div>
              {canChangeName ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="display-name">{t("profile.usernameLabel")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="display-name"
                        data-testid="input-display-name"
                        placeholder={t("profile.usernamePlaceholder")}
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
                  <p className="text-xs text-muted-foreground">{t("profile.usernameHint")}</p>
                </>
              ) : (
                <div className="flex items-center gap-3 text-sm">
                  <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="font-medium">{t("profile.adminOnly")}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{t("profile.adminOnlyDesc")}</p>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6 space-y-4">
              <div className="grid gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("profile.emailLabel")}</p>
                  <p className="text-sm">{profile.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t("profile.memberSince")}</p>
                  <p className="text-sm">{new Date(profile.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              </div>
            </Card>
          </section>
        )}

        {activeTab === "securite" && (
          <section className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-display font-bold">{t("profile.twoFa")}</h3>
              </div>
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
                      <p className="font-medium text-sm">{t("profile.twoFaEnabled")}</p>
                      <p className="text-xs text-muted-foreground">{t("profile.twoFaEnabledDesc")}</p>
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
                    {t("profile.disableTwoFa")}
                  </Button>
                </div>
              ) : totpUri ? (
                <div className="space-y-4">
                  <p className="text-sm">{t("profile.scanQrCode")}</p>
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
                      <p className="text-xs text-muted-foreground">{t("profile.manualCode")}</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all select-all">{totpSecret}</code>
                        <Button variant="ghost" size="icon" onClick={copySecret} data-testid="button-copy-secret">
                          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="verify-code">{t("profile.verifyCodeLabel")}</Label>
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
                        {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : t("profile.verify")}
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
                      <p className="font-medium text-sm">{t("profile.twoFaDisabled")}</p>
                      <p className="text-xs text-muted-foreground">{t("profile.twoFaDisabledDesc")}</p>
                    </div>
                  </div>
                  <Button
                    onClick={startEnroll}
                    disabled={enrolling}
                    data-testid="button-enable-2fa"
                  >
                    {enrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    {t("profile.enableTwoFa")}
                  </Button>
                </div>
              )}
            </Card>
          </section>
        )}

        {activeTab === "discord" && (
          <section className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Link className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-display font-bold">{t("profile.linkDiscord")}</h3>
              </div>
              {profile.discord_id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t("profile.discordLinked")}</p>
                      <p className="text-xs text-muted-foreground">ID: {profile.discord_id}</p>
                    </div>
                    {profile.is_supporter && (
                      <Badge variant="outline" className="border-pink-500/30 text-pink-500 ml-auto" data-testid="badge-supporter-discord">
                        <Heart className="w-3 h-3 mr-1" />
                        {t("profile.supporter")}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-unlink-discord"
                    onClick={async () => {
                      try {
                        const token = getAccessToken();
                        const res = await fetch("/api/profile/discord", {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok) {
                          setProfile((p) => p ? { ...p, discord_id: null, is_supporter: false } : p);
                          toast({ title: t("profile.discordUnlinkedSuccess") });
                        }
                      } catch {
                        toast({ title: t("profile.discordUnlinkError"), variant: "destructive" });
                      }
                    }}
                  >
                    <Unlink className="w-4 h-4 mr-1" />
                    {t("profile.unlinkDiscord")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t("profile.discord.description")}
                  </p>
                  {linkCode ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg border border-border/50">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">{t("profile.discord.codeLabel")}</p>
                          <p className="text-2xl font-mono font-bold tracking-widest text-primary" data-testid="text-link-code">{linkCode}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          data-testid="button-copy-code"
                          onClick={() => {
                            navigator.clipboard.writeText(linkCode);
                            toast({ title: t("profile.discord.codeCopied") });
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{t("profile.discord.codeInstructions")}</p>
                        <code className="text-xs bg-secondary/50 px-2 py-1 rounded">/link {linkCode}</code>
                      </div>
                      <p className="text-xs text-muted-foreground">{t("profile.discord.codeExpiry")}</p>
                    </div>
                  ) : (
                    <Button
                      data-testid="button-generate-code"
                      disabled={generatingCode}
                      onClick={async () => {
                        setGeneratingCode(true);
                        try {
                          const token = getAccessToken();
                          const res = await fetch("/api/profile/discord/generate-code", {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setLinkCode(data.code);
                            toast({ title: t("profile.discord.codeGenerated") });
                          } else {
                            toast({ title: data.message || t("common.error"), variant: "destructive" });
                          }
                        } catch {
                          toast({ title: t("profile.discord.linkError"), variant: "destructive" });
                        } finally {
                          setGeneratingCode(false);
                        }
                      }}
                      className="gap-2"
                    >
                      {generatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                      {t("profile.discord.generateCode")}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </section>
        )}

        {activeTab === "parrainage" && (
          <section className="space-y-4">
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Gift className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-display font-bold">Programme de Parrainage</h3>
              </div>

              {loadingReferral ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !referralStats ? (
                <div className="text-center py-8">
                  <Gift className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Impossible de charger les données de parrainage.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => { setLoadingReferral(true); fetchReferralStats(); }}>
                    Réessayer
                  </Button>
                </div>
              ) : (() => {
                const { current, nextRank, rankIndex } = getReferralRank(referralStats.totalCredits);
                const progress = nextRank
                  ? ((referralStats.totalCredits - current.threshold) / (nextRank.threshold - current.threshold)) * 100
                  : 100;
                return (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg border border-border/50">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Ton code de parrainage</p>
                        <p className="text-2xl font-mono font-bold tracking-widest" style={{ color: current.color }} data-testid="text-referral-code">
                          {referralStats.code}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        data-testid="button-copy-referral"
                        onClick={() => {
                          navigator.clipboard.writeText(referralStats.code);
                          setCopiedReferral(true);
                          setTimeout(() => setCopiedReferral(false), 2000);
                          toast({ title: "Code copié !" });
                        }}
                      >
                        {copiedReferral ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Partage ton code avec d'autres utilisateurs. Quand quelqu'un s'abonne avec ton code, tu gagnes <span className="text-primary font-semibold">1 Crédit Discreen</span>.</p>
                      <p>Plus tu accumules de crédits, plus ton grade augmente !</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 text-center">
                        <p className="text-2xl font-bold text-primary">{referralStats.totalCredits}</p>
                        <p className="text-xs text-muted-foreground mt-1">Crédits Discreen</p>
                      </div>
                      <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 text-center">
                        <p className="text-2xl font-bold text-primary">{referralStats.referralCount}</p>
                        <p className="text-xs text-muted-foreground mt-1">Parrainages</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4" style={{ color: current.color }} />
                          <span className="font-semibold text-sm" style={{ color: current.color }}>{current.name}</span>
                        </div>
                        {nextRank && (
                          <span className="text-xs text-muted-foreground">
                            {referralStats.totalCredits}/{nextRank.threshold} vers {nextRank.name}
                          </span>
                        )}
                      </div>
                      <div className="w-full h-3 rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(progress, 100)}%`,
                            background: `linear-gradient(90deg, ${current.color}, ${nextRank?.color || current.color})`,
                          }}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Star className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-display font-bold">Échelle des Grades</h3>
              </div>
              <div className="space-y-2">
                {REFERRAL_RANKS.map((rank, idx) => {
                  const isCurrentRank = referralStats && getReferralRank(referralStats.totalCredits).rankIndex === idx;
                  const isAchieved = referralStats && referralStats.totalCredits >= rank.threshold;
                  return (
                    <div
                      key={rank.name}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isCurrentRank
                          ? "border-primary/50 bg-primary/5 shadow-sm"
                          : isAchieved
                          ? "border-border/50 bg-secondary/10"
                          : "border-border/20 opacity-50"
                      }`}
                      data-testid={`rank-item-${rank.name}`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          backgroundColor: isAchieved ? rank.color + "20" : "transparent",
                          border: `2px solid ${isAchieved ? rank.color : "hsl(var(--border))"}`,
                          color: isAchieved ? rank.color : "hsl(var(--muted-foreground))",
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: isAchieved ? rank.color : undefined }}>
                          {rank.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {rank.threshold === 0 ? "Début" : `${rank.threshold} crédits requis`}
                        </p>
                      </div>
                      {isCurrentRank && (
                        <Badge variant="outline" className="text-xs shrink-0" style={{ borderColor: rank.color + "50", color: rank.color }}>
                          Grade actuel
                        </Badge>
                      )}
                      {isAchieved && !isCurrentRank && (
                        <Check className="w-4 h-4 shrink-0" style={{ color: rank.color }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>
        )}

        {activeTab === "sessions" && (
          <section className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Monitor className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-display font-bold">Sessions Actives</h3>
              </div>
              {loadingSessions ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune session active.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {sessions.length} session{sessions.length > 1 ? "s" : ""} active{sessions.length > 1 ? "s" : ""} (max 2)
                  </p>
                  {sessions.map((session) => {
                    const ua = parseUserAgent(session.userAgent || "");
                    const DeviceIcon = ua.isMobile ? Smartphone : Monitor;
                    return (
                      <div
                        key={session.id}
                        className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-secondary/10"
                        data-testid={`session-item-${session.id}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <DeviceIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{ua.browser}</p>
                            <Badge variant="secondary" className="text-xs">{ua.os}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Derniere activite : {timeAgo(session.lastActiveAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </section>
        )}
      </main>

      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("profile.editAvatar")}</DialogTitle>
            <DialogDescription>
              {t("profile.editAvatarDesc")}
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
              <Label htmlFor="avatar-url">{t("profile.imageUrl")}</Label>
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
                {t("common.cancel")}
              </Button>
              <Button onClick={saveAvatar} disabled={savingAvatar} data-testid="button-save-avatar">
                {savingAvatar ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
