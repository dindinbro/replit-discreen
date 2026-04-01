import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { type Session, type User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

function getOrCreateSessionToken(): string {
  let token = sessionStorage.getItem("discreen_session_token");
  if (!token) {
    token = crypto.randomUUID() + "-" + Date.now().toString(36);
    sessionStorage.setItem("discreen_session_token", token);
  }
  return token;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: string | null;
  frozen: boolean;
  loading: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  expiresAt: string | null;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => string | null;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const sessionRegisteredRef = useRef(false);

  const registerSession = useCallback(async (accessToken: string): Promise<boolean> => {
    try {
      const sessionToken = getOrCreateSessionToken();
      const res = await fetch("/api/session/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ sessionToken }),
      });
      if (!res.ok) {
        console.error("Session register failed:", res.status);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Session register error:", err);
      return false;
    }
  }, []);

  const fetchRole = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRole(data.role || "user");
        setFrozen(!!data.frozen);
        setDisplayName(data.display_name || null);
        setAvatarUrl(data.avatar_url || null);
        setExpiresAt(data.expires_at || null);

        if (!sessionRegisteredRef.current) {
          const ok = await registerSession(accessToken);
          if (ok) sessionRegisteredRef.current = true;
        }
      } else {
        setRole("user");
        setFrozen(false);
        setDisplayName(null);
        setAvatarUrl(null);
        setExpiresAt(null);
      }
    } catch {
      setRole("user");
      setFrozen(false);
      setDisplayName(null);
      setAvatarUrl(null);
      setExpiresAt(null);
    }
  }, [registerSession]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let loadingResolved = false;
    const resolveLoading = () => {
      if (!loadingResolved) {
        loadingResolved = true;
        setLoading(false);
      }
    };

    // ① Register listener FIRST — it is the single source of truth for resolving loading
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.access_token) {
        fetchRole(newSession.access_token).then(resolveLoading);
      } else {
        setRole(null);
        resolveLoading();
      }
    });

    // ② Then initialise the session — handles all OAuth redirect cases
    const initSession = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");

      if (code) {
        // PKCE flow: explicit code exchange fires onAuthStateChange → SIGNED_IN
        try {
          await supabase.auth.exchangeCodeForSession(code);
          // Remove code from URL so a page refresh doesn't fail the exchange
          const clean = window.location.pathname + window.location.hash;
          window.history.replaceState({}, "", clean);
        } catch {
          // Code already consumed by detectSessionInUrl — check for existing session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) resolveLoading();
        }
        return;
      }

      // Implicit flow / existing session: getSession() triggers detectSessionInUrl
      // which fires onAuthStateChange automatically via the Supabase SDK
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !window.location.hash.includes("access_token")) {
        // Truly not logged in — safe to unblock
        resolveLoading();
      }
      // Otherwise wait for onAuthStateChange (hash or refreshed session)
    };

    initSession();

    // Safety valve — never block more than 10 s
    const safetyTimer = setTimeout(resolveLoading, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [fetchRole]);

  useEffect(() => {
    if (!session?.access_token) return;
    const interval = setInterval(() => {
      fetchRole(session.access_token);
    }, 30_000);
    return () => clearInterval(interval);
  }, [session?.access_token, fetchRole]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Auth not configured" };

    try {
      const checkRes = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();
      if (checkData.blocked) {
        return { error: "Les adresses email temporaires ne sont pas autorisees. Veuillez utiliser une adresse email valide." };
      }
    } catch {
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user && !data.session && data.user.identities?.length === 0) {
      return { error: "Un compte existe deja avec cette adresse email. Essayez de vous connecter." };
    }
    return { error: null };
  }, []);

  const signInWithDiscord = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const token = session?.access_token;
    const sessionToken = sessionStorage.getItem("discreen_session_token");
    if (token && sessionToken) {
      try {
        await fetch("/api/session", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionToken }),
        });
      } catch {}
    }
    sessionStorage.removeItem("discreen_session_token");
    sessionRegisteredRef.current = false;
    await supabase.auth.signOut();
    setRole(null);
    setFrozen(false);
  }, [session]);

  const getAccessToken = useCallback(() => {
    return session?.access_token ?? null;
  }, [session]);

  const refreshRole = useCallback(async () => {
    const token = session?.access_token;
    if (token) {
      await fetchRole(token);
    }
  }, [session, fetchRole]);

  return (
    <AuthContext.Provider value={{
      session,
      user,
      role,
      frozen,
      loading,
      displayName,
      avatarUrl,
      expiresAt,
      signInWithEmail,
      signUpWithEmail,
      signInWithDiscord,
      signOut,
      getAccessToken,
      refreshRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
