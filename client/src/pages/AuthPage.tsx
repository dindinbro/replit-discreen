import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, Moon, Sun, CheckCircle2, ArrowRight, UserPlus, LogIn } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { SiDiscord } from "react-icons/si";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { t } = useTranslation();
  const { signInWithEmail, signUpWithEmail, signInWithDiscord, loading, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fn = mode === "login" ? signInWithEmail : signUpWithEmail;
    const result = await fn(email, password);

    if (result.error) {
      setError(result.error);
      setEmailSent(false);
    } else if (mode === "register") {
      setError(null);
      setEmailSent(true);
      toast({
        title: "Email de confirmation envoye",
        description: `Un email a ete envoye a ${email}. Verifiez votre boite de reception (et vos spams) pour confirmer votre compte.`,
      });
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="absolute top-4 right-4 z-10">
        <Button
          data-testid="button-theme-toggle-auth"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === "light" ? t("nav.darkMode") : t("nav.lightMode")}
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>
      </div>

      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary/20 via-primary/5 to-background items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative z-10 max-w-lg space-y-8">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Di<span className="text-primary">screen</span>
            </h1>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">
            La plateforme de recherche de donnees la plus avancee. Accedez a des milliards d'enregistrements en quelques secondes.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Recherche multi-criteres avancee</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Acces a plusieurs sources de donnees</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">API disponible pour les developpeurs</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3 lg:hidden">
            <div className="flex items-center justify-center gap-2">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Di<span className="text-primary">screen</span>
            </h1>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight" data-testid="text-auth-heading">
              {mode === "register" ? "Creer un compte" : "Content de vous revoir"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === "register"
                ? "Inscrivez-vous pour acceder a la plateforme Discreen."
                : "Connectez-vous a votre compte Discreen."}
            </p>
          </div>

          <div className="flex rounded-lg bg-secondary/50 p-1" data-testid="tabs-auth-mode">
            <button
              type="button"
              data-testid="tab-register"
              onClick={() => { setMode("register"); setError(null); setEmailSent(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                mode === "register"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Inscription
            </button>
            <button
              type="button"
              data-testid="tab-login"
              onClick={() => { setMode("login"); setError(null); setEmailSent(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                mode === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <LogIn className="w-4 h-4" />
              Connexion
            </button>
          </div>

          <Card className="p-6 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="auth-email">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="auth-email"
                    data-testid="input-email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="auth-password">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="auth-password"
                    data-testid="input-password"
                    type="password"
                    placeholder={mode === "register" ? "6 caracteres minimum" : "Votre mot de passe"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-auth-error">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {emailSent && !error && (
                <div className="flex items-start gap-2 text-sm text-primary bg-primary/10 p-3 rounded-md" data-testid="text-email-sent">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Un email de confirmation a ete envoye a <strong>{email}</strong>. Verifiez votre boite de reception et vos spams.</span>
                </div>
              )}

              <Button
                data-testid="button-submit-auth"
                type="submit"
                className="w-full gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === "register" ? (
                  <UserPlus className="w-4 h-4" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {mode === "register" ? "Creer mon compte" : "Se connecter"}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("auth.or")}</span>
              </div>
            </div>

            <Button
              data-testid="button-discord-login"
              variant="outline"
              className="w-full gap-2"
              onClick={() => signInWithDiscord()}
            >
              <SiDiscord className="w-4 h-4" />
              {mode === "register" ? "S'inscrire avec Discord" : t("auth.discordLogin")}
            </Button>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialite.
          </p>
        </div>
      </div>
    </div>
  );
}
