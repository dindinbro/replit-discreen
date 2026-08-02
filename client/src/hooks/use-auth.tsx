import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface LocalUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
  /** "pending" | "approved" | "rejected" — new accounts start pending until an admin approves them */
  status: string;
  /** True if the account had to wait on admin approval — drives the "Early" badge */
  earlyAccess: boolean;
  /** Compat shim — parts of the UI read user_metadata.display_name */
  user_metadata: { display_name: string; username: string; avatar_url?: string; full_name?: string };
  app_metadata: Record<string, unknown>;
  created_at: string;
}

interface AuthContextType {
  /** Null until loaded */
  user: LocalUser | null;
  /** Compat alias – same as user */
  session: { user: LocalUser } | null;
  role: string | null;
  frozen: boolean;
  earlyAccess: boolean;
  loading: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  expiresAt: string | null;
  uniqueId: number | null;

  /** V2 methods */
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signUp: (username: string, password: string, email?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;

  /** Legacy compat shims so existing pages don't break */
  signInWithEmail: (username: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (username: string, password: string) => Promise<{ error: string | null }>;
  signInWithDiscord: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [uniqueId, setUniqueId] = useState<number | null>(null);
  const [earlyAccess, setEarlyAccess] = useState(true);

  const applyMeData = useCallback((data: any) => {
    const u: LocalUser = {
      id: String(data.id),
      username: data.username || data.display_name || "",
      email: data.email || null,
      role: data.role || "free",
      status: data.status || "approved",
      earlyAccess: data.early_access ?? true,
      user_metadata: {
        display_name: data.display_name || data.username || "",
        username: data.username || "",
        avatar_url: data.avatar_url || undefined,
      },
      app_metadata: {},
      created_at: data.created_at || new Date().toISOString(),
    };
    setUser(u);
    setRole(data.role || "free");
    setFrozen(!!data.frozen);
    setDisplayName(data.display_name || data.username || null);
    setAvatarUrl(data.avatar_url || null);
    setExpiresAt(data.expires_at || null);
    setUniqueId(data.unique_id ?? null);
    setEarlyAccess(data.early_access ?? true);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setRole(null);
    setFrozen(false);
    setDisplayName(null);
    setAvatarUrl(null);
    setExpiresAt(null);
    setUniqueId(null);
    setEarlyAccess(true);
  }, []);

  // Check session on mount
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          applyMeData(data);
        } else {
          clearAuth();
        }
      })
      .catch(() => clearAuth())
      .finally(() => setLoading(false));
  }, [applyMeData, clearAuth]);

  const signIn = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.message || "Erreur de connexion." };

      // Fetch full profile
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (meRes.ok) applyMeData(await meRes.json());
      return { error: null };
    } catch {
      return { error: "Erreur réseau." };
    }
  }, [applyMeData]);

  const signUp = useCallback(async (username: string, password: string, email?: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, email }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.message || "Erreur d'inscription." };

      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (meRes.ok) applyMeData(await meRes.json());
      return { error: null };
    } catch {
      return { error: "Erreur réseau." };
    }
  }, [applyMeData]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    clearAuth();
  }, [clearAuth]);

  const refreshRole = useCallback(async () => {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) applyMeData(await res.json());
  }, [applyMeData]);

  return (
    <AuthContext.Provider value={{
      user,
      session: user ? { user } : null,
      role,
      frozen,
      earlyAccess,
      loading,
      displayName,
      avatarUrl,
      expiresAt,
      uniqueId,
      signIn,
      signUp,
      signOut,
      refreshRole,
      // Legacy compat shims
      signInWithEmail: signIn,
      signUpWithEmail: (u, p) => signUp(u, p),
      signInWithDiscord: async () => {},
      getAccessToken: () => null,
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
