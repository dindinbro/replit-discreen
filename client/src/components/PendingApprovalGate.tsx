import { useLocation } from "wouter";
import { Clock, XCircle, LogOut, RefreshCw, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const BYPASS_PATHS = ["/login", "/admin", "/auth/callback", "/contact"];

export default function PendingApprovalGate({ children }: { children: React.ReactNode }) {
  const { user, loading, role, signOut, refreshRole } = useAuth();
  const [location, navigate] = useLocation();

  const isBypassed = BYPASS_PATHS.some((p) => location === p || location.startsWith(p + "/"));
  const blocked = !loading && !!user && role !== "admin" && user.status !== "approved" && !isBypassed;

  return (
    <>
      {children}
      {blocked && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-xl px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141519]/95 shadow-2xl overflow-hidden text-center">
            <div className="px-8 pt-8 pb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 mb-5">
                {user!.status === "rejected" ? (
                  <XCircle className="w-7 h-7 text-red-400" />
                ) : (
                  <Clock className="w-7 h-7 text-white/80" />
                )}
              </div>
              <h2 className="text-lg font-semibold text-white">
                {user!.status === "rejected" ? "Compte refusé" : "Compte en attente de validation"}
              </h2>
              <p className="mt-2 text-sm text-white/50 leading-relaxed">
                {user!.status === "rejected"
                  ? "Ta demande d'inscription n'a pas été validée. Contacte un administrateur si tu penses qu'il s'agit d'une erreur."
                  : "Un administrateur doit approuver ton compte avant que tu puisses utiliser Discreen. Reviens un peu plus tard."}
              </p>
            </div>

            <div className="border-t border-white/10 divide-y divide-white/10">
              {user!.status === "rejected" ? (
                <button
                  onClick={() => navigate("/contact")}
                  className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-primary hover:bg-white/5 transition-colors"
                  data-testid="button-pending-contact"
                >
                  <Mail className="w-4 h-4" />
                  Nous contacter
                </button>
              ) : (
                <button
                  onClick={() => refreshRole()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-primary hover:bg-white/5 transition-colors"
                  data-testid="button-pending-refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualiser
                </button>
              )}
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-white/60 hover:bg-white/5 transition-colors"
                data-testid="button-pending-logout"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
