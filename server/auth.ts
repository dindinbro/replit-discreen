import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { webhookSessionLogin } from "./webhook";

declare module "express-session" {
  interface SessionData {
    authUserId: number;
    authUsername: string;
    authEmail: string | null;
  }
}

// Connection logging (IP, user agent) for the admin panel. Admin accounts
// are deliberately excluded — only regular user activity is tracked here.
async function logSuccessfulLogin(req: Request, user: { id: number; username: string; email: string | null; role: string; earlyAccess?: boolean }, provider: string) {
  if (user.role === "admin") return;
  try {
    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || req.socket?.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    const sub = await storage.getOrCreateSubscription(String(user.id));
    await storage.createLoginLog({
      userId: String(user.id),
      email: user.email || undefined,
      username: user.username,
      ip,
      userAgent,
      provider,
      tier: sub?.tier || "free",
      discordId: sub?.discordId || undefined,
    });

    // Meme logique de badges que la sidebar (client/src/components/Layout.tsx
    // ROLE_DISPLAY) pour que le webhook de connexion montre exactement ce que
    // l'utilisateur voit sur son propre compte.
    const badges: string[] = [];
    if (user.role === "free" && user.earlyAccess) badges.push("Early");
    if (user.role !== "admin" && user.role !== "free") {
      const ROLE_DISPLAY: Record<string, string> = { vip: "VIP", pro: "PRO", business: "Business", api: "API", wanted: "Wanted" };
      badges.push(ROLE_DISPLAY[user.role] || user.role);
    }

    webhookSessionLogin(
      { id: String(user.id), email: user.email || "inconnu", username: user.username, uniqueId: sub?.id, badges },
      ip,
      userAgent,
      sub?.discordId,
    );
  } catch (err) {
    console.error("[auth] login log error:", err);
  }
}

