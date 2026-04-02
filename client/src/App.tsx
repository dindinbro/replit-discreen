import { useState, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import SearchPage from "@/pages/SearchPage";
import PricingPage from "@/pages/PricingPage";
import ContactPage from "@/pages/ContactPage";
import TutorialPage from "@/pages/TutorialPage";
import DisXPage from "@/pages/DisXPage";
import AuthPage from "@/pages/AuthPage";
import AdminPage from "@/pages/AdminPage";
import ApiKeysPage from "@/pages/ApiKeysPage";
import DocumentationPage from "@/pages/DocumentationPage";
import VouchesPage from "@/pages/VouchesPage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import ProfilePage from "@/pages/ProfilePage";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import BlacklistRequestPage from "@/pages/BlacklistRequestPage";
import InfoRequestPage from "@/pages/InfoRequestPage";
import UsersPage from "@/pages/UsersPage";
import MaintenancePage from "@/pages/MaintenancePage";
import GamePage from "@/pages/GamePage";
import Layout from "@/components/Layout";
import { Loader2, UserCircle2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SKIP_USERNAME_MODAL_PATHS = ["/auth/callback", "/admin", "/login"];

function UsernameSetupModal() {
  const { user, loading, getAccessToken, refreshRole } = useAuth();
  const [location] = useLocation();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show when display_name is not explicitly set (ignores Discord full_name fallback)
  const hasExplicitUsername = !!user?.user_metadata?.display_name?.trim();

  // Pre-fill with Discord full_name or username once user is loaded
  useEffect(() => {
    if (user && !hasExplicitUsername && value === "") {
      const suggestion = user.user_metadata?.full_name || user.user_metadata?.username || "";
      if (suggestion) setValue(suggestion);
    }
  }, [user, hasExplicitUsername]);

  const shouldShow =
    !loading &&
    !!user &&
    !hasExplicitUsername &&
    !SKIP_USERNAME_MODAL_PATHS.some((p) => location === p || location.startsWith(p + "/"));

  if (!shouldShow) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError("Le pseudo doit contenir entre 2 et 30 caractères.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/profile/setup-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ display_name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Une erreur est survenue.");
        return;
      }
      await refreshRole();
    } catch {
      setError("Erreur réseau, veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="rounded-2xl border border-primary/40 bg-background shadow-[0_0_60px_rgba(var(--primary-rgb,212,175,55),0.15)] overflow-hidden">
          <div className="bg-gradient-to-b from-primary/10 to-transparent px-8 pt-8 pb-6 text-center border-b border-border/40">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 border border-primary/30 mb-4">
              <UserCircle2 className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Choisis ton pseudo
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Avant d'accéder à <span className="text-primary font-semibold">Discreen</span>, tu dois choisir un nom d'affichage <span className="text-foreground font-medium">unique</span>.
              {user?.user_metadata?.full_name
                ? " Ton pseudo Discord est suggéré — confirme ou modifie-le."
                : " Il sera visible par les autres membres."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="setup-username">
                Nom d'utilisateur
              </label>
              <Input
                id="setup-username"
                data-testid="input-setup-username"
                placeholder="ex: ShadowHunter42"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                maxLength={30}
                autoFocus
                autoComplete="off"
                className="border-border/60 focus:border-primary/60 bg-background/60"
              />
              <div className="flex items-center justify-between">
                {error ? (
                  <p className="text-xs text-destructive">{error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Entre 2 et 30 caractères</p>
                )}
                <span className={`text-xs tabular-nums ${value.length > 25 ? "text-yellow-500" : "text-muted-foreground"}`}>
                  {value.length}/30
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={saving || value.trim().length < 2}
              data-testid="button-setup-username-submit"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {saving ? "Enregistrement..." : "Confirmer mon pseudo"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component, withLayout = true }: { component: React.ComponentType; withLayout?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (withLayout) {
    return (
      <Layout>
        <Component />
      </Layout>
    );
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth/callback">
        <AuthCallbackPage />
      </Route>
      <Route path="/login">
        <GuestRoute component={AuthPage} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminPage} withLayout={false} />
      </Route>
      <Route path="/search">
        <ProtectedRoute component={SearchPage} />
      </Route>
      <Route path="/api-keys">
        <ProtectedRoute component={ApiKeysPage} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={ProfilePage} withLayout={false} />
      </Route>
      <Route path="/blacklist-request">
        <ProtectedRoute component={BlacklistRequestPage} />
      </Route>
      <Route path="/info-request">
        <ProtectedRoute component={InfoRequestPage} />
      </Route>
      <Route path="/users">
        <PublicRoute component={UsersPage} />
      </Route>
      <Route path="/documentation">
        <PublicRoute component={DocumentationPage} />
      </Route>
      <Route path="/pricing">
        <PublicRoute component={PricingPage} />
      </Route>
      <Route path="/tuto">
        <PublicRoute component={TutorialPage} />
      </Route>
      <Route path="/disx">
        <ProtectedRoute component={DisXPage} />
      </Route>
      <Route path="/contact">
        <PublicRoute component={ContactPage} />
      </Route>
      <Route path="/avis">
        <PublicRoute component={VouchesPage} />
      </Route>
      <Route path="/game">
        <PublicRoute component={GamePage} />
      </Route>
      <Route path="/payment-success">
        <PublicRoute component={PaymentSuccessPage} />
      </Route>
      <Route path="/">
        <PublicRoute component={LandingPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { role, loading: authLoading } = useAuth();
  const [location] = useLocation();
  const [maintenance, setMaintenance] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetch("/api/site-status")
      .then((r) => r.json())
      .then((data) => setMaintenance(!!data.maintenance))
      .catch(() => setMaintenance(false))
      .finally(() => setStatusLoading(false));
  }, []);

  if (statusLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const bypassPaths = ["/login", "/admin", "/auth/callback"];
  const isBypassed = bypassPaths.some((p) => location === p || location.startsWith(p + "/"));

  if (maintenance && role !== "admin" && !isBypassed) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <Toaster />
            <UsernameSetupModal />
            <MaintenanceGate>
              <Router />
            </MaintenanceGate>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
