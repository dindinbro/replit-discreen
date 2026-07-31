import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { DiscreenMark } from "@/components/Layout";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        <span className="font-display font-black text-[38vw] leading-none select-none">404</span>
      </div>

      <Card className="w-full max-w-md animate-in border-primary/20 shadow-lg shadow-primary/5 relative">
        <CardContent className="pt-10 pb-8 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mb-5"
          >
            <DiscreenMark className="w-8 h-8" spin />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Aucune correspondance
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            Cette page ne figure dans aucune de nos bases. Même nos sources les plus complètes ont leurs limites.
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
