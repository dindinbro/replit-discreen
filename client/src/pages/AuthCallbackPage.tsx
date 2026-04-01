import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      if (!supabase) {
        setStatus("error");
        setErrorMsg("Auth non configuré.");
        return;
      }

      // Check for error in URL (from Discord/Supabase)
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const errorParam = searchParams.get("error") || hashParams.get("error");
      const errorDescription = searchParams.get("error_description") || hashParams.get("error_description");

      if (errorParam) {
        setStatus("error");
        setErrorMsg(errorDescription || errorParam);
        return;
      }

      // Check if the Supabase SDK already established a session
      // (detectSessionInUrl fires automatically on client init)
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        setStatus("success");
        setTimeout(() => navigate("/search"), 800);
        return;
      }

      // Try explicit code exchange (PKCE flow — code in query string)
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          // Code might have been consumed by detectSessionInUrl already — check session again
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            setStatus("success");
            setTimeout(() => navigate("/search"), 800);
            return;
          }
          setStatus("error");
          setErrorMsg(error.message);
          return;
        }
        setStatus("success");
        setTimeout(() => navigate("/search"), 800);
        return;
      }

      // No code in URL — wait for onAuthStateChange (implicit flow via hash)
      if (hashParams.get("access_token")) {
        // SDK handles implicit tokens automatically, just wait
        const timeout = setTimeout(() => {
          setStatus("error");
          setErrorMsg("La session n'a pas pu être établie. Réessayez.");
        }, 8000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            clearTimeout(timeout);
            subscription.unsubscribe();
            setStatus("success");
            setTimeout(() => navigate("/search"), 800);
          }
        });
        return;
      }

      // Nothing useful in URL — redirect to login
      navigate("/login");
    }

    handleCallback();
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
