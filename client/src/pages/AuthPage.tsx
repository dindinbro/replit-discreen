import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, User, Lock, ArrowRight, Eye, EyeOff, Wand2, Check, Minus } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Logo ──────────────────────────────────────────────────── */
function DiscreenLogo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-primary" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight text-foreground font-display">
        Di<span className="text-primary">screen</span>
      </span>
    </div>
  );
}

/* ── Password strength rules ───────────────────────────────── */
interface Rule {
  id: string;
  label: string;
  test: (username: string, password: string, confirm: string) => boolean;
}

const PASSWORD_RULES: Rule[] = [
  {
    id: "username_len",
    label: "Pseudo\u00a0: 3–20 car. (a–z, 0–9, _)",
    test: (u) => /^[a-z0-9_]{3,20}$/.test(u),
  },
  {
    id: "pw_len",
    label: "8 à 128 caractères",
    test: (_, p) => p.length >= 8 && p.length <= 128,
  },
  {
    id: "uppercase",
    label: "Une majuscule",
    test: (_, p) => /[A-Z]/.test(p),
  },
  {
    id: "digit",
    label: "Un chiffre",
    test: (_, p) => /[0-9]/.test(p),
  },
  {
    id: "special",
    label: "Un caractère spécial",
    test: (_, p) => /[^a-zA-Z0-9]/.test(p),
  },
  {
    id: "match",
    label: "Mots de passe identiques",
    test: (_, p, c) => p.length > 0 && c.length > 0 && p === c,
  },
];

/* ── Validation grid ───────────────────────────────────────── */
function ValidationGrid({
  username,
  password,
  confirm,
}: {
  username: string;
  password: string;
  confirm: string;
}) {
  const results = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(username, password, confirm) })),
    [username, password, confirm]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border/50 bg-secondary/30 p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Wand2 className="w-3.5 h-3.5 text-primary/70" />
        <span>Générer un mot de passe fort</span>
      </div>

      {/* Rules grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {results.map((r) => (
          <div key={r.id} className="flex items-start gap-2">
            <span
              className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-300 ${
                r.ok
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/20 text-muted-foreground"
              }`}
            >
              {r.ok ? (
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              ) : (
                <Minus className="w-2.5 h-2.5" strokeWidth={3} />
              )}
            </span>
            <span
              className={`text-[11.5px] leading-snug transition-colors duration-300 ${
                r.ok ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {r.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Generate strong password ──────────────────────────────── */
function generatePassword(len = 16): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const specials = "!@#$%^&*-_+=?";
  const all = lower + upper + digits + specials;
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  // Guarantee at least one of each required category
  const mandatory = [rand(upper), rand(digits), rand(specials)];
  const rest = Array.from({ length: len - mandatory.length }, () => rand(all));
  return [...mandatory, ...rest].sort(() => Math.random() - 0.5).join("");
}

/* ── Main component ────────────────────────────────────────── */
export default function AuthPage() {
  const { signIn, signUp, loading, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const allRulesPass = useMemo(
    () => PASSWORD_RULES.every((r) => r.test(username, password, confirm)),
    [username, password, confirm]
  );

  if (user) { navigate("/"); return null; }
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const handleGenerate = () => {
    const p = generatePassword();
    setPassword(p);
    setConfirm(p);
    setShowPassword(true);
    setShowConfirm(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register" && !allRulesPass) {
      setError("Tous les critères doivent être satisfaits.");
      return;
    }

    setSubmitting(true);
    const fn = mode === "login" ? signIn : signUp;
    const result = await fn(username, password);
    setSubmitting(false);
    if (result.error) { setError(result.error); return; }
    setSuccess(true);
    setTimeout(() => navigate("/"), 300);
  };

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setError(null);
    setPassword("");
    setConfirm("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/40">
        <DiscreenLogo />
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold font-display tracking-tight mb-2">
              {mode === "login" ? "Connexion" : "Créer un compte"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Accédez à votre espace Discreen."
                : "Rejoignez Discreen et accédez aux données."}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl bg-secondary/40 p-1 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 shadow-xl shadow-black/10">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    type="text"
                    placeholder="votre_pseudo"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(null); }}
                    required
                    autoComplete="username"
                    autoFocus
                    className="pl-10 bg-secondary/30 border-border/50 focus-visible:border-primary/60 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Mot de passe
                  </label>
                  {mode === "register" && (
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary transition-colors"
                    >
                      <Wand2 className="w-3 h-3" />
                      Générer
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "register" ? "Min. 8 caractères" : "••••••••"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="pl-10 pr-10 bg-secondary/30 border-border/50 focus-visible:border-primary/60 focus-visible:ring-primary/20"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password — register only */}
              <AnimatePresence>
                {mode === "register" && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                      <Input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Répétez le mot de passe"
                        value={confirm}
                        onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                        autoComplete="new-password"
                        className={`pl-10 pr-10 bg-secondary/30 border-border/50 focus-visible:border-primary/60 focus-visible:ring-primary/20 transition-colors ${
                          confirm.length > 0 && confirm !== password
                            ? "border-destructive/60"
                            : confirm.length > 0 && confirm === password
                            ? "border-green-500/60"
                            : ""
                        }`}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Validation grid — register only */}
              <AnimatePresence>
                {mode === "register" && (
                  <ValidationGrid username={username} password={password} confirm={confirm} />
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || success || (mode === "register" && !allRulesPass)}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:shadow-primary/40"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : success ? (
                  <span>Redirection…</span>
                ) : (
                  <>
                    {mode === "login" ? "Se connecter" : "Créer mon compte"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            En continuant, vous acceptez nos{" "}
            <span className="underline underline-offset-2 cursor-pointer hover:text-foreground transition-colors">
              conditions d'utilisation
            </span>.
          </p>
        </div>
      </div>
    </div>
  );
}
