import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, Moon, Sun, CheckCircle2 } from "lucide-react";
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
  const [mode, setMode] = useState<"login" | "register">("login");
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
    <div className="min-h-screen flex items-center justify-center bg-background bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background px-4 relative">
      <div className="absolute top-4 right-4">
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
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Di<span className="text-primary">screen</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-email"
                  type="email"
                  placeholder={t("auth.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-password"
                  type="password"
                  placeholder={t("auth.password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-auth-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {emailSent && !error && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 p-3 rounded-md" data-testid="text-email-sent">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Un email de confirmation a ete envoye a <strong>{email}</strong>. Verifiez votre boite de reception et vos spams.</span>
              </div>
            )}

            <Button
              data-testid="button-submit-auth"
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {mode === "login" ? t("auth.login") : t("auth.register")}
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
            {t("auth.discordLogin")}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <span>
                {t("auth.noAccount")}{" "}
                <button
                  data-testid="button-switch-to-register"
                  type="button"
                  onClick={() => { setMode("register"); setError(null); }}
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  {t("auth.createAccount")}
                </button>
              </span>
            ) : (
              <span>
                {t("auth.hasAccount")}{" "}
                <button
                  data-testid="button-switch-to-login"
                  type="button"
                  onClick={() => { setMode("login"); setError(null); }}
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  {t("auth.signIn")}
                </button>
              </span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
