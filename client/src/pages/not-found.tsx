import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompassIcon, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md animate-in border-primary/20 shadow-lg shadow-primary/5">
        <CardContent className="pt-10 pb-8 flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/30 mb-5">
            <CompassIcon className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Page introuvable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            Cette page n'existe pas ou a été déplacée.
          </p>

          <Button asChild className="mt-6 gap-2">
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
