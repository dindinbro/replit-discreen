import { Switch, Route, Redirect } from "wouter";
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
import AuthPage from "@/pages/AuthPage";
import AdminPage from "@/pages/AdminPage";
import ApiKeysPage from "@/pages/ApiKeysPage";
import DocumentationPage from "@/pages/DocumentationPage";
import VouchesPage from "@/pages/VouchesPage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import ProfilePage from "@/pages/ProfilePage";
import BlacklistRequestPage from "@/pages/BlacklistRequestPage";
import UsersPage from "@/pages/UsersPage";
import Layout from "@/components/Layout";
import { Loader2 } from "lucide-react";

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
      <Route path="/users">
        <PublicRoute component={UsersPage} />
      </Route>
      <Route path="/documentation">
        <PublicRoute component={DocumentationPage} />
      </Route>
      <Route path="/pricing">
        <PublicRoute component={PricingPage} />
      </Route>
      <Route path="/contact">
        <PublicRoute component={ContactPage} />
      </Route>
      <Route path="/avis">
        <PublicRoute component={VouchesPage} />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
