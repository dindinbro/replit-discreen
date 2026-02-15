import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { FilterLabels, insertCategorySchema, PLAN_LIMITS, type PlanTier, FivemFilterTypes } from "@shared/schema";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { searchAllIndexes, initSearchDatabases, filterResultsByCriteria, sortByRelevance } from "./searchSqlite";
import { registerChatRoutes } from "./replit_integrations/chat";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import multer from "multer";
import { exiftool } from "exiftool-vendored";
import {
  webhookSearch, webhookBreachSearch, webhookExternalProxySearch, webhookLeakosintSearch, webhookDaltonSearch, webhookApiSearch,
  webhookRoleChange, webhookFreeze, webhookInvoiceCreated, webhookPaymentCompleted,
  webhookKeyRedeemed, webhookKeyGenerated, webhookApiKeyCreated, webhookApiKeyRevoked,
  webhookPhoneLookup, webhookGeoIP, webhookVouchDeleted,
  webhookCategoryCreated, webhookCategoryUpdated, webhookCategoryDeleted,
  webhookBlacklistRequest, webhookInfoRequest, webhookSubscriptionExpired, webhookAbnormalActivity,
  webhookBotKeyRedeemed, webhookSuspiciousSession, webhookSessionLogin, webhookBlockedIpAttempt,
} from "./webhook";
import { sendFreezeAlert, checkDiscordMemberStatus, syncCustomerRole } from "./discord-bot";

const ORDER_TOKEN_SECRET = process.env.NOWPAYMENTS_API_KEY || crypto.randomBytes(32).toString("hex");

function sortObject(obj: any): any {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);
  return Object.keys(obj).sort().reduce((result: any, key: string) => {
    result[key] = sortObject(obj[key]);
    return result;
  }, {});
}

const abnormalAlertsSent = new Set<string>();
function resetAbnormalAlerts() {
  abnormalAlertsSent.clear();
}
setInterval(resetAbnormalAlerts, 24 * 60 * 60 * 1000);

const ABNORMAL_THRESHOLD_RATIO = 0.8;
const ABNORMAL_UNLIMITED_THRESHOLD = 500;

async function buildUserInfo(req: Request): Promise<{ id: string; email: string; username?: string; uniqueId?: number; discordId?: string | null; bypassed?: boolean }> {
  const user = (req as any).user;
  const userId = user?.id || "";
  const email = user?.email || "inconnu";
  const username = user?.user_metadata?.username || user?.user_metadata?.display_name || user?.user_metadata?.full_name || email.split("@")[0] || undefined;
  let uniqueId: number | undefined;
  let discordId: string | null = null;
  let bypassed = false;
  try {
    const sub = await storage.getSubscription(userId);
    if (sub) {
      uniqueId = sub.id;
      discordId = sub.discordId || null;
      bypassed = await isUserBypassed(sub.id);
    }
  } catch {}
  return { id: userId, email, username, uniqueId, discordId, bypassed };
}

function signOrderId(orderId: string): string {
  return crypto.createHmac("sha256", ORDER_TOKEN_SECRET).update(orderId).digest("hex");
}

function verifyOrderToken(orderId: string, token: string): boolean {
  const expected = signOrderId(orderId);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!supabaseAdmin) {
    return res.status(500).json({ message: "Supabase not configured" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Non authentifié" });
  }

  const token = authHeader.split(" ")[1];
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }

  (req as any).user = data.user;
  next();
}

async function getEffectiveRole(userId: string): Promise<string> {
  if (!supabaseAdmin) return "free";

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!error && profile?.role === "admin") {
    return "admin";
  }

  const sub = await storage.getOrCreateSubscription(userId);
  if (sub && sub.tier !== "free" && !sub.frozen && sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
    return "free";
  }
  return (sub?.tier as string) || "free";
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Non authentifié" });
  }

  const effectiveRole = await getEffectiveRole(userId);
  if (effectiveRole !== "admin") {
    return res.status(403).json({ message: "Accès interdit — admin uniquement" });
  }

  (req as any).userRole = effectiveRole;
  next();
}

function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const effectiveRole = await getEffectiveRole(userId);
    (req as any).userRole = effectiveRole;

    if (effectiveRole === "admin" || roles.includes(effectiveRole)) {
      return next();
    }

    return res.status(403).json({
      message: `Accès interdit — rôle requis: ${roles.join(", ")}`,
    });
  };
}

let bypassCache: { ids: Set<number>; loadedAt: number } = { ids: new Set(), loadedAt: 0 };
const BYPASS_CACHE_TTL = 60_000;

async function isUserBypassed(uniqueId: number): Promise<boolean> {
  if (Date.now() - bypassCache.loadedAt > BYPASS_CACHE_TTL) {
    try {
      const raw = await storage.getSiteSetting("bypass_whitelist");
      const list: number[] = raw ? JSON.parse(raw) : [];
      bypassCache = { ids: new Set(list), loadedAt: Date.now() };
    } catch {
      return false;
    }
  }
  return bypassCache.ids.has(uniqueId);
}

const onlineVisitors = new Map<string, number>();
const VISITOR_TIMEOUT = 90_000;

function cleanupVisitors() {
  const now = Date.now();
  for (const [id, lastSeen] of Array.from(onlineVisitors.entries())) {
    if (now - lastSeen > VISITOR_TIMEOUT) onlineVisitors.delete(id);
  }
}

