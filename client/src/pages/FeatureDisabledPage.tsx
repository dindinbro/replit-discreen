import { Link } from "wouter";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Placeholder shown instead of features tied to data-dump search, sensitive
 * external sources, payments or person-lookup — temporarily disabled on
 * this environment. The original pages/routes are untouched, just not
 * mounted; see client/src/App.tsx (DISABLED_ROUTES). Rendered inside the
 * same Layout wrapper as any other route (ProtectedRoute/PublicRoute).
 */
export default function FeatureDisabledPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 gap-4">
      <div className="w-16 h-16 rounded-full bg-muted/50 border border-border/40 flex items-center justify-center">
        <ShieldOff className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">Fonctionnalité désactivée</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Cette fonctionnalité est temporairement désactivée sur cet environnement.
      </p>
      <Link href="/">
        <Button variant="outline">Retour à l'accueil</Button>
      </Link>
    </div>
  );
}
