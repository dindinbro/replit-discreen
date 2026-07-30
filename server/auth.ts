import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    authUserId: number;
    authUsername: string;
    authEmail: string | null;
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

      const user = await storage.createUser({
        username: clean,
        passwordHash,
        email: email?.trim() || null,
        role: "free",
      });

      // Auto-login after register
      (req.session as any).authUserId = user.id;
      (req.session as any).authUsername = user.username;
      (req.session as any).authEmail = user.email || null;

      return res.json({ id: user.id, username: user.username, role: user.role });
    } catch (err) {
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

  /* ── Bootstrap admin (first admin only, one-time) ────── */
  app.post("/api/auth/bootstrap-admin", async (req: Request, res: Response) => {
    const userId = (req.session as any).authUserId;
    if (!userId) return res.status(401).json({ message: "Connectez-vous d'abord." });

    try {
      const { db } = await import("./db");
      const { users } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      // Block if any admin already exists
      const admins = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
      if (admins.length > 0) {
        return res.status(403).json({ message: "Un administrateur existe déjà. Utilisez le script CLI pour les promotions suivantes." });
      }

      await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
      return res.json({ ok: true, message: "Votre compte a été promu administrateur." });
    } catch (err) {
      console.error("[auth/bootstrap-admin] error:", err);
      return res.status(500).json({ message: "Erreur serveur." });
    }
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
      if (effectiveRole !== "admin") {
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
        frozen: sub?.frozen ?? false,
        unique_id: sub?.id ?? null,
        display_name: user.username,
        avatar_url: null,
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