export function registerAuthRoutes(app: Express) {
  /* ── Register ─────────────────────────────────────────── */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, email } = req.body;

      if (!username || typeof username !== "string" || username.trim().length < 2 || username.trim().length > 30) {
        return res.status(400).json({ message: "Le nom d'utilisateur doit contenir entre 2 et 30 caractères." });
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères." });
      }

      const clean = username.trim();
      // Only letters, numbers, underscores, hyphens
      if (!/^[a-zA-Z0-9_\-]+$/.test(clean)) {
        return res.status(400).json({ message: "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, _ et -." });
      }

      const existing = await storage.getUserByUsername(clean);
      if (existing) {
        return res.status(409).json({ message: "Ce nom d'utilisateur est déjà pris." });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      // Private mode (enabled by default) requires admin approval before a new
      // account can access the site. When disabled, accounts are auto-approved.
      const privateModeVal = await storage.getSiteSetting("private_mode");
      const privateModeEnabled = privateModeVal !== "false";

      const user = await storage.createUser({
        username: clean,
        passwordHash,
        email: email?.trim() || null,
        role: "free",
        status: privateModeEnabled ? "pending" : "approved",
        // Only accounts that actually had to wait on admin approval are
        // "Early" — auto-approved signups (private mode off) don't qualify.
        earlyAccess: privateModeEnabled,
      });

      // Auto-login after register — account still needs admin approval
      // before it can actually use the site (see status gate on /api/search
      // and PendingApprovalGate on the client), unless private mode is off.
      (req.session as any).authUserId = user.id;
      (req.session as any).authUsername = user.username;
      (req.session as any).authEmail = user.email || null;
      logSuccessfulLogin(req, user, "register");

      return res.json({ id: user.id, username: user.username, role: user.role, status: user.status });
    } catch (err: any) {
      if (err?.code === "23505") {
        return res.status(409).json({ message: "Ce nom d'utilisateur est déjà pris." });
      }
      console.error("[auth/register] error:", err);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  });

  /* ── Login ────────────────────────────────────────────── */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Identifiant et mot de passe requis." });
      }

      const user = await storage.getUserByUsername(username.trim());
      if (!user || !user.passwordHash) {
        // Constant-time response
        await bcrypt.compare(password, "$2b$12$invalidhashfortimingprotection00000000000000");
        return res.status(401).json({ message: "Identifiant ou mot de passe incorrect." });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Identifiant ou mot de passe incorrect." });
      }

      (req.session as any).authUserId = user.id;
      (req.session as any).authUsername = user.username;
      (req.session as any).authEmail = user.email || null;
      logSuccessfulLogin(req, user, "local");

      return res.json({ id: user.id, username: user.username, role: user.role });
    } catch (err) {
      console.error("[auth/login] error:", err);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  });

  /* ── Logout ───────────────────────────────────────────── */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.clearCookie("discreen.sid");
      res.json({ ok: true });
    });
  });

  /* ── Bootstrap Admin (one-time, only when no admin exists) ── */
  app.post("/api/auth/bootstrap-admin", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== "string") {
        return res.status(400).json({ message: "username requis." });
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères." });
      }

      // Safety check: only works if no admin exists yet
      const { db } = await import("./db");
      const { users } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      const existingAdmins = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"));

      if (existingAdmins.length > 0) {
        return res.status(403).json({ message: "Un compte admin existe déjà. Cette route est désactivée." });
      }

      // Check if target user exists; create if not
      let user = await storage.getUserByUsername(username.trim());

      if (!user) {
        const passwordHash = await bcrypt.hash(password, 12);
        user = await storage.createUser({
          username: username.trim(),
          passwordHash,
          email: null,
          role: "admin",
        });
      } else {
        await storage.updateUser(user.id, { role: "admin" });
        user = (await storage.getUser(user.id))!;
      }

      return res.json({ ok: true, id: user.id, username: user.username, role: user.role });
    } catch (err) {
      console.error("[auth/bootstrap-admin] error:", err);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  });

  /* ── Profile update routes ───────────────────────────── */

  app.patch("/api/auth/profile/username", async (req: Request, res: Response) => {
    const userId = (req.session as any).authUserId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });
    const clean = (req.body.username ?? "").trim();
    if (!/^[a-z0-9_]{3,20}$/.test(clean))
      return res.status(400).json({ message: "3–20 caractères, minuscules, chiffres et _ uniquement." });
    try {
      const existing = await storage.getUserByUsername(clean);
      if (existing && existing.id !== userId)
        return res.status(409).json({ message: "Ce nom d'utilisateur est déjà pris." });
      await storage.updateUser(userId, { username: clean });
      (req.session as any).authUsername = clean;
      return res.json({ ok: true, username: clean });
    } catch (err: any) {
      if (err?.code === "23505") {
        return res.status(409).json({ message: "Ce nom d'utilisateur est déjà pris." });
      }
      return res.status(500).json({ message: "Erreur serveur." });
    }
  });

  app.patch("/api/auth/profile/password", async (req: Request, res: Response) => {
    const userId = (req.session as any).authUserId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Tous les champs sont requis." });
    if (newPassword.length < 8)
      return res.status(400).json({ message: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
    try {
      const user = await storage.getUser(userId);
      if (!user?.passwordHash) return res.status(400).json({ message: "Impossible de modifier le mot de passe." });
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Mot de passe actuel incorrect." });
      await storage.updateUser(userId, { passwordHash: await bcrypt.hash(newPassword, 12) });
      return res.json({ ok: true });
    } catch { return res.status(500).json({ message: "Erreur serveur." }); }
  });

  app.patch("/api/auth/profile/email", async (req: Request, res: Response) => {
    const userId = (req.session as any).authUserId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });
    const clean = (req.body.email ?? "").trim() || null;
    if (clean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))
      return res.status(400).json({ message: "Adresse email invalide." });
    try {
      await storage.updateUser(userId, { email: clean });
      (req.session as any).authEmail = clean;
      return res.json({ ok: true, email: clean });
    } catch { return res.status(500).json({ message: "Erreur serveur." }); }
  });

  /* ── Me (session check) ───────────────────────────────── */
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const userId = (req.session as any).authUserId;
    if (!userId) return res.status(401).json({ message: "Non authentifié" });

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "Utilisateur introuvable" });
      }

      const sub = await storage.getOrCreateSubscription(String(user.id));
      let effectiveRole = user.role || "free";
      if (effectiveRole !== "admin" && effectiveRole !== "wanted") {
        effectiveRole = (sub?.tier as string) || "free";
        if (sub && sub.tier !== "free" && !sub.frozen && sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
          effectiveRole = "free";
        }
      }

      return res.json({
        id: String(user.id),
        username: user.username,
        email: user.email || null,
        role: effectiveRole,
        status: user.status || "approved",
        early_access: user.earlyAccess ?? true,
        frozen: sub?.frozen ?? false,
        unique_id: sub?.id ?? null,
        display_name: user.username,
        avatar_url: user.avatarUrl || null,
        expires_at: sub?.expiresAt || null,
        discord_id: sub?.discordId || null,
        created_at: user.createdAt || null,
      });
    } catch (err) {
      console.error("[auth/me] error:", err);
      return res.status(500).json({ message: "Erreur serveur." });
    }
  });
}
