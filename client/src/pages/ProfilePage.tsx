import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, User, Mail, CreditCard, Lock, Eye, EyeOff,
  Check, Loader2, ChevronRight, ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Role badge ─────────────────────────────────────────── */
const ROLE_STYLE: Record<string, string> = {
  admin:    "bg-red-500/15 text-red-400 border-red-500/30",
  pro:      "bg-primary/15 text-primary border-primary/30",
  business: "bg-primary/15 text-primary border-primary/30",
  vip:      "bg-amber-400/15 text-amber-400 border-amber-400/30",
  free:     "bg-muted/50 text-muted-foreground border-border/40",
  api:      "bg-blue-500/15 text-blue-400 border-blue-500/30",
};
const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", pro: "PRO", business: "Business", vip: "VIP", free: "Gratuit", api: "API",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ROLE_STYLE[role] ?? ROLE_STYLE.free}`}>
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

/* ── Section wrapper ────────────────────────────────────── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/70 px-1">{label}</p>
      <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden divide-y divide-border/40">
        {children}
      </div>
    </div>
  );
}

/* ── Static row ─────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value, sub, onClick, accent }: {
  icon: React.ElementType; label: string; value: React.ReactNode; sub?: string;
  onClick?: () => void; accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 px-4 py-3.5 ${onClick ? "cursor-pointer hover:bg-secondary/30 transition-colors" : ""}`}
      onClick={onClick}
    >
      <Icon className={`w-4 h-4 shrink-0 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{value}</span>
        {onClick && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />}
      </div>
    </div>
  );
}

/* ── Inline edit field ──────────────────────────────────── */
function EditRow({
  icon: Icon, label, sub, placeholder, type = "text",
  onSave, validate, extraField,
}: {
  icon: React.ElementType; label: string; sub?: string; placeholder?: string; type?: string;
  onSave: (value: string, extra?: string) => Promise<void>;
  validate?: (value: string) => string | null;
  extraField?: { placeholder: string; label: string; type?: string };
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [extra, setExtra] = useState("");
  const [showVal, setShowVal] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const inputType = type === "password" ? (showVal ? "text" : "password") : type;
  const extraType = type === "password" ? (showExtra ? "text" : "password") : type;

  const handleSave = async () => {
    if (validate) { const e = validate(value); if (e) { setErr(e); return; } }
    setSaving(true); setErr(null);
    try {
      await onSave(value, extra || undefined);
      setDone(true); setValue(""); setExtra("");
      setTimeout(() => { setDone(false); setOpen(false); }, 1200);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div
        className="flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => { setOpen(v => !v); setErr(null); setValue(""); setExtra(""); setDone(false); }}
      >
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/40 bg-secondary/10"
          >
            <div className="px-4 py-4 space-y-3">
              <div className="relative">
                <Input
                  type={inputType}
                  placeholder={placeholder}
                  value={value}
                  onChange={e => { setValue(e.target.value); setErr(null); }}
                  className="pr-10 bg-secondary/40 border-border/50 focus-visible:border-primary/60"
                  onKeyDown={e => e.key === "Enter" && !extraField && handleSave()}
                />
                {type === "password" && (
                  <button type="button" tabIndex={-1} onClick={() => setShowVal(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
                    {showVal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {extraField && (
                <div className="relative">
                  <Input
                    type={extraType}
                    placeholder={extraField.placeholder}
                    value={extra}
                    onChange={e => { setExtra(e.target.value); setErr(null); }}
                    className="pr-10 bg-secondary/40 border-border/50 focus-visible:border-primary/60"
                    onKeyDown={e => e.key === "Enter" && handleSave()}
                  />
                  {type === "password" && (
                    <button type="button" tabIndex={-1} onClick={() => setShowExtra(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
                      {showExtra ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              )}
              {err && <p className="text-xs text-destructive">{err}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !value.trim()}
                  className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : done ? <Check className="w-3 h-3" /> : null}
                  {done ? "Sauvegardé" : "Sauvegarder"}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="h-8 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export default function ProfilePage() {
  const { user, role, loading, refreshRole } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
  if (!user) { navigate("/login"); return null; }

  const apiCall = async (url: string, body: object) => {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Erreur serveur");
    return data;
  };

  const handleUsername = async (username: string) => {
    await apiCall("/api/auth/profile/username", { username });
    toast({ title: "Pseudo mis à jour !" });
    await refreshRole();
  };

  const handleEmail = async (email: string) => {
    await apiCall("/api/auth/profile/email", { email });
    toast({ title: "Email mis à jour !" });
    await refreshRole();
  };

  const handlePassword = async (newPassword: string, currentPassword?: string) => {
    await apiCall("/api/auth/profile/password", { currentPassword, newPassword });
    toast({ title: "Mot de passe modifié !" });
  };

  const currentEmail = (user as any).email as string | null;
  const currentUsername = (user as any).username ?? user.user_metadata?.display_name ?? "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold">Paramètres</h1>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Avatar + name hero */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-xl font-bold text-primary">
            {currentUsername?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-lg font-bold">{currentUsername}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <RoleBadge role={role ?? "free"} />
              {role === "admin" && <ShieldCheck className="w-3.5 h-3.5 text-red-400" />}
            </div>
          </div>
        </div>

        {/* COMPTE */}
        <Section label="Compte">
          <EditRow
            icon={User}
            label="Pseudo"
            sub={`Actuel\u00a0: ${currentUsername}`}
            placeholder="nouveau_pseudo"
            validate={v => /^[a-z0-9_]{3,20}$/.test(v.trim()) ? null : "3–20 car., minuscules, chiffres, _"}
            onSave={handleUsername}
          />
          <EditRow
            icon={Mail}
            label="Email"
            sub={currentEmail ? `Actuel\u00a0: ${currentEmail}` : "Aucun email — ajoutez-en un"}
            placeholder="exemple@mail.com"
            type="email"
            validate={v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Email invalide"}
            onSave={handleEmail}
          />
          <InfoRow
            icon={CreditCard}
            label="Abonnement"
            value={<RoleBadge role={role ?? "free"} />}
            onClick={() => navigate("/pricing")}
          />
        </Section>

        {/* MOT DE PASSE */}
        <Section label="Mot de passe">
          <EditRow
            icon={Lock}
            label="Changer le mot de passe"
            sub="Saisissez votre mot de passe actuel pour continuer"
            placeholder="Mot de passe actuel"
            type="password"
            extraField={{ placeholder: "Nouveau mot de passe (8+ car.)", label: "Nouveau" }}
            validate={v => v.length >= 1 ? null : "Requis"}
            onSave={handlePassword}
          />
        </Section>

        {/* Danger zone — placeholder for future */}
        <div className="pt-2">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/40 px-1 mb-2">Zone</p>
          <div className="rounded-xl border border-border/40 bg-card/30 px-4 py-3.5 flex items-center gap-4">
            <Lock className="w-4 h-4 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground/60">Suppression de compte — contacter le support</p>
          </div>
        </div>
      </div>
    </div>
  );
}