setInterval(cleanupVisitors, 30_000);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await initSearchDatabases();

  const blockedIpCache = new Set<string>();
  async function loadBlockedIps() {
    try {
      const ips = await storage.getBlockedIps();
      blockedIpCache.clear();
      for (const entry of ips) blockedIpCache.add(entry.ipAddress);
    } catch (err) {
      console.error("[ip-blacklist] Failed to load blocked IPs:", err);
    }
  }
  await loadBlockedIps();

  function normalizeIp(raw: string): string {
    let ip = raw.trim();
    if (ip.startsWith("::ffff:")) ip = ip.slice(7);
    return ip;
  }

  const blockedIpAlertCooldown = new Map<string, number>();
  const BLOCKED_IP_ALERT_INTERVAL = 5 * 60 * 1000;

  app.use((req, res, next) => {
    const rawIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || "";
    const clientIp = normalizeIp(rawIp);
    if (blockedIpCache.has(clientIp)) {
      const now = Date.now();
      const lastAlert = blockedIpAlertCooldown.get(clientIp) || 0;
      if (now - lastAlert > BLOCKED_IP_ALERT_INTERVAL) {
        blockedIpAlertCooldown.set(clientIp, now);
        webhookBlockedIpAttempt(clientIp, req.path, req.headers["user-agent"] || "unknown");
      }
      return res.status(403).json({ message: "Acces refuse." });
    }
    next();
  });

  app.post("/api/heartbeat", async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const userId = (req as any).user?.id;
    const key = userId || `anon_${ip}`;
    onlineVisitors.set(key, Date.now());

    const sessionToken = req.headers["x-session-token"] as string | undefined;
    const authHeader = req.headers.authorization;
    if (sessionToken && authHeader?.startsWith("Bearer ") && supabaseAdmin) {
      try {
        const token = authHeader.split(" ")[1];
        const { data } = await supabaseAdmin.auth.getUser(token);
        if (data?.user) {
          const isValid = await storage.validateSession(data.user.id, sessionToken);
          if (isValid) await storage.touchSession(sessionToken);
        }
      } catch {}
    }

    res.json({ online: onlineVisitors.size });
  });

  app.get("/api/online", (_req, res) => {
    cleanupVisitors();
    res.json({ online: onlineVisitors.size });
  });

  // GET /api/users — public list of admin users
  app.get("/api/users", async (_req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Supabase not configured" });
      }

      const { data: adminProfiles, error } = await supabaseAdmin
        .from("profiles")
        .select("id, role, created_at")
        .eq("role", "admin");

      if (error || !adminProfiles) {
        return res.json({ users: [] });
      }

      const adminUsers = await Promise.all(
        adminProfiles.map(async (profile: any) => {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
          const meta = authUser?.user?.user_metadata || {};
          return {
            id: profile.id,
            role: "admin",
            display_name: meta.display_name || meta.full_name || null,
            avatar_url: meta.avatar_url || null,
            created_at: profile.created_at || null,
          };
        })
      );

      res.json({ users: adminUsers });
    } catch (err) {
      console.error("GET /api/users error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/me — returns effective role combining profile + subscription
  app.get("/api/me", requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Supabase not configured" });
      }

      const user = (req as any).user;
      const { data: profile, error } = await supabaseAdmin
        .from("profiles")
        .select("role, created_at")
        .eq("id", user.id)
        .single();

      const profileRole = (!error && profile) ? profile.role : "user";

      const sub = await storage.getOrCreateSubscription(user.id);

      const meta = user.user_metadata || {};
      const displayName = meta.display_name || meta.full_name || null;
      const avatarUrl = meta.avatar_url || null;

      let isSupporter = false;
      if (sub?.discordId) {
        const discordStatus = await checkDiscordMemberStatus(sub.discordId);
        isSupporter = discordStatus.inGuild && discordStatus.isSupporter;
      }

      if (profileRole === "admin") {
        return res.json({
          id: user.id,
          email: user.email,
          role: "admin",
          frozen: sub?.frozen ?? false,
          created_at: profile?.created_at || user.created_at,
          unique_id: sub.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          expires_at: sub?.expiresAt || null,
          discord_id: sub?.discordId || null,
          is_supporter: isSupporter,
        });
      }

      let effectiveRole = (sub?.tier as PlanTier) || "free";
      if (sub && sub.tier !== "free" && !sub.frozen && sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
        effectiveRole = "free";
      }

      res.json({
        id: user.id,
        email: user.email,
        role: effectiveRole,
        frozen: sub?.frozen ?? false,
        created_at: profile?.created_at || user.created_at,
        unique_id: sub.id,
        display_name: displayName,
        avatar_url: avatarUrl,
        expires_at: sub?.expiresAt || null,
        discord_id: sub?.discordId || null,
        is_supporter: isSupporter,
      });
    } catch (err) {
      console.error("GET /api/me error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const MAX_SESSIONS = 2;
  const sessionSharingAlertsSent = new Set<string>();

  setInterval(async () => {
    try {
      const cleaned = await storage.cleanupStaleSessions(30);
      if (cleaned > 0) console.log(`[sessions] Cleaned up ${cleaned} stale sessions`);
    } catch (err) {
      console.error("[sessions] Cleanup error:", err);
    }
  }, 5 * 60 * 1000);

  app.post("/api/session/register", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { sessionToken } = req.body;
      if (!sessionToken || typeof sessionToken !== "string") {
        return res.status(400).json({ message: "Session token required" });
      }

      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      const existing = await storage.validateSession(user.id, sessionToken);
      if (existing) {
        await storage.touchSession(sessionToken);
        return res.json({ ok: true, status: "existing" });
      }

      const currentSessions = await storage.getActiveSessions(user.id);
      if (currentSessions.length >= MAX_SESSIONS) {
        await storage.removeOldestSession(user.id);
      }

      await storage.createSession(user.id, sessionToken, ip, userAgent);

      try {
        const sub = await storage.getOrCreateSubscription(user.id);
        const meta = user.user_metadata || {};
        const isBypassed = sub.id ? await isUserBypassed(sub.id) : false;
        if (!isBypassed) {
          webhookSessionLogin(
            { id: user.id, email: user.email || "", username: meta.display_name || meta.full_name || user.email?.split("@")[0], uniqueId: sub.id },
            ip,
            userAgent,
            sub.discordId,
          );
        }
      } catch (webhookErr) {
        console.error("Session login webhook error:", webhookErr);
      }

      const sessions = await storage.getActiveSessions(user.id);
      const ips = sessions.map(s => s.ipAddress).filter(Boolean) as string[];
      const uniqueIPs = [...new Set(ips)];
      if (uniqueIPs.length > 1) {
        const alertKey = `${user.id}_session_sharing`;
        if (!sessionSharingAlertsSent.has(alertKey)) {
          sessionSharingAlertsSent.add(alertKey);
          const sub = await storage.getOrCreateSubscription(user.id);
          const meta = user.user_metadata || {};
          const isBypassed = sub.id ? await isUserBypassed(sub.id) : false;
          if (!isBypassed) {
            webhookSuspiciousSession(
              { id: user.id, email: user.email || "", username: meta.display_name || meta.full_name || user.email?.split("@")[0], uniqueId: sub.id },
              ips,
              sessions.length,
            );
          }
          setTimeout(() => sessionSharingAlertsSent.delete(alertKey), 24 * 60 * 60 * 1000);
        }
      }

      res.json({ ok: true, status: "created", activeSessions: sessions.length });
    } catch (err) {
      console.error("POST /api/session/register error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/session", requireAuth, async (req, res) => {
    try {
      const { sessionToken } = req.body;
      if (sessionToken) {
        await storage.removeSession(sessionToken);
      } else {
        const user = (req as any).user;
        await storage.removeAllSessions(user.id);
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/session error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/session/active", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const sessions = await storage.getActiveSessions(user.id);
      res.json({
        count: sessions.length,
        max: MAX_SESSIONS,
        sessions: sessions.map(s => ({
          id: s.id,
          userAgent: s.userAgent,
          lastActiveAt: s.lastActiveAt,
          createdAt: s.createdAt,
        })),
      });
    } catch (err) {
      console.error("GET /api/session/active error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/profile/display-name — update display name (admin only)
  app.patch("/api/profile/display-name", requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Supabase not configured" });
      }
      const user = (req as any).user;
      const role = await getEffectiveRole(user.id);
      if (role !== "admin") {
        return res.status(403).json({ message: "Seuls les administrateurs peuvent modifier le pseudo." });
      }
      const { display_name } = req.body;
      if (!display_name || typeof display_name !== "string" || display_name.trim().length < 2 || display_name.trim().length > 30) {
        return res.status(400).json({ message: "Le pseudo doit contenir entre 2 et 30 caracteres." });
      }
      const trimmedName = display_name.trim();
      let page = 1;
      let taken = false;
      while (!taken) {
        const { data: pageData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (!pageData?.users || pageData.users.length === 0) break;
        taken = pageData.users.some(
          (u) => u.id !== user.id && u.user_metadata?.display_name?.toLowerCase() === trimmedName.toLowerCase()
        );
        if (pageData.users.length < 1000) break;
        page++;
      }
      if (taken) {
        return res.status(409).json({ message: "Ce pseudo est deja utilise par un autre utilisateur." });
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, display_name: trimmedName },
      });
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      res.json({ success: true, display_name: trimmedName });
    } catch (err) {
      console.error("PATCH /api/profile/display-name error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/profile/avatar — update avatar URL
  app.patch("/api/profile/avatar", requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Supabase not configured" });
      }
      const user = (req as any).user;
      const { avatar_url } = req.body;
      if (avatar_url && typeof avatar_url === "string" && avatar_url.length > 500) {
        return res.status(400).json({ message: "URL trop longue." });
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, avatar_url: avatar_url || null },
      });
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      res.json({ success: true, avatar_url: avatar_url || null });
    } catch (err) {
      console.error("PATCH /api/profile/avatar error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/profile/discord/generate-code", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const code = await storage.createDiscordLinkCode(user.id);
      res.json({ success: true, code, expiresIn: 600 });
    } catch (err) {
      console.error("POST /api/profile/discord/generate-code error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/profile/discord", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      await storage.clearDiscordId(user.id);
      res.json({ success: true, discord_id: null });
    } catch (err) {
      console.error("DELETE /api/profile/discord error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const pendingOAuthStates = new Map<string, { createdAt: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [state, data] of Array.from(pendingOAuthStates.entries())) {
      if (now - data.createdAt > 10 * 60 * 1000) pendingOAuthStates.delete(state);
    }
  }, 60 * 1000);

  function getTaskBotRedirectUri(req: Request): string {
    if (process.env.TASK_BOT_REDIRECT_URI) return process.env.TASK_BOT_REDIRECT_URI;
    const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
    return `${baseUrl}/api/discord-task/callback`;
  }

  app.get("/api/discord-task/authorize", (req, res) => {
    const clientId = process.env.TASK_BOT_CLIENT_ID;
    if (!clientId) {
      res.status(503).json({ message: "Task bot not configured" });
      return;
    }
    const state = crypto.randomBytes(32).toString("hex");
    pendingOAuthStates.set(state, { createdAt: Date.now() });
    const redirectUri = getTaskBotRedirectUri(req);
    const scope = "identify guilds.join";
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
    res.redirect(url);
  });

  app.get("/api/discord-task/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code || typeof code !== "string") {
      res.status(400).send("Code manquant.");
      return;
    }
    if (!state || typeof state !== "string" || !pendingOAuthStates.has(state)) {
      res.status(403).send("Etat invalide ou expire.");
      return;
    }
    pendingOAuthStates.delete(state);

    const clientId = process.env.TASK_BOT_CLIENT_ID;
    const clientSecret = process.env.TASK_BOT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      res.status(503).send("Task bot not configured.");
      return;
    }

    const redirectUri = getTaskBotRedirectUri(req);

    try {
      const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Discord OAuth token exchange failed:", errText);
        res.status(400).send("Erreur d'authentification Discord.");
        return;
      }

      const tokenData: any = await tokenRes.json();

      const userRes = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        res.status(400).send("Impossible de recuperer les informations Discord.");
        return;
      }

      const userData: any = await userRes.json();
      const discordId = userData.id;
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      const { discordOAuthTokens } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");

      const existing = await db.select().from(discordOAuthTokens).where(eq(discordOAuthTokens.discordId, discordId));
      if (existing.length > 0) {
        await db.update(discordOAuthTokens)
          .set({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            expiresAt,
            scope: tokenData.scope,
            updatedAt: new Date(),
          })
          .where(eq(discordOAuthTokens.discordId, discordId));
      } else {
        await db.insert(discordOAuthTokens).values({
          discordId,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresAt,
          scope: tokenData.scope,
        });
      }

      res.send(`
        <!DOCTYPE html>
        <html><head><title>Autorisation reussie</title>
        <style>body{background:#0a0a0a;color:#10b981;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}
        .box{text-align:center;padding:2rem;border:1px solid #10b981;border-radius:8px;}
        h1{font-size:1.5rem;}p{color:#9ca3af;}</style></head>
        <body><div class="box"><h1>Autorisation reussie</h1><p>Votre compte Discord (${userData.username}) a ete autorise.<br>Vous pouvez fermer cette page.</p></div></body></html>
      `);
    } catch (err) {
      console.error("Discord Task OAuth callback error:", err);
      res.status(500).send("Erreur interne.");
    }
  });

  // GET /api/profile/2fa/status — check if 2FA is enabled
  app.get("/api/profile/2fa/status", requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Supabase not configured" });
      }
      const user = (req as any).user;
      const { data, error } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: user.id });
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      const verifiedTotp = data?.factors?.find((f: any) => f.factor_type === "totp" && f.status === "verified");
      res.json({ enabled: !!verifiedTotp });
    } catch (err) {
      console.error("GET /api/profile/2fa/status error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DELETE /api/profile/2fa — disable 2FA (unenroll all TOTP factors)
  app.delete("/api/profile/2fa", requireAuth, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Supabase not configured" });
      }
      const user = (req as any).user;
      const { data, error } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: user.id });
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      const totpFactors = data?.factors?.filter((f: any) => f.factor_type === "totp") || [];
      for (const factor of totpFactors) {
        await supabaseAdmin.auth.admin.mfa.deleteFactor({ userId: user.id, id: factor.id });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/profile/2fa error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/site-status", async (_req, res) => {
    try {
      const val = await storage.getSiteSetting("maintenance_mode");
      res.json({ maintenance: val === "true" });
    } catch {
      res.json({ maintenance: false });
    }
  });

  app.get("/api/admin/maintenance", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const val = await storage.getSiteSetting("maintenance_mode");
      res.json({ enabled: val === "true" });
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/admin/maintenance", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { enabled } = req.body;
      await storage.setSiteSetting("maintenance_mode", enabled ? "true" : "false");
      console.log(`[admin] Maintenance mode ${enabled ? "ENABLED" : "DISABLED"} by admin`);
      res.json({ enabled: !!enabled });
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // GET /api/admin/users — returns effective role for each user
  app.get("/api/admin/users", requireAuth, requireAdmin, async (_req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Supabase not configured" });
      }

      const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

      if (usersError) {
        console.error("listUsers error:", usersError);
        return res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs" });
      }

      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, role, created_at");

      if (profilesError) {
        console.error("profiles error:", profilesError);
        return res.status(500).json({ message: "Erreur lors de la récupération des profils" });
      }

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const result = await Promise.all(users.map(async (u) => {
        const profile = profileMap.get(u.id);
        const profileRole = profile?.role || "user";

        let effectiveRole: string;
        const sub = await storage.getOrCreateSubscription(u.id);
        if (profileRole === "admin") {
          effectiveRole = "admin";
        } else {
          effectiveRole = (sub?.tier as string) || "free";
        }

        return {
          id: u.id,
          email: u.email || "",
          role: effectiveRole,
          frozen: sub?.frozen ?? false,
          created_at: profile?.created_at || u.created_at,
          unique_id: sub.id,
        };
      }));

      res.json(result);
    } catch (err) {
      console.error("GET /api/admin/users error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/admin/set-role — handles all roles: free/vip/pro/business/api/admin
  app.post("/api/admin/set-role", requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Supabase not configured" });
      }

      const schema = z.object({
        userId: z.string().uuid(),
        role: z.enum(["free", "vip", "pro", "business", "api", "admin"]),
      });

      const parsed = schema.parse(req.body);

      if (parsed.role === "admin") {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", parsed.userId);

        if (error) {
          console.error("set-role error:", error);
          return res.status(500).json({ message: "Erreur lors de la mise à jour du rôle" });
        }
      } else {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ role: "user" })
          .eq("id", parsed.userId);

        if (profileError) {
          console.error("set-role profile error:", profileError);
          return res.status(500).json({ message: "Erreur lors de la mise à jour du profil" });
        }

        await storage.upsertSubscription(parsed.userId, parsed.role as PlanTier);
      }

      const adminEmail = (req as any).user?.email || "admin";

      let targetEmail = parsed.userId;
      let targetUsername = "N/A";
      let targetUniqueId: number | null = null;
      try {
        if (supabaseAdmin) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("email, username")
            .eq("id", parsed.userId)
            .single();
          if (profile) {
            targetEmail = profile.email || parsed.userId;
            targetUsername = profile.username || "N/A";
          }
        }
        const sub = await storage.getSubscription(parsed.userId);
        if (sub) {
          targetUniqueId = (sub as any).uniqueId ?? null;
        }
      } catch (e) {
        console.error("webhookRoleChange: failed to fetch target info", e);
      }

      webhookRoleChange(adminEmail, { email: targetEmail, username: targetUsername, uniqueId: targetUniqueId, userId: parsed.userId }, parsed.role);

      res.json({ success: true, userId: parsed.userId, role: parsed.role });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: err.errors });
      }
      console.error("POST /api/admin/set-role error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/admin/freeze - freeze/unfreeze a user account
  app.post("/api/admin/freeze", requireAuth, requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        userId: z.string().uuid(),
        frozen: z.boolean(),
      });
      const parsed = schema.parse(req.body);
      await storage.setFrozen(parsed.userId, parsed.frozen);
      const adminEmail = (req as any).user?.email || "admin";

      let targetEmail = parsed.userId;
      let targetUsername = parsed.userId.slice(0, 8);
      let targetUniqueId: number | null = null;
      if (supabaseAdmin) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(parsed.userId);
        if (authUser?.user) {
          targetEmail = authUser.user.email || parsed.userId;
          targetUsername = authUser.user.user_metadata?.username || targetEmail.split("@")[0];
        }
      }
      const targetSub = await storage.getSubscription(parsed.userId);
      if (targetSub) {
        targetUniqueId = targetSub.id;
      }

      const targetTier = targetSub?.tier || "free";
      webhookFreeze(adminEmail, targetEmail, targetUsername, targetUniqueId, parsed.userId, parsed.frozen, targetTier);
      res.json({ success: true, userId: parsed.userId, frozen: parsed.frozen });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Donnees invalides", errors: err.errors });
      }
      console.error("POST /api/admin/freeze error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/users/:userId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const targetUserId = req.params.userId as string;
      if (!targetUserId) return res.status(400).json({ message: "ID utilisateur requis" });

      const adminId = (req as any).user.id;
      if (targetUserId === adminId) {
        return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte" });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Supabase admin non configure" });
      }

      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (authError) {
        console.error("Supabase deleteUser error:", authError);
        return res.status(500).json({ message: "Erreur lors de la suppression du compte Supabase" });
      }

      try {
        await storage.deleteUserData(targetUserId);
      } catch (cleanupErr) {
        console.error("Cleanup error after user deletion:", cleanupErr);
      }

      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/admin/users/:userId error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/create-service-invoice", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const bodySchema = z.object({
        type: z.enum(["blacklist", "info"]),
        formData: z.record(z.any()),
      });
      const parsed = bodySchema.parse(req.body);

      const apiKey = process.env.NOWPAYMENTS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Payment service not configured" });
      }

      const orderId = `service_${parsed.type}_${Date.now()}`;
      const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
      const orderToken = signOrderId(orderId);
      const successUrl = `${baseUrl}/payment-success?order=${orderId}&token=${orderToken}&service=${parsed.type}`;
      const cancelUrl = `${baseUrl}/pricing`;
      const ipnUrl = `${baseUrl}/api/nowpayments-ipn`;

      await storage.createPendingServiceRequest(orderId, parsed.type, userId, JSON.stringify(parsed.formData));

      const label = parsed.type === "blacklist" ? "Demande de Blacklist" : "Demande d'Information";

      const response = await fetch("https://api.nowpayments.io/v1/invoice", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_amount: 50,
          price_currency: "eur",
          order_id: orderId,
          order_description: label,
          ipn_callback_url: ipnUrl,
          success_url: successUrl,
          cancel_url: cancelUrl,
        }),
      });

      const data = await response.json();

      if (!data.invoice_url) {
        console.error("NOWPayments error:", data);
        return res.status(502).json({ message: "Failed to create invoice" });
      }

      res.json({ invoice_url: data.invoice_url, orderId });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Donnees invalides", errors: err.errors });
      }
      console.error("POST /api/create-service-invoice error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/blacklist-request and /api/info-request are no longer directly accessible.
  // Requests are created exclusively by the NOWPayments IPN callback after successful payment.
  // These endpoints require auth and return 403 to prevent unpaid submissions.
  app.post("/api/blacklist-request", requireAuth, (_req, res) => {
    res.status(403).json({ message: "Les demandes de blacklist necessitent un paiement. Utilisez le formulaire prevu a cet effet." });
  });

  app.post("/api/info-request", requireAuth, (_req, res) => {
    res.status(403).json({ message: "Les demandes d'information necessitent un paiement. Utilisez le formulaire prevu a cet effet." });
  });

  // GET /api/admin/blacklist-requests - list all blacklist requests (admin only)
  app.get("/api/admin/blacklist-requests", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const requests = await storage.getBlacklistRequests();
      res.json(requests);
    } catch (err) {
      console.error("GET /api/admin/blacklist-requests error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/admin/blacklist-requests/:id - update request status (admin only)
  app.patch("/api/admin/blacklist-requests/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const schema = z.object({
        status: z.enum(["pending", "approved", "rejected"]),
        adminNotes: z.string().optional(),
      });
      const parsed = schema.parse(req.body);
      const updated = await storage.updateBlacklistRequestStatus(id, parsed.status, parsed.adminNotes);
      if (!updated) return res.status(404).json({ message: "Demande non trouvee" });

      if (parsed.status === "approved") {
        await storage.createBlacklistEntry({
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
          phone: updated.phone,
          address: updated.address,
          reason: updated.reason,
          sourceRequestId: updated.id,
          addedBy: (req as any).user?.email || "admin",
        });
      }

      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/admin/blacklist-requests/:id error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/admin/blacklist - list all blacklist entries (admin only)
  app.get("/api/admin/blacklist", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const entries = await storage.getBlacklistEntries();
      res.json(entries);
    } catch (err) {
      console.error("GET /api/admin/blacklist error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const blacklistEntrySchema = z.object({
    civilite: z.string().optional().nullable(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    pseudo: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    ville: z.string().optional().nullable(),
    codePostal: z.string().optional().nullable(),
    dateNaissance: z.string().optional().nullable(),
    discord: z.string().optional().nullable(),
    discordId: z.string().optional().nullable(),
    password: z.string().optional().nullable(),
    iban: z.string().optional().nullable(),
    ip: z.string().optional().nullable(),
    emails: z.array(z.string()).optional().nullable(),
    phones: z.array(z.string()).optional().nullable(),
    ips: z.array(z.string()).optional().nullable(),
    discordIds: z.array(z.string()).optional().nullable(),
    addresses: z.array(z.string()).optional().nullable(),
    reason: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  });

  // POST /api/admin/blacklist - create a blacklist entry directly (admin only)
  app.post("/api/admin/blacklist", requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = blacklistEntrySchema.parse(req.body);
      const entry = await storage.createBlacklistEntry({
        ...parsed,
        addedBy: (req as any).user?.email || "admin",
      });
      res.status(201).json(entry);
    } catch (err) {
      console.error("POST /api/admin/blacklist error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/admin/blacklist/:id - update a blacklist entry (admin only)
  app.patch("/api/admin/blacklist/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const parsed = blacklistEntrySchema.parse(req.body);
      const updated = await storage.updateBlacklistEntry(id, parsed);
      if (!updated) return res.status(404).json({ message: "Entree non trouvee" });
      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/admin/blacklist/:id error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DELETE /api/admin/blacklist/:id - delete a blacklist entry (admin only)
  app.delete("/api/admin/blacklist/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deleteBlacklistEntry(id);
      if (!deleted) return res.status(404).json({ message: "Entree non trouvee" });
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/admin/blacklist/:id error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/blacklist/check - check if search values match any blacklist entry (auth required)
  app.post("/api/blacklist/check", requireAuth, async (req, res) => {
    try {
      const schema = z.object({ values: z.array(z.string()) });
      const { values } = schema.parse(req.body);
      const filtered = values.filter(v => v && v.trim().length >= 3);
      if (filtered.length === 0) return res.json({ blacklisted: false });
      const matches = await storage.checkBlacklist(filtered);
      res.json({ blacklisted: matches.length > 0 });
    } catch (err) {
      console.error("POST /api/blacklist/check error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/blocked-ips", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const ips = await storage.getBlockedIps();
      res.json(ips);
    } catch (err) {
      console.error("GET /api/admin/blocked-ips error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/blocked-ips", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { ipAddress, reason } = req.body;
      if (!ipAddress || typeof ipAddress !== "string") {
        return res.status(400).json({ message: "IP address required" });
      }
      const ipTrimmed = normalizeIp(ipAddress);
      const adminEmail = (req as any).user?.email || "admin";
      console.log("[ip-blacklist] Blocking IP:", ipTrimmed, "reason:", reason, "by:", adminEmail);
      const entry = await storage.blockIp(ipTrimmed, reason || "", adminEmail);
      blockedIpCache.add(ipTrimmed);
      console.log("[ip-blacklist] IP blocked successfully:", ipTrimmed);
      res.json(entry);
    } catch (err: any) {
      console.error("POST /api/admin/blocked-ips error:", err?.message || err);
      console.error("POST /api/admin/blocked-ips stack:", err?.stack);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/blocked-ips/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      const ips = await storage.getBlockedIps();
      const entry = ips.find(e => e.id === id);
      if (entry) blockedIpCache.delete(entry.ipAddress);
      await storage.unblockIp(id);
      res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/admin/blocked-ips error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/admin/info-requests - list all info requests (admin only)
  app.get("/api/admin/info-requests", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const requests = await storage.getInfoRequests();
      res.json(requests);
    } catch (err) {
      console.error("GET /api/admin/info-requests error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/admin/info-requests/:id - update info request status (admin only)
  app.patch("/api/admin/info-requests/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const schema = z.object({
        status: z.enum(["pending", "approved", "rejected", "completed"]),
        adminNotes: z.string().optional(),
      });
      const parsed = schema.parse(req.body);
      const updated = await storage.updateInfoRequestStatus(id, parsed.status, parsed.adminNotes);
      if (!updated) return res.status(404).json({ message: "Demande non trouvee" });
      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/admin/info-requests/:id error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/search-quota - get current search usage/limits
  app.get("/api/search-quota", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const effectiveRole = await getEffectiveRole(userId);
      const isAdmin = effectiveRole === "admin";
      const quota = await storage.checkSearchAllowed(userId, isAdmin);
      res.json(quota);
    } catch (err) {
      console.error("GET /api/search-quota error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/leakosint-quota - get current LeakOSINT usage/limits
  app.get("/api/leakosint-quota", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const effectiveRole = await getEffectiveRole(userId);
      const isAdmin = effectiveRole === "admin";
      const sub = await storage.getSubscription(userId);
      const tier: PlanTier = isAdmin ? "api" : ((sub?.tier as PlanTier) || "free");
      const planInfo = PLAN_LIMITS[tier] || PLAN_LIMITS.free;
      const today = new Date().toISOString().split("T")[0];
      const used = await storage.getLeakosintDailyUsage(userId, today);
      res.json({
        used,
        limit: isAdmin ? -1 : planInfo.dailyLeakosintSearches,
        tier,
      });
    } catch (err) {
      console.error("GET /api/leakosint-quota error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const CRITERIA_TO_EXTERNAL_FIELD: Record<string, string> = {
    email: "email",
    lastName: "nom",
    firstName: "prenom",
    phone: "telephone",
    address: "adresse",
  };

  const FIELD_ALIASES: Record<string, string> = {
    qualite: "civilite",
    courriel: "email",
    voie: "adresse",
    commune: "ville",
    nom_adresse_postale: "nom_complet",
    cplt_adresse: "complement_adresse",
    cplt_commune: "complement_ville",
  };

  async function callExternalSearchApi(
    criteria: Array<{ type: string; value: string }>
  ): Promise<Record<string, unknown>[]> {
    const proxySecret = process.env.EXTERNAL_PROXY_SECRET;
    if (!proxySecret) return [];

    const params = new URLSearchParams();

    const unmappedValues: string[] = [];
    const mappedFields = new Map<string, string[]>();

    for (const c of criteria) {
      const externalField = CRITERIA_TO_EXTERNAL_FIELD[c.type];
      if (externalField) {
        const existing = mappedFields.get(externalField) || [];
        existing.push(c.value);
        mappedFields.set(externalField, existing);
      } else {
        unmappedValues.push(c.value);
      }
    }

    Array.from(mappedFields.entries()).forEach(([field, values]) => {
      params.set(field, values.join(" "));
    });

    const qParts = [...unmappedValues];
    if (qParts.length === 0 && mappedFields.size > 0) {
      const firstValues = Array.from(mappedFields.values())[0];
      if (firstValues) qParts.push(firstValues[0]);
    }
    if (qParts.length > 0) {
      params.set("q", qParts.join(" "));
    } else if (criteria.length > 0) {
      params.set("q", criteria[0].value);
    }

    params.set("operator", criteria.length > 1 ? "AND" : "AUTO");

    let response: globalThis.Response;
    try {
      const url = `http://81.17.101.243:8000/api/search?${params.toString()}`;
      console.log(`[external-search] GET ${url}`);
      const headers: Record<string, string> = { "X-Proxy-Secret": proxySecret };
      const apiKey = process.env.EXTERNAL_API_KEY;
      const apiSecret = process.env.EXTERNAL_API_SECRET;
      if (apiKey) headers["X-API-Key"] = apiKey;
      if (apiSecret) headers["X-API-Secret"] = apiSecret;
      response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(30000),
      });
    } catch (fetchErr) {
      console.error("[external-search] Fetch error:", fetchErr);
      return [];
    }

    if (response.status === 204) {
      console.log("[external-search] 204 — access blocked or secret not recognized by Flask");
      return [];
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`[external-search] Error ${response.status}:`, errText.slice(0, 300));
      return [];
    }

    const bodyText = await response.text();
    if (!bodyText || !bodyText.trim()) {
      console.log("[external-search] Empty body — no results");
      return [];
    }

    let data: any;
    try {
      data = JSON.parse(bodyText);
    } catch {
      console.error("[external-search] Cannot parse JSON. Body preview:", bodyText.slice(0, 500));
      return [];
    }

    console.log("[external-search] Parsed OK. Keys:", Object.keys(data), "Type:", typeof data);

    const flatResults: Record<string, unknown>[] = [];
    const results = data.results || data;

    const META_KEYS = new Set(["_source", "source", "_raw"]);
    function hasUsefulData(row: Record<string, unknown>): boolean {
      return Object.keys(row).some(k => !META_KEYS.has(k) && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "");
    }

    function isFivemData(flat: Record<string, string>): boolean {
      const allText = Object.keys(flat).concat(Object.values(flat)).join(" ");
      return /license|steam|fivem|check-host\.net|steamcommunity/i.test(allText);
    }

    function parseFivemData(flat: Record<string, string>): Record<string, string> {
      const reconstructed = Object.entries(flat)
        .map(([k, v]) => `${k}:${v}`)
        .join(" ");

      const result: Record<string, string> = {};

      const licenseMatch = reconstructed.match(/license2?[:\s']*([a-f0-9]{30,50})/i);
      if (licenseMatch) result["license2"] = licenseMatch[1];

      const steamMatch = reconstructed.match(/steam[:\s'[\]]*([0-9a-f]{10,20})/i);
      if (steamMatch) result["steam"] = steamMatch[1];

      const ipMatch = reconstructed.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch) result["ip"] = ipMatch[1];

      const dateMatch = reconstructed.match(/(\d{4}-\d{2}-\d{2}[\s:T]+\d{2}[:\s]\d{2}[:\s]\d{2})/);
      if (dateMatch) result["date"] = dateMatch[1].replace(/\s+/g, " ").trim();

      const discordMatch = reconstructed.match(/discord[:\s'[\]]*(\d{17,20})/i);
      if (discordMatch) result["discord"] = discordMatch[1];

      const xblMatch = reconstructed.match(/xbl[:\s'[\]]*(\d{10,20})/i);
      if (xblMatch) result["xbl"] = xblMatch[1];

      const liveMatch = reconstructed.match(/live[:\s'[\]]*(\d{10,20})/i);
      if (liveMatch) result["live"] = liveMatch[1];

      return result;
    }

    function cleanExternalValue(val: string): string {
      let s = val;
      s = s.replace(/\[([^\]]*)\]\(https?:\/\/[^)]*\)/g, "$1");
      s = s.replace(/\(https?:\/\/[^)]*\)/g, "");
      s = s.replace(/https?:\/\/[^\s'")\]]+/g, "");
      s = s.replace(/[\[\]()]/g, "");
      s = s.replace(/^['"\s]+|['"\s]+$/g, "");
      return s.trim();
    }

    function cleanExternalKey(key: string): string {
      let s = key;
      s = s.replace(/^['"\s]+|['"\s]+$/g, "");
      s = s.replace(/[\[\]]/g, "");
      s = s.replace(/\(https?:\/\/[^)]*\)/g, "");
      s = s.replace(/https?:\/\/[^\s'")\]]+/g, "");
      return s.trim().toLowerCase().replace(/\s+/g, "_");
    }

    function normalizeRow(obj: Record<string, any>, label: string, sourceFiles: string): Record<string, unknown> | null {
      const flat = flattenObject(obj);
      const row: Record<string, unknown> = { _source: `External - ${label}` };

      if (isFivemData(flat)) {
        const fivemParsed = parseFivemData(flat);
        for (const [k, v] of Object.entries(fivemParsed)) {
          if (v) row[k] = v;
        }
        if (sourceFiles) row["source"] = sourceFiles;
        return Object.keys(row).length > 1 ? row : null;
      }

      for (const [k, v] of Object.entries(flat)) {
        if (k === "resume" || k === "statut") continue;
        const cleanKey = cleanExternalKey(k);
        const cleanVal = cleanExternalValue(String(v ?? "")).slice(0, 260);
        if (cleanKey && cleanVal) {
          const normalizedKey = FIELD_ALIASES[cleanKey] || cleanKey;
          row[normalizedKey] = cleanVal;
        }
      }
      if (sourceFiles) row["source"] = sourceFiles;
      return Object.keys(row).length > 1 ? row : null;
    }

    function flattenObject(obj: Record<string, any>, prefix = "", depth = 0): Record<string, string> {
      const result: Record<string, string> = {};
      if (depth > 3) return result;
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}_${k}` : k;
        if (v === null || v === undefined) continue;
        if (typeof v === "object" && !Array.isArray(v)) {
          Object.assign(result, flattenObject(v, key, depth + 1));
        } else if (Array.isArray(v)) {
          result[key] = v.map(String).join(", ");
        } else {
          let strVal = String(v);
          try {
            const parsed = JSON.parse(strVal);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              Object.assign(result, flattenObject(parsed, key, depth + 1));
              continue;
            }
          } catch {}
          result[key] = strVal;
        }
      }
      return result;
    }

    function parseRawLine(line: string): Record<string, string> | null {
      try {
        const obj = JSON.parse(line);
        if (obj && typeof obj === "object" && !Array.isArray(obj)) {
          return flattenObject(obj);
        }
      } catch {}

      if (line.includes(":") || line.includes("=")) {
        const pairs: Record<string, string> = {};
        const parts = line.split(/[,;|·]/).map((s) => s.trim()).filter(Boolean);
        for (const part of parts) {
          const sepIdx = part.indexOf(":");
          const eqIdx = part.indexOf("=");
          const idx = sepIdx >= 0 && eqIdx >= 0 ? Math.min(sepIdx, eqIdx) : sepIdx >= 0 ? sepIdx : eqIdx;
          if (idx > 0) {
            const key = part.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "_");
            const val = part.slice(idx + 1).trim();
            if (key && val) pairs[key] = val;
          }
        }
        if (Object.keys(pairs).length >= 1) return pairs;
      }

      const extracted: Record<string, string> = {};
      const emailMatch = line.match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);
      if (emailMatch) extracted["email"] = emailMatch[0];
      const phoneMatch = line.match(/(?:\+33|33|0)[1-9](?:[\s.\-]?\d{2}){4}/);
      if (phoneMatch) {
        let phone = phoneMatch[0].replace(/[\s.\-]/g, "");
        if (phone.startsWith("+33")) phone = "0" + phone.slice(3);
        else if (phone.startsWith("33")) phone = "0" + phone.slice(2);
        extracted["telephone"] = phone;
      }
      if (Object.keys(extracted).length > 0) return extracted;

      return null;
    }

    if (results && typeof results === "object" && !Array.isArray(results)) {
      for (const [sourceKey, sourceVal] of Object.entries(results)) {
        const src = sourceVal as any;
        const label = src.label || sourceKey;
        const sourceFiles = Array.isArray(src.sources) ? src.sources.join(", ") : "";

        if (src.data && typeof src.data === "object" && !Array.isArray(src.data) && Object.keys(src.data).length > 0) {
          const row = normalizeRow(src.data, label, sourceFiles);
          if (row && hasUsefulData(row)) flatResults.push(row);
        }

        if (Array.isArray(src.raw_lines)) {
          for (const line of src.raw_lines) {
            if (!line || typeof line !== "string" || !line.trim()) continue;
            const parsed = parseRawLine(line);
            if (parsed && Object.keys(parsed).length > 0) {
              const row = normalizeRow(parsed, label, sourceFiles);
              if (row && hasUsefulData(row)) flatResults.push(row);
            }
          }
        }
      }
    } else if (Array.isArray(results)) {
      for (const item of results) {
        if (item && typeof item === "object") {
          flatResults.push({ ...item, _source: "External" });
        }
      }
    }

    console.log(`[external-search] Got ${flatResults.length} results`);
    return flatResults;
  }

  // POST /api/search (protected + rate-limited)
  app.post(api.search.perform.path, requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;

      const sub = await storage.getSubscription(userId);
      const userBypassed = sub ? await isUserBypassed(sub.id) : false;

      if (!userBypassed && await storage.isFrozen(userId)) {
        return res.status(403).json({ message: "Votre compte est gele. Contactez un administrateur." });
      }

      const today = new Date().toISOString().split("T")[0];

      const effectiveRole = await getEffectiveRole(userId);
      const isAdmin = effectiveRole === "admin";

      const tier: PlanTier = isAdmin ? "api" : ((sub?.tier as PlanTier) || "free");
      const planInfo = PLAN_LIMITS[tier] || PLAN_LIMITS.free;
      const isUnlimited = isAdmin || userBypassed || planInfo.dailySearches === -1;

      if (!userBypassed && !COOLDOWN_EXEMPT_ROLES.has(isAdmin ? "admin" : tier)) {
        const lastSearch = userSearchCooldowns.get(userId);
        if (lastSearch) {
          const elapsed = Date.now() - lastSearch;
          if (elapsed < USER_SEARCH_COOLDOWN_MS) {
            const remaining = Math.ceil((USER_SEARCH_COOLDOWN_MS - elapsed) / 1000);
            return res.status(429).json({
              message: `Veuillez patienter ${remaining}s avant de relancer une recherche.`,
              cooldown: true,
              remainingSeconds: remaining,
            });
          }
        }
      }

      const request = api.search.perform.input.parse(req.body);

      const FIVEM_FILTER_SET = new Set<string>(FivemFilterTypes as unknown as string[]);
      const hasFivemFilter = request.criteria.some((c: { type: string }) => FIVEM_FILTER_SET.has(c.type));
      const TIER_ORDER: Record<string, number> = { free: 0, vip: 1, pro: 2, business: 3, api: 4 };
      const tierLevel = TIER_ORDER[tier] ?? 0;

      if (hasFivemFilter && tierLevel < TIER_ORDER.vip) {
        return res.status(403).json({
          message: "La recherche FiveM nécessite un abonnement VIP minimum.",
          requiredTier: "vip",
          tier,
        });
      }

      if (!isUnlimited && tier === "free") {
        const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || "unknown";
        const ipUsage = getIpFreeUsage(clientIp);
        if (ipUsage >= IP_FREE_SEARCH_LIMIT) {
          return res.json({
            results: [],
            total: 0,
            quotaExceeded: true,
            quota: {
              used: ipUsage,
              limit: IP_FREE_SEARCH_LIMIT,
              tier,
            },
          });
        }
      }

      const newCount = await storage.incrementDailyUsage(userId, today);

      if (!isUnlimited && newCount > planInfo.dailySearches) {
        return res.json({
          results: [],
          total: 0,
          quotaExceeded: true,
          quota: {
            used: newCount,
            limit: planInfo.dailySearches,
            tier,
          },
        });
      }

      if (!isUnlimited && tier === "free") {
        const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || "unknown";
        incrementIpFreeUsage(clientIp);
      }
      console.log(`[search] Incoming criteria: ${JSON.stringify(request.criteria)}, limit: ${request.limit}, offset: ${request.offset}`);
      const searchStart = Date.now();
      const searchPromise = Promise.resolve(searchAllIndexes(request.criteria, request.limit, request.offset));
      const externalPromise = callExternalSearchApi(request.criteria).catch((err) => {
        console.error("[external-search] Failed (non-blocking):", err);
        return [] as Record<string, unknown>[];
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SEARCH_TIMEOUT")), 90000)
      );
      let results: Record<string, unknown>[];
      let total: number | null;
      let externalResults: Record<string, unknown>[] = [];
      try {
        const [searchResult, extResults] = await Promise.race([
          Promise.all([searchPromise, externalPromise]),
          timeoutPromise,
        ]) as [{ results: Record<string, unknown>[]; total: number | null }, Record<string, unknown>[]];
        results = searchResult.results;
        total = searchResult.total;
        externalResults = extResults;
      } catch (timeoutErr: any) {
        if (timeoutErr.message === "SEARCH_TIMEOUT") {
          console.warn(`[search] Timeout after ${Date.now() - searchStart}ms`);
          return res.status(504).json({ message: "La recherche a pris trop de temps. Essayez un terme plus precis." });
        }
        throw timeoutErr;
      }

      if (externalResults.length > 0) {
        const filteredExternal = request.criteria.length > 1
          ? filterResultsByCriteria(externalResults, request.criteria)
          : externalResults;
        results = [...results, ...filteredExternal];
        total = (total ?? 0) + filteredExternal.length;
        if (filteredExternal.length !== externalResults.length) {
          console.log(`[search] External filtered: ${externalResults.length} -> ${filteredExternal.length}`);
        }
      }

      if (request.criteria.length > 1) {
        const beforeCount = results.length;
        results = filterResultsByCriteria(results, request.criteria);
        total = results.length;
        if (results.length !== beforeCount) {
          console.log(`[search] Final multi-criteria filter: ${beforeCount} -> ${results.length}`);
        }
      }

      results = results.filter((r) => {
        const dataKeys = Object.keys(r).filter(k => !k.startsWith("_") && k !== "source" && k !== "rownum" && k !== "_source" && k !== "_raw");
        if (dataKeys.length === 0) return false;
        const hasContent = dataKeys.some(k => {
          const v = r[k];
          return v !== null && v !== undefined && String(v).trim().length > 0;
        });
        return hasContent;
      });
      total = results.length;

      results = sortByRelevance(results, request.criteria);

      console.log(`[search] Done in ${Date.now() - searchStart}ms — results: ${results.length}, total: ${total}`);

      const wUser = await buildUserInfo(req);
      const criteriaStr = request.criteria.map((c: any) => `${c.type}:${c.value}`).join(", ");
      if (!wUser.bypassed) {
        webhookSearch(wUser, "interne", criteriaStr, total ?? 0);

        if (externalResults.length > 0) {
          webhookExternalProxySearch(wUser, criteriaStr, externalResults.length);
        }
      }

      if (!userBypassed) {
        const alertKey = `${userId}_${today}`;
        if (!abnormalAlertsSent.has(alertKey)) {
          const threshold = isUnlimited
            ? ABNORMAL_UNLIMITED_THRESHOLD
            : Math.floor(planInfo.dailySearches * ABNORMAL_THRESHOLD_RATIO);
          if (newCount >= threshold) {
            abnormalAlertsSent.add(alertKey);
            webhookAbnormalActivity(wUser, newCount, isUnlimited ? ABNORMAL_UNLIMITED_THRESHOLD : planInfo.dailySearches);
            const username = wUser.username || wUser.email?.split("@")[0] || "inconnu";
            sendFreezeAlert(userId, username, wUser.uniqueId || 0, newCount, isUnlimited ? ABNORMAL_UNLIMITED_THRESHOLD : planInfo.dailySearches);
          }
        }
      }

      if (!userBypassed && !COOLDOWN_EXEMPT_ROLES.has(isAdmin ? "admin" : tier)) {
        userSearchCooldowns.set(userId, Date.now());
      }

      res.json({
        results,
        total,
        cooldownSeconds: COOLDOWN_EXEMPT_ROLES.has(isAdmin ? "admin" : tier) ? 0 : USER_SEARCH_COOLDOWN_MS / 1000,
        quota: {
          used: newCount,
          limit: planInfo.dailySearches,
          tier,
        },
      });
    } catch (error: any) {
      console.error("Search error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", field: error.errors[0].path.join(".") });
      } else {
        res.status(400).json({ message: error.message || "Search error" });
      }
    }
  });

  // GET /api/filters
  app.get(api.search.filters.path, (_req, res) => {
    res.json(FilterLabels);
  });

  // GET /api/categories
  app.get("/api/categories", async (_req, res) => {
    try {
      const cats = await storage.getCategories();
      res.json(cats);
    } catch (err) {
      console.error("GET /api/categories error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/admin/categories (admin only)
  app.post("/api/admin/categories", requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = insertCategorySchema.parse(req.body);
      const cat = await storage.createCategory(parsed);
      const adminEmail = (req as any).user?.email || "admin";
      webhookCategoryCreated(adminEmail, parsed.name);
      res.json(cat);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: err.errors });
      }
      console.error("POST /api/admin/categories error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/admin/categories/:id (admin only)
  app.patch("/api/admin/categories/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const updates = insertCategorySchema.partial().parse(req.body);
      const cat = await storage.updateCategory(id, updates);
      if (!cat) return res.status(404).json({ message: "Catégorie non trouvée" });
      const adminEmail = (req as any).user?.email || "admin";
      webhookCategoryUpdated(adminEmail, id);
      res.json(cat);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: err.errors });
      }
      console.error("PATCH /api/admin/categories error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DELETE /api/admin/categories/:id (admin only)
  app.delete("/api/admin/categories/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deleteCategory(id);
      if (!deleted) return res.status(404).json({ message: "Catégorie non trouvée" });
      const adminEmail = (req as any).user?.email || "admin";
      webhookCategoryDeleted(adminEmail, id);
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/admin/categories error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // DELETE /api/vouches/:id (admin only)
  app.delete("/api/vouches/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deleteVouch(id);
      if (!deleted) return res.status(404).json({ message: "Avis non trouve" });
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/vouches error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/create-invoice", requireAuth, async (req: Request, res: Response) => {
    try {
      const { plan } = req.body;
      const planInfo = PLAN_LIMITS[plan as PlanTier];
      if (!planInfo || plan === "free") {
        return res.status(400).json({ message: "Plan invalide" });
      }

      const apiKey = process.env.NOWPAYMENTS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Payment service not configured" });
      }

      const orderId = `order_${plan}_${Date.now()}`;
      const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
      const orderToken = signOrderId(orderId);
      const successUrl = `${baseUrl}/payment-success?order=${orderId}&token=${orderToken}`;
      const cancelUrl = `${baseUrl}/pricing`;
      const ipnUrl = `${baseUrl}/api/nowpayments-ipn`;

      const response = await fetch("https://api.nowpayments.io/v1/invoice", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_amount: planInfo.price,
          price_currency: "eur",
          order_id: orderId,
          order_description: `Abonnement ${planInfo.label}`,
          ipn_callback_url: ipnUrl,
          success_url: successUrl,
          cancel_url: cancelUrl,
        }),
      });

      const data = await response.json();

      if (!data.invoice_url) {
        console.error("NOWPayments error:", data);
        return res.status(502).json({ message: "Failed to create invoice" });
      }

      webhookInvoiceCreated(plan, orderId, planInfo.price);

      res.json({ invoice_url: data.invoice_url });
    } catch (err) {
      console.error("POST /api/create-invoice error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/nowpayments-ipn", async (req: Request, res: Response) => {
    try {
      const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
      if (!ipnSecret) {
        console.error("NOWPayments IPN: IPN_SECRET not configured");
        return res.status(500).json({ status: "server misconfigured" });
      }

      const receivedSig = req.headers["x-nowpayments-sig"] as string;
      if (!receivedSig) {
        console.error("NOWPayments IPN: missing signature header");
        return res.status(403).json({ status: "signature required" });
      }

      const sortedBody = sortObject(req.body);
      const hmac = crypto.createHmac("sha512", ipnSecret);
      hmac.update(JSON.stringify(sortedBody));
      const calculatedSig = hmac.digest("hex");

      if (receivedSig !== calculatedSig) {
        console.error("NOWPayments IPN: invalid signature");
        return res.status(403).json({ status: "invalid signature" });
      }

      const { payment_status, order_id, price_amount, pay_currency } = req.body;
      console.log("NOWPayments IPN:", { payment_status, order_id, price_amount, pay_currency });

      const status = payment_status;
      const order_number = order_id;
      const source_amount = price_amount;
      const currency = pay_currency;

      if (status === "finished" || status === "partially_paid" || status === "confirmed") {
        const orderStr = String(order_number || "");

        const serviceMatch = orderStr.match(/^service_(blacklist|info)_/);
        if (serviceMatch) {
          const serviceType = serviceMatch[1];
          const pending = await storage.getPendingServiceRequest(orderStr);
          if (pending && !pending.paid) {
            await storage.markPendingServiceRequestPaid(orderStr);
            const formData = JSON.parse(pending.formData);

            if (serviceType === "blacklist") {
              await storage.createBlacklistRequest({
                userId: pending.userId,
                firstName: formData.firstName || null,
                lastName: formData.lastName || null,
                pseudo: formData.pseudo || null,
                email: formData.email || null,
                phone: formData.phone || null,
                address: formData.address || null,
                reason: formData.reason || null,
              });
              console.log(`Blacklist request created for paid order ${orderStr}`);
            } else if (serviceType === "info") {
              await storage.createInfoRequest({
                userId: pending.userId,
                discordId: formData.discordId || null,
                email: formData.email || null,
                pseudo: formData.pseudo || null,
                ipAddress: formData.ipAddress || null,
                additionalInfo: formData.additionalInfo || null,
                orderId: orderStr,
              });
              console.log(`Info request created for paid order ${orderStr}`);
            }

            webhookPaymentCompleted(orderStr, serviceType as any, String(source_amount || "50"), String(currency || "BTC"));
          }
        } else {
          const tierMatch = orderStr.match(/^order_(vip|pro|business|api)_/);
          const tier = tierMatch ? tierMatch[1] as PlanTier : null;

          if (tier) {
            const license = await storage.createLicenseKey(tier, orderStr);
            console.log(`License key for order ${orderStr}: ${license.key}`);
            webhookPaymentCompleted(orderStr, tier, String(source_amount || "?"), String(currency || "BTC"));
          }
        }
      }

      res.json({ status: "ok" });
    } catch (err) {
      console.error("NOWPayments IPN error:", err);
      res.json({ status: "ok" });
    }
  });

  // GET /api/license-by-order/:orderId - fetch license key by order (secured with signed token)
  app.get("/api/license-by-order/:orderId", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const token = req.query.token as string;
      if (!orderId || typeof orderId !== "string") {
        return res.status(400).json({ message: "Order ID requis." });
      }
      if (!token || typeof token !== "string" || token.length !== 64) {
        return res.status(403).json({ message: "Token invalide." });
      }
      try {
        if (!verifyOrderToken(orderId, token)) {
          return res.status(403).json({ message: "Token invalide." });
        }
      } catch {
        return res.status(403).json({ message: "Token invalide." });
      }
      const license = await storage.getLicenseKeyByOrder(orderId);
      if (!license) {
        return res.status(404).json({ message: "Cle non encore generee. Le paiement est peut-etre en cours de confirmation." });
      }
      res.json({ key: license.key, tier: license.tier });
    } catch (err) {
      console.error("GET /api/license-by-order error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/redeem-key - redeem a license key
  app.post("/api/redeem-key", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { key } = req.body;

      if (!key || typeof key !== "string" || key.trim().length === 0) {
        return res.status(400).json({ message: "Cle requise." });
      }

      const result = await storage.redeemLicenseKey(key.trim(), userId);

      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      const wUser = await buildUserInfo(req);
      const licenseInfo = await storage.getLicenseKey(key.trim());
      let userDiscordId: string | null = null;
      try { userDiscordId = await storage.getDiscordId(userId); } catch {}
      webhookKeyRedeemed(wUser, result.tier || "unknown", key.trim(), userDiscordId, undefined);
      webhookBotKeyRedeemed(wUser.username || wUser.email, wUser.uniqueId, userDiscordId, result.tier || "unknown", key.trim(), null);

      if (userDiscordId && result.tier) {
        syncCustomerRole(userDiscordId, result.tier).catch(() => {});
      }

      res.json({ message: result.message, tier: result.tier });
    } catch (err) {
      console.error("POST /api/redeem-key error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/admin/license-keys - list all license keys (admin only)
  app.get("/api/admin/license-keys", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
    try {
      const keys = await storage.getLicenseKeys();
      res.json(keys);
    } catch (err) {
      console.error("GET /api/admin/license-keys error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/admin/generate-key - manually generate a license key (admin only)
  app.post("/api/admin/generate-key", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { tier } = req.body;
      console.log("[generate-key] Request body:", JSON.stringify(req.body), "tier:", tier);
      if (!tier || !PLAN_LIMITS[tier as PlanTier] || tier === "free") {
        console.log("[generate-key] Invalid tier:", tier, "available:", Object.keys(PLAN_LIMITS));
        return res.status(400).json({ message: `Tier invalide: ${tier}. Tiers disponibles: ${Object.keys(PLAN_LIMITS).filter(t => t !== "free").join(", ")}` });
      }

      const adminEmail = (req as any).user?.email || "admin";
      console.log("[generate-key] Creating key for tier:", tier, "by:", adminEmail);
      const license = await storage.createLicenseKey(tier as PlanTier, `manual_${Date.now()}`);
      console.log("[generate-key] Key created:", license.key);
      webhookKeyGenerated(adminEmail, tier, license.key);
      res.json({ key: license.key, tier: license.tier });
    } catch (err: any) {
      console.error("POST /api/admin/generate-key error:", err?.message || err, err?.stack);
      res.status(500).json({ message: `Erreur generation: ${err?.message || "Erreur interne"}` });
    }
  });

  app.get("/api/admin/subscriptions", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
    try {
      const allSubs = await storage.getAllSubscriptions();
      res.json(allSubs);
    } catch (err) {
      console.error("GET /api/admin/subscriptions error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/revoke-subscription", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId requis" });
      const success = await storage.revokeSubscription(userId);
      if (!success) return res.status(404).json({ message: "Abonnement non trouve" });
      res.json({ message: "Abonnement revoque" });
    } catch (err) {
      console.error("POST /api/admin/revoke-subscription error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/subscription - get current user subscription
  app.get("/api/subscription", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const effectiveRole = await getEffectiveRole(userId);
      const isAdmin = effectiveRole === "admin";
      const sub = await storage.getSubscription(userId);
      const tier = isAdmin ? "api" : ((sub?.tier as PlanTier) || "free");
      res.json({ tier, isAdmin, ...PLAN_LIMITS[tier] || PLAN_LIMITS.free });
    } catch (err) {
      console.error("GET /api/subscription error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // API Key management (for "api" tier users and admins)
  app.post("/api/api-keys", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const effectiveRole = await getEffectiveRole(userId);
      const sub = await storage.getSubscription(userId);
      if (effectiveRole !== "admin" && (!sub || sub.tier !== "api")) {
        return res.status(403).json({ message: "L'abonnement API est requis pour generer des cles." });
      }

      const { name } = req.body;
      const { key, apiKey } = await storage.createApiKey(userId, name || "Default");
      const wUser = await buildUserInfo(req);
      webhookApiKeyCreated(wUser, name || "Default");
      res.status(201).json({
        id: apiKey.id,
        key,
        keyPrefix: apiKey.keyPrefix,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
      });
    } catch (err) {
      console.error("POST /api/api-keys error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/api-keys", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const keys = await storage.getApiKeysByUser(userId);
      res.json(keys.map(k => ({
        id: k.id,
        keyPrefix: k.keyPrefix,
        name: k.name,
        createdAt: k.createdAt,
      })));
    } catch (err) {
      console.error("GET /api/api-keys error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/api-keys/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const revoked = await storage.revokeApiKey(id, userId);
      if (!revoked) return res.status(404).json({ message: "Cle non trouvee" });
      const wUser = await buildUserInfo(req);
      webhookApiKeyRevoked(wUser, id);
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/api-keys error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/breach-search - proxy to breach.vip external API
  app.post("/api/breach-search", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;

      const sub = await storage.getSubscription(userId);
      const userBypassed = sub ? await isUserBypassed(sub.id) : false;

      if (!userBypassed && await storage.isFrozen(userId)) {
        return res.status(403).json({ message: "Votre compte est gele. Contactez un administrateur." });
      }

      const today = new Date().toISOString().split("T")[0];

      const effectiveRole = await getEffectiveRole(userId);
      const isAdmin = effectiveRole === "admin";

      const tier: PlanTier = isAdmin ? "api" : ((sub?.tier as PlanTier) || "free");
      const planInfo = PLAN_LIMITS[tier] || PLAN_LIMITS.free;
      const isUnlimited = isAdmin || userBypassed || planInfo.dailySearches === -1;

      const newCount = await storage.incrementDailyUsage(userId, today);

      if (!isUnlimited && newCount > planInfo.dailySearches) {
        return res.status(429).json({
          message: "Nombre de recherches limite atteint.",
          used: newCount,
          limit: planInfo.dailySearches,
          tier,
        });
      }

      const { term, fields } = req.body;
      if (!term || typeof term !== "string" || term.length < 1 || term.length > 100) {
        return res.status(400).json({ message: "Le terme de recherche est requis (1-100 caracteres)." });
      }
      if (!fields || !Array.isArray(fields) || fields.length === 0 || fields.length > 10) {
        return res.status(400).json({ message: "Au moins un champ est requis (max 10)." });
      }

      const breachApiKey = process.env.BREACH_API_KEY;
      if (!breachApiKey) {
        return res.status(503).json({ message: "Cle API Breach non configuree." });
      }

      let response: globalThis.Response;
      try {
        response = await fetch("https://breach.vip/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Api-Key": breachApiKey,
          },
          body: JSON.stringify({
            term,
            fields,
            wildcard: true,
            case_sensitive: false,
            categories: null,
          }),
          signal: AbortSignal.timeout(15000),
        });
      } catch (fetchErr) {
        console.error("Breach.vip API fetch error:", fetchErr);
        return res.status(502).json({ message: "Impossible de joindre le service de recherche externe." });
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error("Breach.vip API error:", response.status, errText.slice(0, 300));
        if (response.status === 429) {
          return res.status(429).json({ message: "Limite de requetes de l'API externe atteinte. Reessayez dans une minute." });
        }
        return res.status(502).json({ message: "Erreur du service de recherche externe." });
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        console.error("Breach.vip API non-JSON response");
        return res.status(503).json({ message: "Le service externe est temporairement inaccessible. Reessayez plus tard." });
      }

      const data = await response.json();

      const wUser = await buildUserInfo(req);
      const resultCount = Array.isArray(data.results) ? data.results.length : 0;
      if (!wUser.bypassed) {
        webhookBreachSearch(wUser, term, fields, resultCount);
      }

      res.json({
        results: data.results || [],
        quota: {
          used: newCount,
          limit: planInfo.dailySearches,
          tier,
        },
      });
    } catch (err) {
      console.error("POST /api/breach-search error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  function getOperatorByPrefix(nationalNumber: string, type: string): string {
    if (type !== "mobile") {
      const voipOps: Record<string, string> = {
        "90": "Free", "91": "Free", "92": "Free", "93": "Free",
        "94": "Free", "95": "Free", "96": "Free", "97": "Free", "98": "Free", "99": "Free",
      };
      if (type === "voip" && voipOps[nationalNumber.slice(0, 2)]) {
        return voipOps[nationalNumber.slice(0, 2)];
      }
      return "Non identifiable (fixe/VoIP)";
    }

    const prefix2 = nationalNumber.slice(0, 2);
    const prefix3 = nationalNumber.slice(0, 3);
    const prefix4 = nationalNumber.slice(0, 4);

    const mobileOps4: Record<string, string> = {
      "6440": "Free Mobile", "6441": "Free Mobile", "6442": "Free Mobile", "6443": "Free Mobile",
      "6444": "Free Mobile", "6445": "Free Mobile", "6446": "Free Mobile", "6447": "Free Mobile",
      "6448": "Free Mobile", "6449": "Free Mobile",
      "6950": "Free Mobile", "6951": "Free Mobile", "6952": "Free Mobile",
      "7000": "Transatel", "7001": "Transatel",
      "7002": "Syma Mobile", "7003": "Syma Mobile",
      "7004": "Lycamobile", "7005": "Lycamobile", "7006": "Lycamobile", "7007": "Lycamobile",
      "7008": "Lycamobile", "7009": "Lycamobile",
      "7010": "Mundio Mobile", "7011": "Mundio Mobile",
      "7012": "Legos", "7013": "Legos",
      "7020": "Truphone", "7021": "Truphone",
      "7030": "Coriolis", "7031": "Coriolis",
      "7040": "Sisteer", "7041": "Sisteer",
      "7050": "Free Mobile", "7051": "Free Mobile", "7052": "Free Mobile",
      "7053": "Free Mobile", "7054": "Free Mobile", "7055": "Free Mobile",
      "7056": "Free Mobile", "7057": "Free Mobile", "7058": "Free Mobile", "7059": "Free Mobile",
      "7800": "Bouygues Telecom", "7801": "Bouygues Telecom",
      "7810": "SFR", "7811": "SFR",
      "7820": "Orange", "7821": "Orange",
      "7830": "Free Mobile", "7831": "Free Mobile",
      "7840": "Orange", "7841": "Orange",
      "7850": "SFR", "7851": "SFR",
      "7860": "Bouygues Telecom", "7861": "Bouygues Telecom",
      "7870": "Free Mobile", "7871": "Free Mobile",
      "7880": "Orange", "7881": "Orange",
      "7890": "SFR", "7891": "SFR",
    };
    if (mobileOps4[prefix4]) return mobileOps4[prefix4];

    const mobileOps3: Record<string, string> = {
      "600": "Orange", "601": "Orange", "602": "Orange", "603": "Orange",
      "604": "Orange", "605": "Orange", "606": "Orange", "607": "Orange", "608": "Orange",
      "609": "SFR",
      "610": "Orange", "611": "Orange", "612": "Orange", "613": "Orange",
      "614": "Orange", "615": "Orange", "616": "Orange", "617": "Orange",
      "618": "Orange", "619": "Orange",
      "620": "SFR", "621": "SFR", "622": "SFR", "623": "SFR",
      "624": "SFR", "625": "SFR", "626": "SFR", "627": "SFR", "628": "SFR", "629": "SFR",
      "630": "Bouygues Telecom", "631": "Bouygues Telecom", "632": "Bouygues Telecom",
      "633": "Bouygues Telecom", "634": "Bouygues Telecom", "635": "Bouygues Telecom",
      "636": "Bouygues Telecom", "637": "Bouygues Telecom", "638": "Bouygues Telecom", "639": "Bouygues Telecom",
      "640": "Bouygues Telecom", "641": "Bouygues Telecom", "642": "Bouygues Telecom", "643": "Bouygues Telecom",
      "644": "Free Mobile",
      "645": "Free Mobile", "646": "Free Mobile", "647": "Free Mobile",
      "648": "Free Mobile", "649": "Free Mobile",
      "650": "Bouygues Telecom", "651": "Bouygues Telecom", "652": "Bouygues Telecom",
      "653": "Bouygues Telecom", "654": "Bouygues Telecom", "655": "Bouygues Telecom",
      "656": "Bouygues Telecom", "657": "Bouygues Telecom", "658": "Bouygues Telecom", "659": "Bouygues Telecom",
      "660": "SFR", "661": "SFR", "662": "SFR", "663": "SFR",
      "664": "SFR", "665": "SFR", "666": "SFR", "667": "SFR", "668": "SFR", "669": "SFR",
      "670": "Orange", "671": "Orange", "672": "Orange", "673": "Orange",
      "674": "Orange", "675": "Orange", "676": "Orange", "677": "Orange", "678": "Orange", "679": "Orange",
      "680": "Orange", "681": "Orange", "682": "Orange", "683": "Orange", "684": "Orange",
      "685": "SFR", "686": "SFR", "687": "SFR", "688": "SFR", "689": "SFR",
      "690": "Orange", "691": "Orange", "692": "Orange", "693": "Orange",
      "694": "Orange", "695": "Free Mobile",
      "696": "Orange", "697": "Orange", "698": "Orange", "699": "Orange",
      "730": "Free Mobile", "731": "Free Mobile", "732": "Free Mobile",
      "733": "Free Mobile", "734": "Free Mobile", "735": "Free Mobile",
      "736": "Free Mobile", "737": "Free Mobile", "738": "Free Mobile", "739": "Free Mobile",
      "740": "Bouygues Telecom", "741": "Bouygues Telecom", "742": "Bouygues Telecom",
      "743": "Bouygues Telecom", "744": "Bouygues Telecom",
      "745": "Free Mobile", "746": "Free Mobile", "747": "Free Mobile",
      "748": "Free Mobile", "749": "Free Mobile",
      "750": "Free Mobile", "751": "Free Mobile", "752": "Free Mobile",
      "753": "Free Mobile", "754": "Free Mobile", "755": "Free Mobile",
      "756": "Free Mobile", "757": "Free Mobile", "758": "Free Mobile", "759": "Free Mobile",
      "760": "Orange", "761": "Orange", "762": "Orange", "763": "Orange",
      "764": "Orange", "765": "Orange", "766": "Orange", "767": "Orange", "768": "Orange", "769": "Orange",
      "770": "SFR", "771": "SFR", "772": "SFR", "773": "SFR",
      "774": "SFR", "775": "SFR", "776": "SFR", "777": "SFR", "778": "SFR", "779": "SFR",
      "780": "Bouygues Telecom",
      "781": "SFR",
      "782": "Orange",
      "783": "Free Mobile",
      "784": "Orange",
      "785": "SFR",
      "786": "Bouygues Telecom",
      "787": "Free Mobile",
      "788": "Orange",
      "789": "SFR",
      "790": "Bouygues Telecom", "791": "Bouygues Telecom", "792": "Bouygues Telecom",
      "793": "Bouygues Telecom", "794": "Bouygues Telecom", "795": "Bouygues Telecom",
      "796": "Bouygues Telecom", "797": "Bouygues Telecom", "798": "Bouygues Telecom", "799": "Bouygues Telecom",
    };
    if (mobileOps3[prefix3]) return mobileOps3[prefix3];

    const mobileOps2: Record<string, string> = {
      "60": "Orange", "61": "Orange",
      "62": "SFR", "63": "Bouygues Telecom",
      "64": "Bouygues Telecom", "65": "Bouygues Telecom",
      "66": "SFR", "67": "Orange",
      "68": "Orange", "69": "Orange",
      "73": "Free Mobile", "74": "Bouygues Telecom",
      "75": "Free Mobile", "76": "Orange",
      "77": "SFR", "78": "Orange",
      "79": "Bouygues Telecom",
    };
    if (mobileOps2[prefix2]) return mobileOps2[prefix2];

    return "Non identifié";
  }

  // POST /api/phone/lookup - French phone number lookup
  app.post("/api/phone/lookup", requireAuth, async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone || typeof phone !== "string") {
        return res.status(400).json({ ok: false, message: "Numéro de téléphone requis" });
      }

      let normalized = phone.replace(/[\s.\-()]/g, "");

      if (normalized.startsWith("0033")) {
        normalized = "+33" + normalized.slice(4);
      } else if (normalized.startsWith("00")) {
        return res.json({ ok: false, message: "Numéro hors France" });
      } else if (normalized.startsWith("+") && !normalized.startsWith("+33")) {
        return res.json({ ok: false, message: "Numéro hors France" });
      } else if (normalized.startsWith("0")) {
        normalized = "+33" + normalized.slice(1);
      } else if (!normalized.startsWith("+")) {
        return res.json({ ok: false, message: "Format de numéro invalide. Utilisez un format français (06..., +33...)" });
      }

      if (!normalized.startsWith("+33")) {
        return res.json({ ok: false, message: "Numéro hors France" });
      }

      const afterPrefix = normalized.slice(3);
      if (afterPrefix.length !== 9 || !/^\d{9}$/.test(afterPrefix) || afterPrefix[0] === "0") {
        return res.json({ ok: false, message: "Format de numéro invalide" });
      }

      const firstDigit = afterPrefix[0];
      const first2 = afterPrefix.slice(0, 2);
      const first3 = afterPrefix.slice(0, 3);
      const first4 = afterPrefix.slice(0, 4);

      const regionMap: Record<string, string> = {
        "1": "Île-de-France",
        "2": "Nord-Ouest",
        "3": "Nord-Est",
        "4": "Sud-Est",
        "5": "Sud-Ouest",
      };

      let type: "mobile" | "landline" | "voip" | "special" = "landline";
      let region: string | null = null;

      if (firstDigit === "6" || firstDigit === "7") {
        type = "mobile";
      } else if (firstDigit === "9") {
        type = "voip";
        region = "Non géographique";
      } else if (firstDigit === "8") {
        type = "special";
        region = "Numéros spéciaux";
      } else if (regionMap[firstDigit]) {
        type = "landline";
        region = regionMap[firstDigit];
      } else {
        return res.json({ ok: false, message: "Préfixe non reconnu" });
      }

      const operator = getOperatorByPrefix(afterPrefix, type);

      res.json({
        ok: true,
        country: "FR",
        type,
        region,
        operator,
        e164: normalized,
      });

      const wUser = await buildUserInfo(req);
      if (!wUser.bypassed) {
        webhookPhoneLookup(wUser, normalized);
      }
    } catch (err) {
      console.error("POST /api/phone/lookup error:", err);
      res.status(500).json({ ok: false, message: "Erreur interne" });
    }
  });

  // POST /api/geoip - GeoIP lookup
  app.post("/api/geoip", requireAuth, async (req, res) => {
    try {
      const { ip } = req.body;
      if (!ip || typeof ip !== "string") {
        return res.status(400).json({ ok: false, message: "Adresse IP requise" });
      }

      const trimmed = ip.trim();
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      const ipv6Regex = /^[0-9a-fA-F:]+$/;
      if (!ipv4Regex.test(trimmed) && !ipv6Regex.test(trimmed)) {
        return res.json({ ok: false, message: "Format d'adresse IP invalide" });
      }

      const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(trimmed)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,query`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = await response.json();

      if (data.status === "fail") {
        return res.json({ ok: false, message: data.message || "IP non trouvee" });
      }

      const wUser = await buildUserInfo(req);
      if (!wUser.bypassed) webhookGeoIP(wUser, trimmed);

      res.json({
        ok: true,
        ip: data.query,
        country: data.country,
        countryCode: data.countryCode,
        region: data.regionName,
        regionCode: data.region,
        city: data.city,
        zip: data.zip,
        lat: data.lat,
        lon: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        org: data.org,
        as: data.as,
        proxy: data.proxy,
        hosting: data.hosting,
      });
    } catch (err) {
      console.error("POST /api/geoip error:", err);
      res.status(500).json({ ok: false, message: "Erreur interne" });
    }
  });

  // POST /api/nir/decode - Decode French NIR (social security number)
  app.post("/api/nir/decode", requireAuth, async (req, res) => {
    try {
      const { nir } = req.body;
      if (!nir || typeof nir !== "string") {
        return res.status(400).json({ ok: false, message: "Numéro NIR requis" });
      }

      const cleaned = nir.replace(/[\s.\-]/g, "");
      if (!/^\d{13,15}$/.test(cleaned)) {
        return res.status(400).json({ ok: false, message: "Le NIR doit contenir 13 ou 15 chiffres" });
      }

      const digits = cleaned.slice(0, 13);

      const sexCode = parseInt(digits[0]);
      if (sexCode !== 1 && sexCode !== 2) {
        return res.status(400).json({ ok: false, message: "Premier chiffre invalide (1 ou 2 attendu)" });
      }

      const sex = sexCode === 1 ? "Homme" : "Femme";
      const yearStr = digits.slice(1, 3);
      const monthStr = digits.slice(3, 5);
      const deptStr = digits.slice(5, 7);
      const communeStr = digits.slice(7, 10);
      const orderStr = digits.slice(10, 13);

      const month = parseInt(monthStr);
      const MONTHS: Record<number, string> = {
        1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril",
        5: "Mai", 6: "Juin", 7: "Juillet", 8: "Août",
        9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre",
      };
      const monthLabel = MONTHS[month] || "Inconnu";

      const currentYear = new Date().getFullYear() % 100;
      const yearNum = parseInt(yearStr);
      const fullYear = yearNum <= currentYear ? 2000 + yearNum : 1900 + yearNum;

      const DEPARTMENTS: Record<string, string> = {
        "01": "Ain", "02": "Aisne", "03": "Allier", "04": "Alpes-de-Haute-Provence",
        "05": "Hautes-Alpes", "06": "Alpes-Maritimes", "07": "Ardèche", "08": "Ardennes",
        "09": "Ariège", "10": "Aube", "11": "Aude", "12": "Aveyron",
        "13": "Bouches-du-Rhône", "14": "Calvados", "15": "Cantal", "16": "Charente",
        "17": "Charente-Maritime", "18": "Cher", "19": "Corrèze", "21": "Côte-d'Or",
        "22": "Côtes-d'Armor", "23": "Creuse", "24": "Dordogne", "25": "Doubs",
        "26": "Drôme", "27": "Eure", "28": "Eure-et-Loir", "29": "Finistère",
        "2A": "Corse-du-Sud", "2B": "Haute-Corse",
        "30": "Gard", "31": "Haute-Garonne", "32": "Gers", "33": "Gironde",
        "34": "Hérault", "35": "Ille-et-Vilaine", "36": "Indre", "37": "Indre-et-Loire",
        "38": "Isère", "39": "Jura", "40": "Landes", "41": "Loir-et-Cher",
        "42": "Loire", "43": "Haute-Loire", "44": "Loire-Atlantique", "45": "Loiret",
        "46": "Lot", "47": "Lot-et-Garonne", "48": "Lozère", "49": "Maine-et-Loire",
        "50": "Manche", "51": "Marne", "52": "Haute-Marne", "53": "Mayenne",
        "54": "Meurthe-et-Moselle", "55": "Meuse", "56": "Morbihan", "57": "Moselle",
        "58": "Nièvre", "59": "Nord", "60": "Oise", "61": "Orne",
        "62": "Pas-de-Calais", "63": "Puy-de-Dôme", "64": "Pyrénées-Atlantiques",
        "65": "Hautes-Pyrénées", "66": "Pyrénées-Orientales", "67": "Bas-Rhin", "68": "Haut-Rhin",
        "69": "Rhône", "70": "Haute-Saône", "71": "Saône-et-Loire", "72": "Sarthe",
        "73": "Savoie", "74": "Haute-Savoie", "75": "Paris", "76": "Seine-Maritime",
        "77": "Seine-et-Marne", "78": "Yvelines", "79": "Deux-Sèvres", "80": "Somme",
        "81": "Tarn", "82": "Tarn-et-Garonne", "83": "Var", "84": "Vaucluse",
        "85": "Vendée", "86": "Vienne", "87": "Haute-Vienne", "88": "Vosges",
        "89": "Yonne", "90": "Territoire de Belfort", "91": "Essonne",
        "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne",
        "95": "Val-d'Oise",
        "97": "Outre-Mer", "98": "Outre-Mer",
        "99": "Étranger",
      };

      const deptLabel = DEPARTMENTS[deptStr] || `Département ${deptStr}`;

      let keyValid: boolean | null = null;
      if (cleaned.length === 15) {
        const keyStr = cleaned.slice(13, 15);
        const keyNum = parseInt(keyStr);
        let nirNum = BigInt(digits);
        if (deptStr === "2A") nirNum = BigInt(digits.replace("2A", "19"));
        if (deptStr === "2B") nirNum = BigInt(digits.replace("2B", "18"));
        const expectedKey = 97 - Number(nirNum % BigInt(97));
        keyValid = keyNum === expectedKey;
      }

      res.json({
        ok: true,
        sex,
        birthYear: fullYear,
        birthMonth: monthLabel,
        birthMonthNum: month,
        department: deptStr,
        departmentLabel: deptLabel,
        commune: communeStr,
        order: orderStr,
        keyValid,
        formatted: `${digits[0]} ${yearStr} ${monthStr} ${deptStr} ${communeStr} ${orderStr}${cleaned.length === 15 ? " " + cleaned.slice(13) : ""}`,
      });
    } catch (err) {
      console.error("POST /api/nir/decode error:", err);
      res.status(500).json({ ok: false, message: "Erreur interne" });
    }
  });

  const userSearchCooldowns = new Map<string, number>();
  const USER_SEARCH_COOLDOWN_MS = 10_000;
  const COOLDOWN_EXEMPT_ROLES = new Set(["api", "admin"]);

  const ipDailyFreeSearches = new Map<string, { date: string; count: number }>();
  const IP_FREE_SEARCH_LIMIT = 5;

  function getIpFreeUsage(ip: string): number {
    const today = new Date().toISOString().split("T")[0];
    const entry = ipDailyFreeSearches.get(ip);
    if (!entry || entry.date !== today) return 0;
    return entry.count;
  }

  function incrementIpFreeUsage(ip: string): number {
    const today = new Date().toISOString().split("T")[0];
    const entry = ipDailyFreeSearches.get(ip);
    if (!entry || entry.date !== today) {
      ipDailyFreeSearches.set(ip, { date: today, count: 1 });
      return 1;
    }
    entry.count++;
    return entry.count;
  }

  const API_TOKEN_COOLDOWN_MS = 30_000;

  const apiSlots: Record<string, { lastUsed: number; queue: Array<() => void> }> = {
    leakosint: { lastUsed: 0, queue: [] },
    dalton: { lastUsed: 0, queue: [] },
  };

  function waitForApiSlot(apiName: "leakosint" | "dalton"): Promise<void> {
    const slot = apiSlots[apiName];
    return new Promise((resolve) => {
      const tryExecute = () => {
        const now = Date.now();
        const elapsed = now - slot.lastUsed;
        if (elapsed >= API_TOKEN_COOLDOWN_MS) {
          slot.lastUsed = now;
          resolve();
        } else {
          const waitTime = API_TOKEN_COOLDOWN_MS - elapsed;
          setTimeout(() => {
            slot.lastUsed = Date.now();
            resolve();
          }, waitTime);
        }
      };

      if (slot.queue.length === 0) {
        slot.queue.push(tryExecute);
        tryExecute();
      } else {
        slot.queue.push(tryExecute);
      }
    });
  }

  function releaseApiSlot(apiName: "leakosint" | "dalton") {
    const slot = apiSlots[apiName];
    slot.queue.shift();
    if (slot.queue.length > 0) {
      slot.queue[0]();
    }
  }

  // POST /api/leakosint-search - proxy to LeakOSINT API
  app.post("/api/leakosint-search", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;

      const sub = await storage.getSubscription(userId);
      const userBypassed = sub ? await isUserBypassed(sub.id) : false;

      if (!userBypassed && await storage.isFrozen(userId)) {
        return res.status(403).json({ message: "Votre compte est gele. Contactez un administrateur." });
      }

      const today = new Date().toISOString().split("T")[0];

      const effectiveRole = await getEffectiveRole(userId);
      const isAdmin = effectiveRole === "admin";

      const tier: PlanTier = isAdmin ? "api" : ((sub?.tier as PlanTier) || "free");
      const planInfo = PLAN_LIMITS[tier] || PLAN_LIMITS.free;
      const leakosintLimit = planInfo.dailyLeakosintSearches;

      if (!userBypassed && !isAdmin && leakosintLimit === 0) {
        return res.status(403).json({
          message: "Votre abonnement ne permet pas d'utiliser cette source. Passez a un plan superieur.",
          used: 0,
          limit: 0,
          tier,
        });
      }

      const newCount = await storage.incrementLeakosintDailyUsage(userId, today);

      if (!userBypassed && !isAdmin && newCount > leakosintLimit) {
        return res.status(429).json({
          message: "Limite de recherches Autre Source atteinte pour aujourd'hui.",
          used: newCount,
          limit: leakosintLimit,
          tier,
        });
      }

      const { request: searchRequest, limit: searchLimit, lang } = req.body;
      if (!searchRequest || (typeof searchRequest !== "string" && !Array.isArray(searchRequest))) {
        return res.status(400).json({ message: "Le terme de recherche est requis." });
      }
      if (typeof searchRequest === "string" && (searchRequest.length < 1 || searchRequest.length > 500)) {
        return res.status(400).json({ message: "Le terme doit faire entre 1 et 500 caracteres." });
      }
      if (searchLimit !== undefined && (typeof searchLimit !== "number" || searchLimit < 100 || searchLimit > 10000)) {
        return res.status(400).json({ message: "La limite doit etre entre 100 et 10000." });
      }
      if (lang !== undefined && (typeof lang !== "string" || lang.length > 5)) {
        return res.status(400).json({ message: "Code langue invalide." });
      }

      const leakosintToken = process.env.LEAK_OSINT_API_KEY || process.env.LEAKOSINT_API_KEY;
      if (!leakosintToken) {
        console.error("LEAKOSINT_API_KEY not configured");
        return res.status(500).json({ message: "Service LeakOSINT non configure." });
      }

      await waitForApiSlot("leakosint");

      let response: globalThis.Response;
      try {
        response = await fetch("https://leakosintapi.com/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: leakosintToken,
            request: searchRequest,
            limit: searchLimit || 100,
            lang: lang || "en",
            type: "json",
          }),
          signal: AbortSignal.timeout(45000),
        });
      } catch (fetchErr) {
        releaseApiSlot("leakosint");
        console.error("LeakOSINT API fetch error:", fetchErr);
        const wUser = await buildUserInfo(req);
        if (!wUser.bypassed) webhookLeakosintSearch(wUser, String(searchRequest), 0, "error", "Service injoignable");
        return res.status(502).json({ message: "Impossible de joindre le service LeakOSINT." });
      }

      if (!response.ok) {
        releaseApiSlot("leakosint");
        const errText = await response.text().catch(() => "");
        console.error("LeakOSINT API error:", response.status, errText.slice(0, 300));
        const wUser = await buildUserInfo(req);
        if (response.status === 429) {
          if (!wUser.bypassed) webhookLeakosintSearch(wUser, String(searchRequest), 0, "error", "Rate limit");
          return res.status(429).json({ message: "Limite de requetes LeakOSINT atteinte. Reessayez plus tard." });
        }
        let errMsg = "Erreur du service LeakOSINT.";
        let errReason = "Erreur API";
        try {
          const errData = JSON.parse(errText);
          if (errData.error) { errMsg = `LeakOSINT: ${errData.error}`; errReason = errData.error; }
        } catch {}
        if (!wUser.bypassed) webhookLeakosintSearch(wUser, String(searchRequest), 0, "error", errReason);
        return res.status(502).json({ message: errMsg });
      }

      const data = await response.json() as Record<string, unknown>;
      console.log("[leakosint] Response keys:", Object.keys(data), "Status field:", data["Status"]);

      if (data["Error code"]) {
        releaseApiSlot("leakosint");
        console.error("LeakOSINT API error code:", data["Error code"]);
        const wUser = await buildUserInfo(req);
        if (!wUser.bypassed) webhookLeakosintSearch(wUser, String(searchRequest), 0, "error", String(data["Error code"]));
        return res.status(502).json({ message: `Erreur LeakOSINT: ${data["Error code"]}` });
      }

      if (data["error"]) {
        releaseApiSlot("leakosint");
        console.error("LeakOSINT API error:", data["error"]);
        const wUser = await buildUserInfo(req);
        if (!wUser.bypassed) webhookLeakosintSearch(wUser, String(searchRequest), 0, "error", String(data["error"]));
        return res.status(502).json({ message: `Erreur LeakOSINT: ${data["error"]}` });
      }

      const listData = data["List"] as Record<string, { InfoLeak?: string; Data?: Record<string, unknown>[] }> | undefined;
      const results: Record<string, unknown>[] = [];

      if (!listData && !data["Found"]) {
        releaseApiSlot("leakosint");
        console.warn("[leakosint] No 'List' field in response. Full keys:", Object.keys(data), "Body:", JSON.stringify(data).slice(0, 500));
        const wUser = await buildUserInfo(req);
        if (!wUser.bypassed) webhookLeakosintSearch(wUser, String(searchRequest), 0, "error", "Reponse inattendue");
        return res.status(502).json({ message: "Reponse inattendue du service LeakOSINT. Contactez un administrateur." });
      } else if (listData) {
        for (const [dbName, dbInfo] of Object.entries(listData)) {
          if (dbName === "No results found") continue;
          if (dbInfo.Data && Array.isArray(dbInfo.Data)) {
            for (const row of dbInfo.Data) {
              results.push({ _source: dbName, ...row });
            }
          }
        }
        console.log(`[leakosint] Parsed ${results.length} results from ${Object.keys(listData).length} sources`);
      }

      const wUser = await buildUserInfo(req);
      if (!wUser.bypassed) webhookLeakosintSearch(wUser, String(searchRequest), results.length, "ok");

      releaseApiSlot("leakosint");

      res.json({
        results,
        raw: data,
        source: "leakosint",
        quota: {
          used: newCount,
          limit: leakosintLimit,
          tier,
        },
      });
    } catch (err) {
      releaseApiSlot("leakosint");
      console.error("POST /api/leakosint-search error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/dalton-search - proxy to DaltonAPI (same format as LeakOSINT)
  // Shares the same daily quota as LeakOSINT but does NOT increment it (LeakOSINT already counts for the advanced search)
  // No separate cooldown check here - LeakOSINT route handles cooldown for both (called in parallel from frontend)
  app.post("/api/dalton-search", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;

      const sub = await storage.getSubscription(userId);
      const userBypassed = sub ? await isUserBypassed(sub.id) : false;

      if (!userBypassed && await storage.isFrozen(userId)) {
        return res.status(403).json({ message: "Votre compte est gele. Contactez un administrateur." });
      }

      const today = new Date().toISOString().split("T")[0];

      const effectiveRole = await getEffectiveRole(userId);
      const isAdmin = effectiveRole === "admin";

      const tier: PlanTier = isAdmin ? "api" : ((sub?.tier as PlanTier) || "free");
      const planInfo = PLAN_LIMITS[tier] || PLAN_LIMITS.free;
      const leakosintLimit = planInfo.dailyLeakosintSearches;

      if (!userBypassed && !isAdmin && leakosintLimit === 0) {
        return res.status(403).json({
          message: "Votre abonnement ne permet pas d'utiliser cette source. Passez a un plan superieur.",
          used: 0,
          limit: 0,
          tier,
        });
      }

      const currentUsage = await storage.getLeakosintDailyUsage(userId, today);
      if (!userBypassed && !isAdmin && currentUsage >= leakosintLimit) {
        return res.status(429).json({
          message: "Limite de recherches Autre Source atteinte pour aujourd'hui.",
          used: currentUsage,
          limit: leakosintLimit,
          tier,
        });
      }

      const { request: searchRequest, limit: searchLimit, lang } = req.body;
      if (!searchRequest || (typeof searchRequest !== "string" && !Array.isArray(searchRequest))) {
        return res.status(400).json({ message: "Le terme de recherche est requis." });
      }
      if (typeof searchRequest === "string" && (searchRequest.length < 1 || searchRequest.length > 500)) {
        return res.status(400).json({ message: "Le terme doit faire entre 1 et 500 caracteres." });
      }

      const daltonToken = process.env.DALTON_API_KEY;
      if (!daltonToken) {
        console.error("DALTON_API_KEY not configured");
        return res.status(500).json({ message: "Service DaltonAPI non configure." });
      }

      await waitForApiSlot("dalton");

      let response: globalThis.Response;
      try {
        response = await fetch("https://leakosintapi.com/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: daltonToken,
            request: searchRequest,
            limit: searchLimit || 100,
            lang: lang || "en",
            type: "json",
          }),
          signal: AbortSignal.timeout(45000),
        });
      } catch (fetchErr) {
        releaseApiSlot("dalton");
        console.error("DaltonAPI fetch error:", fetchErr);
        const wUser = await buildUserInfo(req);
        if (!wUser.bypassed) webhookDaltonSearch(wUser, String(searchRequest), 0, "error", "Service injoignable");
        return res.status(502).json({ message: "Impossible de joindre le service DaltonAPI." });
      }

      if (!response.ok) {
        releaseApiSlot("dalton");
        const errText = await response.text().catch(() => "");
        console.error("DaltonAPI error:", response.status, errText.slice(0, 300));
        const wUser = await buildUserInfo(req);
        if (response.status === 429) {
          if (!wUser.bypassed) webhookDaltonSearch(wUser, String(searchRequest), 0, "error", "Rate limit");
          return res.status(429).json({ message: "Limite de requetes DaltonAPI atteinte. Reessayez plus tard." });
        }
        let errMsg = "Erreur du service DaltonAPI.";
        let errReason = "Erreur API";
        try {
          const errData = JSON.parse(errText);
          if (errData.error) { errMsg = `DaltonAPI: ${errData.error}`; errReason = errData.error; }
        } catch {}
        if (!wUser.bypassed) webhookDaltonSearch(wUser, String(searchRequest), 0, "error", errReason);
        return res.status(502).json({ message: errMsg });
      }

      const data = await response.json() as Record<string, unknown>;
      console.log("[dalton] Response keys:", Object.keys(data), "Status field:", data["Status"]);

      if (data["Error code"]) {
        releaseApiSlot("dalton");
        console.error("DaltonAPI error code:", data["Error code"]);
        const wUser = await buildUserInfo(req);
        if (!wUser.bypassed) webhookDaltonSearch(wUser, String(searchRequest), 0, "error", String(data["Error code"]));
        return res.status(502).json({ message: `Erreur DaltonAPI: ${data["Error code"]}` });
      }

      if (data["error"]) {
        releaseApiSlot("dalton");
        console.error("DaltonAPI error:", data["error"]);
        const wUser = await buildUserInfo(req);
        if (!wUser.bypassed) webhookDaltonSearch(wUser, String(searchRequest), 0, "error", String(data["error"]));
        return res.status(502).json({ message: `Erreur DaltonAPI: ${data["error"]}` });
      }

      const listData = data["List"] as Record<string, { InfoLeak?: string; Data?: Record<string, unknown>[] }> | undefined;
      const results: Record<string, unknown>[] = [];

      if (!listData && !data["Found"]) {
        releaseApiSlot("dalton");
        console.warn("[dalton] No 'List' field in response. Full keys:", Object.keys(data), "Body:", JSON.stringify(data).slice(0, 500));
        const wUser = await buildUserInfo(req);
        if (!wUser.bypassed) webhookDaltonSearch(wUser, String(searchRequest), 0, "error", "Reponse inattendue");
        return res.status(502).json({ message: "Reponse inattendue du service DaltonAPI. Contactez un administrateur." });
      } else if (listData) {
        for (const [dbName, dbInfo] of Object.entries(listData)) {
          if (dbName === "No results found") continue;
          if (dbInfo.Data && Array.isArray(dbInfo.Data)) {
            for (const row of dbInfo.Data) {
              results.push({ _source: dbName, ...row });
            }
          }
        }
        console.log(`[dalton] Parsed ${results.length} results from ${Object.keys(listData).length} sources`);
      }

      releaseApiSlot("dalton");

      const wUser = await buildUserInfo(req);
      if (!wUser.bypassed) webhookDaltonSearch(wUser, String(searchRequest), results.length, "ok");

      res.json({
        results,
        raw: data,
        source: "dalton",
        quota: {
          used: currentUsage,
          limit: leakosintLimit,
          tier,
        },
      });
    } catch (err) {
      releaseApiSlot("dalton");
      console.error("POST /api/dalton-search error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public API v1 - search via API key (for API tier users)
  async function callLeakosintInternal(searchTerm: string): Promise<Record<string, unknown>[]> {
    const leakosintToken = process.env.LEAK_OSINT_API_KEY || process.env.LEAKOSINT_API_KEY;
    if (!leakosintToken) return [];
    try {
      await waitForApiSlot("leakosint");
      const response = await fetch("https://leakosintapi.com/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: leakosintToken, request: searchTerm, limit: 100, lang: "en", type: "json" }),
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) { releaseApiSlot("leakosint"); return []; }
      const data = await response.json() as Record<string, unknown>;
      releaseApiSlot("leakosint");
      if (data["Error code"] || data["error"]) return [];
      const listData = data["List"] as Record<string, { Data?: Record<string, unknown>[] }> | undefined;
      const results: Record<string, unknown>[] = [];
      if (listData) {
        for (const [dbName, dbInfo] of Object.entries(listData)) {
          if (dbName === "No results found") continue;
          if (dbInfo.Data && Array.isArray(dbInfo.Data)) {
            for (const row of dbInfo.Data) results.push({ _source: `leakosint:${dbName}`, ...row });
          }
        }
      }
      return results;
    } catch (err) {
      releaseApiSlot("leakosint");
      console.error("[api/v1] LeakOSINT error:", err);
      return [];
    }
  }

  async function callDaltonInternal(searchTerm: string): Promise<Record<string, unknown>[]> {
    const daltonToken = process.env.DALTON_API_KEY;
    if (!daltonToken) return [];
    try {
      await waitForApiSlot("dalton");
      const response = await fetch("https://leakosintapi.com/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: daltonToken, request: searchTerm, limit: 100, lang: "en", type: "json" }),
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok) { releaseApiSlot("dalton"); return []; }
      const data = await response.json() as Record<string, unknown>;
      releaseApiSlot("dalton");
      if (data["Error code"] || data["error"]) return [];
      const listData = data["List"] as Record<string, { Data?: Record<string, unknown>[] }> | undefined;
      const results: Record<string, unknown>[] = [];
      if (listData) {
        for (const [dbName, dbInfo] of Object.entries(listData)) {
          if (dbName === "No results found") continue;
          if (dbInfo.Data && Array.isArray(dbInfo.Data)) {
            for (const row of dbInfo.Data) results.push({ _source: `dalton:${dbName}`, ...row });
          }
        }
      }
      return results;
    } catch (err) {
      releaseApiSlot("dalton");
      console.error("[api/v1] DaltonAPI error:", err);
      return [];
    }
  }

  async function callBreachInternal(searchTerm: string): Promise<Record<string, unknown>[]> {
    const breachApiKey = process.env.BREACH_API_KEY;
    if (!breachApiKey) return [];
    try {
      const response = await fetch("https://breach.vip/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Api-Key": breachApiKey },
        body: JSON.stringify({ term: searchTerm, fields: ["email", "username", "password", "hash", "name", "phone", "ip"], wildcard: true, case_sensitive: false, categories: null }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return [];
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) return [];
      const data = await response.json();
      if (!data.results || !Array.isArray(data.results)) return [];
      return data.results.map((r: Record<string, unknown>) => ({ _source: "breach.vip", ...r }));
    } catch (err) {
      console.error("[api/v1] Breach.vip error:", err);
      return [];
    }
  }

  app.post("/api/v1/search", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers["x-api-key"] || req.headers.authorization?.replace("Bearer ", "");
      if (!authHeader || typeof authHeader !== "string") {
        return res.status(401).json({ error: "Missing API key. Use X-Api-Key header." });
      }

      const validation = await storage.validateApiKeyWithAdmin(authHeader, async (userId) => {
        const role = await getEffectiveRole(userId);
        return role === "admin";
      });
      if (!validation.valid || !validation.userId) {
        return res.status(401).json({ error: "Invalid or revoked API key. API tier subscription required." });
      }

      const apiSub = await storage.getSubscription(validation.userId);
      const apiUserBypassed = apiSub ? await isUserBypassed(apiSub.id) : false;

      if (!apiUserBypassed && await storage.isFrozen(validation.userId)) {
        return res.status(403).json({ error: "Account frozen. Contact an administrator." });
      }

      const request = api.search.perform.input.parse(req.body);

      const searchTerm = request.criteria.map((c: any) => c.value).join(" ");

      const searchStart = Date.now();

      const [internalResult, externalResults, leakosintResults, daltonResults, breachResults] = await Promise.all([
        searchAllIndexes(request.criteria, request.limit, request.offset).catch(err => {
          console.error("[api/v1] Internal search error:", err);
          return { results: [] as Record<string, unknown>[], total: 0 as number | null };
        }),
        callExternalSearchApi(request.criteria).catch(() => [] as Record<string, unknown>[]),
        callLeakosintInternal(searchTerm).catch(() => [] as Record<string, unknown>[]),
        callDaltonInternal(searchTerm).catch(() => [] as Record<string, unknown>[]),
        callBreachInternal(searchTerm).catch(() => [] as Record<string, unknown>[]),
      ]);

      let allResults = [
        ...internalResult.results,
        ...externalResults,
        ...leakosintResults,
        ...daltonResults,
        ...breachResults,
      ];

      if (request.criteria.length > 1) {
        const beforeCount = allResults.length;
        allResults = filterResultsByCriteria(allResults, request.criteria);
        if (allResults.length !== beforeCount) {
          console.log(`[api/v1] Multi-criteria filter: ${beforeCount} -> ${allResults.length}`);
        }
      }

      const total = allResults.length;

      const today = new Date().toISOString().split("T")[0];
      await storage.incrementDailyUsage(validation.userId, today);

      const criteriaStr = request.criteria.map((c: any) => `${c.type}:${c.value}`).join(", ");
      webhookApiSearch(validation.userId, criteriaStr, total);

      console.log(`[api/v1] Search done in ${Date.now() - searchStart}ms — internal: ${internalResult.results.length}, external: ${externalResults.length}, leakosint: ${leakosintResults.length}, dalton: ${daltonResults.length}, breach: ${breachResults.length}, total: ${total}`);

      res.json({
        results: allResults,
        total,
        sources: {
          internal: internalResult.results.length,
          external_proxy: externalResults.length,
          leakosint: leakosintResults.length,
          dalton: daltonResults.length,
          breach: breachResults.length,
        },
      });
    } catch (error: any) {
      console.error("API v1 Search error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Validation error", details: error.errors });
      } else {
        res.status(400).json({ error: error.message || "Search error" });
      }
    }
  });

  app.get("/api/vouches", async (_req, res) => {
    try {
      const vouches = await storage.getVouches();
      res.json(vouches);
    } catch (err) {
      console.error("GET /api/vouches error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/vouches/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const rawId = req.params.id as string;
      const id = parseInt(rawId, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid vouch ID" });
      }
      const deleted = await storage.deleteVouch(id);
      if (!deleted) {
        return res.status(404).json({ message: "Vouch not found" });
      }
      const adminEmail = (req as any).user?.email || "admin";
      webhookVouchDeleted(adminEmail, id);
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/vouches/:id error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/wanted/search", requireAuth, requireRole("pro", "business", "api"), async (req, res) => {
    try {
      const criteria = req.query as Record<string, string>;
      const results = await storage.searchWantedProfiles(criteria);
      res.json(results);
    } catch (err) {
      console.error("GET /api/wanted/search error:", err);
      res.status(500).json({ message: "Erreur lors de la recherche" });
    }
  });

  app.get("/api/admin/wanted-profiles", requireAuth, requireAdmin, async (req, res) => {
    try {
      const profiles = await storage.getWantedProfiles();
      res.json(profiles);
    } catch (err) {
      console.error("GET /api/admin/wanted-profiles error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/wanted-profiles", requireAuth, requireAdmin, async (req, res) => {
    try {
      const profile = await storage.createWantedProfile(req.body);
      res.json(profile);
    } catch (err) {
      console.error("POST /api/admin/wanted-profiles error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/wanted-profiles/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const updated = await storage.updateWantedProfile(id, req.body);
      if (!updated) return res.status(404).json({ message: "Profil introuvable" });
      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/admin/wanted-profiles/:id error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/wanted-profiles/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deleteWantedProfile(id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Profil introuvable" });
      }
    } catch (err) {
      console.error("DELETE /api/admin/wanted-profiles error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dof-profiles", async (_req, res) => {
    try {
      const profiles = await storage.getDofProfiles();
      res.json(profiles);
    } catch (err) {
      console.error("GET /api/dof-profiles error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/dof-profiles", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const profiles = await storage.getDofProfiles();
      res.json(profiles);
    } catch (err) {
      console.error("GET /api/admin/dof-profiles error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/dof-profiles", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { pseudo, description, imageUrl, tier, sortOrder } = req.body;
      if (!pseudo || typeof pseudo !== "string" || pseudo.trim().length === 0) {
        return res.status(400).json({ message: "Le pseudo est obligatoire" });
      }
      if (tier && !["diamant", "platine", "label"].includes(tier)) {
        return res.status(400).json({ message: "Tier invalide" });
      }
      const profile = await storage.createDofProfile({
        pseudo: pseudo.trim(),
        description: description || "",
        imageUrl: imageUrl || "",
        tier: tier || "platine",
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      });
      res.json(profile);
    } catch (err) {
      console.error("POST /api/admin/dof-profiles error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/dof-profiles/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const { pseudo, description, imageUrl, tier, sortOrder } = req.body;
      if (tier && !["diamant", "platine", "label"].includes(tier)) {
        return res.status(400).json({ message: "Tier invalide" });
      }
      const update: Record<string, any> = {};
      if (pseudo !== undefined) update.pseudo = String(pseudo).trim();
      if (description !== undefined) update.description = String(description);
      if (imageUrl !== undefined) update.imageUrl = String(imageUrl);
      if (tier !== undefined) update.tier = tier;
      if (sortOrder !== undefined) update.sortOrder = typeof sortOrder === "number" ? sortOrder : 0;
      const profile = await storage.updateDofProfile(id, update);
      if (profile) {
        res.json(profile);
      } else {
        res.status(404).json({ message: "Profil introuvable" });
      }
    } catch (err) {
      console.error("PATCH /api/admin/dof-profiles error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/dof-profiles/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });
      const deleted = await storage.deleteDofProfile(id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Profil introuvable" });
      }
    } catch (err) {
      console.error("DELETE /api/admin/dof-profiles error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/dof-profiles/bulk", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { profiles } = req.body;
      if (!Array.isArray(profiles)) return res.status(400).json({ message: "profiles array required" });
      const created = [];
      for (const p of profiles) {
        const profile = await storage.createDofProfile(p);
        created.push(profile);
      }
      res.json(created);
    } catch (err) {
      console.error("POST /api/admin/dof-profiles/bulk error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/_deploy-file", (req: Request, res: Response) => {
    const secret = req.query.s;
    if (secret !== "xK9mBridge2026") {
      return res.status(404).json({ error: "Not found" });
    }
    const allowedFiles: Record<string, string> = {
      "bridge": "vps-bridge/server.js",
      "search": "server/searchSqlite.ts",
      "routes": "server/routes.ts",
      "schema": "shared/schema.ts",
      "webhook": "server/webhook.ts",
    };
    const fileKey = (req.query.f as string) || "bridge";
    const relPath = allowedFiles[fileKey];
    if (!relPath) {
      return res.status(404).json({ error: "Unknown file" });
    }
    const filePath = path.join(process.cwd(), relPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    res.setHeader("Content-Type", "text/plain");
    res.send(fs.readFileSync(filePath, "utf-8"));
  });

  app.post("/api/xeuledoc", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const sub = await storage.getSubscription(userId);
      const tier = (sub?.tier as string) || "free";
      const TIER_ORDER_X: Record<string, number> = { free: 0, vip: 1, pro: 2, business: 3, api: 4 };
      const tierLevel = TIER_ORDER_X[tier] ?? 0;
      const isAdmin = (req as any).user?.role === "admin";
      if (!isAdmin && tierLevel < 1) {
        return res.status(403).json({ message: "Google OSINT necessite un abonnement VIP minimum." });
      }

      const { url: docUrl } = req.body;
      if (!docUrl || typeof docUrl !== "string") {
        return res.status(400).json({ message: "URL manquante." });
      }

      const dMatch = docUrl.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
      const eMatch = docUrl.match(/\/e\/([a-zA-Z0-9_-]{20,})/);
      const foldersMatch = docUrl.match(/\/folders\/([a-zA-Z0-9_-]{20,})/);
      const idMatch = docUrl.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
      const urlParts = docUrl.split("?")[0].split("/");
      const lengthMatch = urlParts.find((part: string) => /^[a-zA-Z0-9_-]+$/.test(part) && (part.length === 33 || part.length === 44));
      const docId = dMatch?.[1] || eMatch?.[1] || foldersMatch?.[1] || idMatch?.[1] || lengthMatch;
      if (!docId) {
        return res.status(400).json({ message: "ID du document introuvable. Vérifiez que le lien est un Google Docs, Slides, Sheets, Forms ou Drive valide." });
      }

      const fields = [
        "alternateLink", "createdDate", "modifiedDate",
        "permissions(id,name,emailAddress,domain,role,additionalRoles,photoLink,type,withLink)",
        "userPermission(id,name,emailAddress,domain,role,additionalRoles,photoLink,type,withLink)",
      ].join(",");
      const apiUrl = `https://clients6.google.com/drive/v2beta/files/${docId}?fields=${encodeURIComponent(fields)}&supportsTeamDrives=true&enforceSingleParent=true&key=AIzaSyC1eQ1xj69IdTMeii5r7brs3R90eck-m7k`;

      let data: any = null;
      const maxRetries = 5;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const resp = await fetch(apiUrl, {
          headers: { "X-Origin": "https://drive.google.com" },
        });
        const text = await resp.text();

        if (text.includes("File not found")) {
          return res.status(404).json({ message: "Ce fichier n'existe pas ou n'est pas public." });
        }
        if (text.includes("rateLimitExceeded")) {
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          return res.status(429).json({ message: "Rate limit Google dépassé. Réessayez dans quelques instants." });
        }

        try {
          data = JSON.parse(text);
        } catch {
          return res.status(500).json({ message: "Réponse invalide de l'API Google." });
        }
        break;
      }

      if (!data) {
        return res.status(500).json({ message: "Impossible de récupérer les informations du document." });
      }

      const owner = data.permissions?.find((p: any) => p.role === "owner");
      const createdDate = data.createdDate || null;
      const modifiedDate = data.modifiedDate || null;

      const publicPerms: string[] = [];
      for (const perm of data.permissions || []) {
        if (perm.id === "anyoneWithLink" || perm.id === "anyone") {
          publicPerms.push(perm.role);
          if (perm.additionalRoles) publicPerms.push(...perm.additionalRoles);
        }
      }

      const result: Record<string, any> = {
        documentId: docId,
        createdDate,
        modifiedDate,
        publicPermissions: publicPerms,
      };

      if (owner) {
        result.owner = {
          name: owner.name || null,
          email: owner.emailAddress || null,
          googleId: owner.id || null,
          photoLink: owner.photoLink || null,
        };
      }

      const userEmail = (req as any).user?.email || "inconnu";
      console.log(`[xeuledoc] User ${userEmail} (${userId}) searched: ${docUrl} => owner: ${result.owner?.email || "not found"}`);

      res.json(result);
    } catch (err) {
      console.error("POST /api/xeuledoc error:", err);
      res.status(500).json({ message: "Erreur interne." });
    }
  });

  const SHERLOCK_SITES: Array<{
    name: string;
    url: string;
    errorType: "status_code" | "message";
    errorMsg?: string | string[];
    urlProbe?: string;
    category: string;
  }> = [
    { name: "Instagram", url: "https://www.instagram.com/{}/", errorType: "status_code", category: "Social" },
    { name: "Twitter/X", url: "https://x.com/{}", errorType: "status_code", category: "Social" },
    { name: "TikTok", url: "https://tiktok.com/@{}", errorType: "status_code", category: "Social" },
    { name: "GitHub", url: "https://www.github.com/{}", errorType: "status_code", category: "Dev" },
    { name: "Reddit", url: "https://www.reddit.com/user/{}", errorType: "status_code", category: "Social" },
    { name: "YouTube", url: "https://www.youtube.com/@{}", errorType: "status_code", category: "Social" },
    { name: "Twitch", url: "https://www.twitch.tv/{}", errorType: "status_code", category: "Gaming" },
    { name: "Steam", url: "https://steamcommunity.com/id/{}", errorType: "message", errorMsg: "The specified profile could not be found.", category: "Gaming" },
    { name: "Spotify", url: "https://open.spotify.com/user/{}", errorType: "status_code", category: "Music" },
    { name: "Pinterest", url: "https://www.pinterest.com/{}/", errorType: "status_code", category: "Social" },
    { name: "Snapchat", url: "https://www.snapchat.com/add/{}", errorType: "status_code", category: "Social" },
    { name: "SoundCloud", url: "https://soundcloud.com/{}", errorType: "status_code", category: "Music" },
    { name: "GitLab", url: "https://gitlab.com/{}", errorType: "status_code", category: "Dev" },
    { name: "Medium", url: "https://medium.com/@{}", errorType: "status_code", category: "Blog" },
    { name: "Behance", url: "https://www.behance.net/{}", errorType: "status_code", category: "Design" },
    { name: "DeviantArt", url: "https://www.deviantart.com/{}", errorType: "status_code", category: "Design" },
    { name: "Flickr", url: "https://www.flickr.com/people/{}", errorType: "status_code", category: "Photo" },
    { name: "Roblox", url: "https://www.roblox.com/user.aspx?username={}", errorType: "status_code", category: "Gaming" },
    { name: "9GAG", url: "https://www.9gag.com/u/{}", errorType: "status_code", category: "Social" },
    { name: "About.me", url: "https://about.me/{}", errorType: "status_code", category: "Social" },
    { name: "BuyMeACoffee", url: "https://www.buymeacoffee.com/{}", errorType: "status_code", category: "Social" },
    { name: "CashApp", url: "https://cash.app/{}", errorType: "status_code", category: "Finance" },
    { name: "Chess.com", url: "https://www.chess.com/member/{}", errorType: "message", errorMsg: "Username is valid", urlProbe: "https://www.chess.com/callback/user/valid?username={}", category: "Gaming" },
    { name: "Codecademy", url: "https://www.codecademy.com/profiles/{}", errorType: "status_code", category: "Dev" },
    { name: "DailyMotion", url: "https://www.dailymotion.com/{}", errorType: "status_code", category: "Video" },
    { name: "Dribbble", url: "https://dribbble.com/{}", errorType: "status_code", category: "Design" },
    { name: "Duolingo", url: "https://www.duolingo.com/profile/{}", errorType: "status_code", category: "Education" },
    { name: "Fiverr", url: "https://www.fiverr.com/{}", errorType: "status_code", category: "Freelance" },
    { name: "HackerRank", url: "https://hackerrank.com/{}", errorType: "status_code", category: "Dev" },
    { name: "Imgur", url: "https://imgur.com/user/{}", errorType: "status_code", category: "Photo" },
    { name: "Keybase", url: "https://keybase.io/{}", errorType: "status_code", category: "Security" },
    { name: "Kick", url: "https://kick.com/{}", errorType: "status_code", category: "Streaming" },
    { name: "Letterboxd", url: "https://letterboxd.com/{}", errorType: "status_code", category: "Film" },
    { name: "Lichess", url: "https://lichess.org/@/{}", errorType: "status_code", category: "Gaming" },
    { name: "Linktree", url: "https://linktr.ee/{}", errorType: "status_code", category: "Social" },
    { name: "Mastodon", url: "https://mastodon.social/@{}", errorType: "status_code", category: "Social" },
    { name: "MyAnimeList", url: "https://myanimelist.net/profile/{}", errorType: "status_code", category: "Anime" },
    { name: "NPM", url: "https://www.npmjs.com/~{}", errorType: "status_code", category: "Dev" },
    { name: "Patreon", url: "https://www.patreon.com/{}", errorType: "status_code", category: "Social" },
    { name: "Replit", url: "https://replit.com/@{}", errorType: "status_code", category: "Dev" },
    { name: "Telegram", url: "https://t.me/{}", errorType: "message", errorMsg: "If you have <strong>Telegram</strong>, you can contact", category: "Messaging" },
    { name: "Trello", url: "https://trello.com/{}", errorType: "status_code", category: "Productivity" },
    { name: "Tumblr", url: "https://{}.tumblr.com", errorType: "status_code", category: "Blog" },
    { name: "VK", url: "https://vk.com/{}", errorType: "status_code", category: "Social" },
    { name: "VSCO", url: "https://vsco.co/{}/gallery", errorType: "status_code", category: "Photo" },
    { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/User:{}", errorType: "status_code", category: "Encyclopedia" },
    { name: "Xbox Gamertag", url: "https://xboxgamertag.com/search/{}", errorType: "status_code", category: "Gaming" },
    { name: "Bluesky", url: "https://bsky.app/profile/{}.bsky.social", errorType: "status_code", urlProbe: "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor={}.bsky.social", category: "Social" },
  ];

  app.post("/api/sherlock", requireAuth, async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      if (!username || typeof username !== "string") {
        return res.status(400).json({ message: "Nom d'utilisateur manquant." });
      }

      const cleaned = username.trim().replace(/^@/, "");
      if (!/^[a-zA-Z0-9_.-]{1,40}$/.test(cleaned)) {
        return res.status(400).json({ message: "Nom d'utilisateur invalide. Utilisez uniquement lettres, chiffres, tirets, points et underscores." });
      }

      const userId = (req as any).user.id;
      const userEmail = (req as any).user?.email || "inconnu";

      const sub = await storage.getSubscription(userId);
      const tier = (sub?.tier as string) || "free";
      const TIER_ORDER_S: Record<string, number> = { free: 0, vip: 1, pro: 2, business: 3, api: 4 };
      const tierLevel = TIER_ORDER_S[tier] ?? 0;
      const isAdmin = (req as any).user?.role === "admin";

      if (!isAdmin && tierLevel < 1) {
        return res.status(403).json({ message: "Sherlock necessite un abonnement VIP minimum." });
      }

      const blEntries = await storage.getBlacklistEntries();
      const isBlacklisted = blEntries.some((entry) => {
        const blPseudo = (entry.pseudo || "").trim().toLowerCase();
        return blPseudo && blPseudo === cleaned.toLowerCase();
      });
      if (isBlacklisted) {
        return res.status(403).json({ message: "Ce pseudo est protege et ne peut pas etre recherche." });
      }

      console.log(`[sherlock] User ${userEmail} (${userId}) searching username: ${cleaned}`);

      const results: Array<{ name: string; url: string; found: boolean; category: string }> = [];
      const TIMEOUT_MS = 8000;
      const CONCURRENCY = 15;

      const checkSite = async (site: typeof SHERLOCK_SITES[number]) => {
        const profileUrl = site.url.replace("{}", cleaned);
        const probeUrl = (site.urlProbe || site.url).replace("{}", cleaned);
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
          const resp = await fetch(probeUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5",
            },
            redirect: "follow",
          });
          clearTimeout(timer);

          if (site.errorType === "status_code") {
            if (resp.status >= 200 && resp.status < 400) {
              results.push({ name: site.name, url: profileUrl, found: true, category: site.category });
            }
          } else if (site.errorType === "message" && site.errorMsg) {
            const text = await resp.text();
            const msgs = Array.isArray(site.errorMsg) ? site.errorMsg : [site.errorMsg];
            const hasError = msgs.some(m => text.includes(m));
            if (!hasError && resp.status < 400) {
              results.push({ name: site.name, url: profileUrl, found: true, category: site.category });
            }
          }
        } catch {
        }
      };

      for (let i = 0; i < SHERLOCK_SITES.length; i += CONCURRENCY) {
        const batch = SHERLOCK_SITES.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(checkSite));
      }

      results.sort((a, b) => a.name.localeCompare(b.name));
      console.log(`[sherlock] Username "${cleaned}" found on ${results.length} sites`);

      res.json({
        username: cleaned,
        found: results.length,
        total: SHERLOCK_SITES.length,
        results,
      });
    } catch (err) {
      console.error("POST /api/sherlock error:", err);
      res.status(500).json({ message: "Erreur interne." });
    }
  });

  const exifUpload = multer({
    dest: "/tmp/exif-uploads",
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/tiff", "image/bmp", "image/svg+xml",
        "application/pdf", "video/mp4", "video/quicktime", "video/x-msvideo", "audio/mpeg", "audio/wav",
        "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (allowed.includes(file.mimetype) || file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/") || file.mimetype.startsWith("audio/")) {
        cb(null, true);
      } else {
        cb(new Error("Type de fichier non supporte."));
      }
    },
  });

  app.post("/api/exiftool", requireAuth, exifUpload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier envoye." });
      }
      const filePath = req.file.path;
      try {
        const tags = await exiftool.read(filePath);
        const metadata: Record<string, string> = {};
        const skipKeys = new Set(["SourceFile", "errors", "Warning"]);
        for (const [key, value] of Object.entries(tags)) {
          if (skipKeys.has(key) || value === undefined || value === null || value === "") continue;
          const strVal = typeof value === "object" ? JSON.stringify(value) : String(value);
          if (strVal && strVal !== "undefined" && strVal !== "null") {
            metadata[key] = strVal;
          }
        }
        res.json({
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          metadata,
          metadataCount: Object.keys(metadata).length,
        });
      } finally {
        fs.unlink(filePath, () => {});
      }
    } catch (err) {
      console.error("POST /api/exiftool error:", err);
      res.status(500).json({ message: "Erreur lors de l'extraction des metadonnees." });
    }
  });

  return httpServer;
}
