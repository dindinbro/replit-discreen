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

      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const errorParam = params.get("error");
        const errorDescription = params.get("error_description");

        if (errorParam) {
          setStatus("error");
          setErrorMsg(errorDescription || errorParam);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setStatus("error");
            setErrorMsg(error.message);
            return;
          }
        }

        setStatus("success");
        setTimeout(() => navigate("/search"), 1000);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err?.message || "Erreur inconnue.");
      }
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
            {errorMsg && <p className="text-muted-foreground text-sm max-w-sm">{errorMsg}</p>}
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
