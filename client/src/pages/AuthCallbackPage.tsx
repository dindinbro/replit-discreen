import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setStatus("error");
      setErrorMsg("Auth non configuré.");
      return;
    }

    // Check for error in URL first
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const errorParam = searchParams.get("error") || hashParams.get("error");
    const errorDescription = searchParams.get("error_description") || hashParams.get("error_description");

    if (errorParam) {
      setStatus("error");
      setErrorMsg(errorDescription || errorParam);
      return;
    }

    let done = false;
    const finish = (success: boolean, msg?: string) => {
      if (done) return;
      done = true;
      if (success) {
        setStatus("success");
        setTimeout(() => navigate("/search"), 800);
      } else {
        setStatus("error");
        setErrorMsg(msg || "La session n'a pas pu être établie.");
      }
    };

    // Listen for auth state changes — covers both implicit (hash token) and PKCE (code exchange)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        subscription.unsubscribe();
        finish(true);
      }
    });

    // Also try to get an existing session immediately (in case detectSessionInUrl already ran)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        finish(true);
      }
    });

    // If there's a code in the URL (PKCE fallback), try to exchange it
    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          // Code might already be consumed by detectSessionInUrl — check session
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session && !done) {
              finish(false, error.message);
            }
          });
        }
      });
    }

    // Timeout fallback — give 10 seconds for the session to be established
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          finish(true);
        } else {
          finish(false, "Délai d'attente dépassé. Réessaye.");
        }
      });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center p-8">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Connexion en cours…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="text-foreground font-medium">Connecté ! Redirection…</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-red-500" />
            <p className="text-foreground font-medium">Erreur de connexion</p>
            {errorMsg && (
              <p className="text-muted-foreground text-sm max-w-sm">{errorMsg}</p>
            )}
            <button
              className="mt-2 text-primary underline text-sm"
              onClick={() => navigate("/login")}
            >
              Retour à la connexion
            </button>
          </>
        )}
      </div>
    </div>
  );
}
