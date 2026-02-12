import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { type Session, type User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: string | null;
  frozen: boolean;
  loading: boolean;
  displayName: string | null;
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
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

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
        setExpiresAt(data.expires_at || null);
      } else {
        setRole("user");
        setFrozen(false);
        setDisplayName(null);
        setExpiresAt(null);
      }
    } catch {
      setRole("user");
      setFrozen(false);
      setDisplayName(null);
      setExpiresAt(null);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.access_token) {
        fetchRole(currentSession.access_token).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.access_token) {
        fetchRole(newSession.access_token);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
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
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signInWithDiscord = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: window.location.origin,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setRole(null);
    setFrozen(false);
  }, []);

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
