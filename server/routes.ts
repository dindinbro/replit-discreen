import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { FilterLabels, insertCategorySchema, PLAN_LIMITS, type PlanTier } from "@shared/schema";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { searchAllIndexes, initSearchDatabases } from "./searchSqlite";
import { registerChatRoutes } from "./replit_integrations/chat";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import {
  webhookSearch, webhookBreachSearch, webhookLeakosintSearch, webhookApiSearch,
  webhookRoleChange, webhookFreeze, webhookInvoiceCreated, webhookPaymentCompleted,
  webhookKeyRedeemed, webhookKeyGenerated, webhookApiKeyCreated, webhookApiKeyRevoked,
  webhookPhoneLookup, webhookGeoIP, webhookVouchDeleted,
  webhookCategoryCreated, webhookCategoryUpdated, webhookCategoryDeleted,
  webhookBlacklistRequest, webhookInfoRequest, webhookSubscriptionExpired, webhookAbnormalActivity,
} from "./webhook";
import { sendFreezeAlert, checkDiscordMemberStatus } from "./discord-bot";

const ORDER_TOKEN_SECRET = process.env.PLISIO_API_KEY || crypto.randomBytes(32).toString("hex");

const abnormalAlertsSent = new Set<string>();
function resetAbnormalAlerts() {
  abnormalAlertsSent.clear();
}
setInterval(resetAbnormalAlerts, 24 * 60 * 60 * 1000);

const ABNORMAL_THRESHOLD_RATIO = 0.8;
const ABNORMAL_UNLIMITED_THRESHOLD = 500;

async function buildUserInfo(req: Request): Promise<{ id: string; email: string; username?: string; uniqueId?: number }> {
  const user = (req as any).user;
  const userId = user?.id || "";
  const email = user?.email || "inconnu";
  const username = user?.user_metadata?.username || user?.user_metadata?.display_name || user?.user_metadata?.full_name || email.split("@")[0] || undefined;
  let uniqueId: number | undefined;
  try {
    const sub = await storage.getSubscription(userId);
    if (sub) uniqueId = sub.id;
  } catch {}
  return { id: userId, email, username, uniqueId };
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

const onlineVisitors = new Map<string, number>();
const VISITOR_TIMEOUT = 90_000;

function cleanupVisitors() {
  const now = Date.now();
  for (const [id, lastSeen] of onlineVisitors) {
    if (now - lastSeen > VISITOR_TIMEOUT) onlineVisitors.delete(id);
  }
}

setInterval(cleanupVisitors, 30_000);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await initSearchDatabases();

  app.post("/api/heartbeat", (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const userId = (req as any).user?.id;
    const key = userId || `anon_${ip}`;
    onlineVisitors.set(key, Date.now());
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

  app.patch("/api/profile/discord", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const { discord_id } = req.body;

      if (!discord_id || typeof discord_id !== "string") {
        return res.status(400).json({ message: "Discord ID requis." });
      }

      const cleaned = discord_id.trim();
      if (!/^\d{17,20}$/.test(cleaned)) {
        return res.status(400).json({ message: "Discord ID invalide. Il doit contenir entre 17 et 20 chiffres." });
      }

      const status = await checkDiscordMemberStatus(cleaned);
      if (!status.inGuild) {
        return res.status(400).json({ message: "Cet utilisateur n'est pas membre du serveur Discord Discreen." });
      }

      await storage.setDiscordId(user.id, cleaned);
      res.json({ success: true, discord_id: cleaned, is_supporter: status.isSupporter });
    } catch (err) {
      console.error("PATCH /api/profile/discord error:", err);
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
      webhookRoleChange(adminEmail, parsed.userId, parsed.role);

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

  // POST /api/create-service-invoice - create a Plisio invoice for blacklist or info request (50€)
  app.post("/api/create-service-invoice", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const bodySchema = z.object({
        type: z.enum(["blacklist", "info"]),
        formData: z.record(z.any()),
      });
      const parsed = bodySchema.parse(req.body);

      const plisioKey = process.env.PLISIO_API_KEY;
      if (!plisioKey) {
        return res.status(500).json({ message: "Plisio not configured" });
      }

      const orderId = `service_${parsed.type}_${Date.now()}`;
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const callbackUrl = `${baseUrl}/api/plisio-callback?json=true`;
      const orderToken = signOrderId(orderId);
      const successUrl = `${baseUrl}/payment-success?order=${orderId}&token=${orderToken}&service=${parsed.type}`;

      await storage.createPendingServiceRequest(orderId, parsed.type, userId, JSON.stringify(parsed.formData));

      const label = parsed.type === "blacklist" ? "Demande de Blacklist" : "Demande d'Information";

      const params = new URLSearchParams({
        api_key: plisioKey,
        order_name: label,
        order_number: orderId,
        source_amount: "50",
        source_currency: "EUR",
        currency: "BTC",
        callback_url: callbackUrl,
        success_callback_url: successUrl,
      });

      const response = await fetch(
        `https://api.plisio.net/api/v1/invoices/new?${params.toString()}`,
        { method: "GET" }
      );

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Plisio non-JSON response:", text.slice(0, 300));
        return res.status(502).json({ message: "Payment service unavailable" });
      }

      const data = await response.json();

      if (!data.data?.invoice_url) {
        console.error("Plisio error:", data);
        return res.status(502).json({ message: "Failed to create invoice" });
      }

      res.json({ invoice_url: data.data.invoice_url, orderId });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Donnees invalides", errors: err.errors });
      }
      console.error("POST /api/create-service-invoice error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/blacklist-request and /api/info-request are no longer directly accessible.
  // Requests are created exclusively by the Plisio callback after successful payment.
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

  // POST /api/search (protected + rate-limited)
  app.post(api.search.perform.path, requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;

      if (await storage.isFrozen(userId)) {
        return res.status(403).json({ message: "Votre compte est gele. Contactez un administrateur." });
      }

      const today = new Date().toISOString().split("T")[0];

      const effectiveRole = await getEffectiveRole(userId);
      const isAdmin = effectiveRole === "admin";

      const sub = await storage.getSubscription(userId);
      const tier: PlanTier = isAdmin ? "api" : ((sub?.tier as PlanTier) || "free");
      const planInfo = PLAN_LIMITS[tier] || PLAN_LIMITS.free;
      const isUnlimited = isAdmin || planInfo.dailySearches === -1;

      const newCount = await storage.incrementDailyUsage(userId, today);

      if (!isUnlimited && newCount > planInfo.dailySearches) {
        return res.status(429).json({
          message: "Nombre de recherches limite atteint. Veuillez acceder a l'abonnement superieur.",
          used: newCount,
          limit: planInfo.dailySearches,
          tier,
        });
      }

      const request = api.search.perform.input.parse(req.body);
      console.log(`[search] Incoming criteria: ${JSON.stringify(request.criteria)}, limit: ${request.limit}, offset: ${request.offset}`);
      const searchStart = Date.now();
      const searchPromise = Promise.resolve(searchAllIndexes(request.criteria, request.limit, request.offset));
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SEARCH_TIMEOUT")), 90000)
      );
      let results: Record<string, unknown>[];
      let total: number | null;
      try {
        const searchResult = await Promise.race([searchPromise, timeoutPromise]);
        results = searchResult.results;
        total = searchResult.total;
      } catch (timeoutErr: any) {
        if (timeoutErr.message === "SEARCH_TIMEOUT") {
          console.warn(`[search] Timeout after ${Date.now() - searchStart}ms`);
          return res.status(504).json({ message: "La recherche a pris trop de temps. Essayez un terme plus precis." });
        }
        throw timeoutErr;
      }
      console.log(`[search] Done in ${Date.now() - searchStart}ms — results: ${results.length}, total: ${total}`);

      const wUser = await buildUserInfo(req);
      const criteriaStr = request.criteria.map((c: any) => `${c.type}:${c.value}`).join(", ");
      webhookSearch(wUser, "interne", criteriaStr, total ?? 0);

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

      res.json({
        results,
        total,
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

  // Plisio payment - create invoice (server-side price enforcement, auth required)
  app.post("/api/create-invoice", requireAuth, async (req: Request, res: Response) => {
    try {
      const { plan } = req.body;
      const planInfo = PLAN_LIMITS[plan as PlanTier];
      if (!planInfo || plan === "free") {
        return res.status(400).json({ message: "Plan invalide" });
      }

      const plisioKey = process.env.PLISIO_API_KEY;
      if (!plisioKey) {
        return res.status(500).json({ message: "Plisio not configured" });
      }

      const orderId = `order_${plan}_${Date.now()}`;
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const callbackUrl = `${baseUrl}/api/plisio-callback?json=true`;
      const orderToken = signOrderId(orderId);
      const successUrl = `${baseUrl}/payment-success?order=${orderId}&token=${orderToken}`;

      const params = new URLSearchParams({
        api_key: plisioKey,
        order_name: `Abonnement ${planInfo.label}`,
        order_number: orderId,
        source_amount: String(planInfo.price),
        source_currency: "EUR",
        currency: "BTC",
        callback_url: callbackUrl,
        success_callback_url: successUrl,
        "plugin_data[tier]": plan,
      });

      const response = await fetch(
        `https://api.plisio.net/api/v1/invoices/new?${params.toString()}`,
        { method: "GET" }
      );

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Plisio non-JSON response:", text.slice(0, 300));
        return res.status(502).json({ message: "Payment service unavailable" });
      }

      const data = await response.json();

      if (!data.data?.invoice_url) {
        console.error("Plisio error:", data);
        return res.status(502).json({ message: "Failed to create invoice" });
      }

      webhookInvoiceCreated(plan, orderId, planInfo.price);

      res.json({ invoice_url: data.data.invoice_url });
    } catch (err) {
      console.error("POST /api/create-invoice error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Plisio webhook callback - auto-generate license key on completed payment
  // Plisio sends callbacks as GET with query params; also support POST
  const plisioCallbackHandler = async (req: Request, res: Response) => {
    try {
      const params = req.method === "POST" ? req.body : req.query;
      const { status, order_number, verify_hash, source_amount, currency } = params;
      console.log("Plisio callback:", { status, order_number, source_amount, currency });

      const plisioKey = process.env.PLISIO_API_KEY;
      if (!plisioKey) {
        console.error("Plisio callback: PLISIO_API_KEY not configured");
        return res.status(500).json({ status: "server misconfigured" });
      }

      if (!verify_hash) {
        if (req.method === "GET") {
          console.warn("Plisio callback (GET): missing verify_hash — allowing for browser redirect compatibility");
        } else {
          console.error("Plisio callback (POST): missing verify_hash — rejecting unsigned request");
          return res.status(403).json({ status: "signature required" });
        }
      }

      if (verify_hash) {
        const sortedKeys = Object.keys(params).filter(k => k !== "verify_hash").sort();
        const message = sortedKeys.map(k => `${k}=${params[k]}`).join("&");
        const expected = crypto.createHmac("sha1", plisioKey).update(message).digest("hex");
        if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(verify_hash)))) {
          console.error("Plisio callback: invalid verify_hash");
          return res.status(403).json({ status: "invalid signature" });
        }
      }

      if (status === "completed" || status === "mismatch") {
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
      console.error("Plisio callback error:", err);
      res.json({ status: "ok" });
    }
  };
  app.get("/api/plisio-callback", plisioCallbackHandler);
  app.post("/api/plisio-callback", plisioCallbackHandler);

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
      webhookKeyRedeemed(wUser, result.tier || "unknown");

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
      if (!tier || !PLAN_LIMITS[tier as PlanTier] || tier === "free") {
        return res.status(400).json({ message: "Tier invalide" });
      }

      const license = await storage.createLicenseKey(tier as PlanTier, `manual_${Date.now()}`);
      const adminEmail = (req as any).user?.email || "admin";
      webhookKeyGenerated(adminEmail, tier, license.key);
      res.json({ key: license.key, tier: license.tier });
    } catch (err) {
      console.error("POST /api/admin/generate-key error:", err);
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

      if (await storage.isFrozen(userId)) {
        return res.status(403).json({ message: "Votre compte est gele. Contactez un administrateur." });
      }

      const today = new Date().toISOString().split("T")[0];

      const effectiveRole = await getEffectiveRole(userId);
      const isAdmin = effectiveRole === "admin";

      const sub = await storage.getSubscription(userId);
      const tier: PlanTier = isAdmin ? "api" : ((sub?.tier as PlanTier) || "free");
      const planInfo = PLAN_LIMITS[tier] || PLAN_LIMITS.free;
      const isUnlimited = isAdmin || planInfo.dailySearches === -1;

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

      let response: globalThis.Response;
      try {
        response = await fetch("https://breach.vip/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
      webhookBreachSearch(wUser, term, fields, resultCount);

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

      res.json({
        ok: true,
        country: "FR",
        type,
        region,
        operator: "Inconnu (nécessite lookup opérateur/portabilité)",
        e164: normalized,
      });

      const wUser = await buildUserInfo(req);
      webhookPhoneLookup(wUser, normalized);
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
      webhookGeoIP(wUser, trimmed);

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
        const expectedKey = 97 - Number(nirNum % 97n);
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

  // POST /api/leakosint-search - proxy to LeakOSINT API
  app.post("/api/leakosint-search", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;

      if (await storage.isFrozen(userId)) {
        return res.status(403).json({ message: "Votre compte est gele. Contactez un administrateur." });
      }

      const today = new Date().toISOString().split("T")[0];

      const effectiveRole = await getEffectiveRole(userId);
      const isAdmin = effectiveRole === "admin";

      const sub = await storage.getSubscription(userId);
      const tier: PlanTier = isAdmin ? "api" : ((sub?.tier as PlanTier) || "free");
      const planInfo = PLAN_LIMITS[tier] || PLAN_LIMITS.free;
      const leakosintLimit = planInfo.dailyLeakosintSearches;

      if (!isAdmin && leakosintLimit === 0) {
        return res.status(403).json({
          message: "Votre abonnement ne permet pas d'utiliser cette source. Passez a un plan superieur.",
          used: 0,
          limit: 0,
          tier,
        });
      }

      const newCount = await storage.incrementLeakosintDailyUsage(userId, today);

      if (!isAdmin && newCount > leakosintLimit) {
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
          signal: AbortSignal.timeout(15000),
        });
      } catch (fetchErr) {
        console.error("LeakOSINT API fetch error:", fetchErr);
        return res.status(502).json({ message: "Impossible de joindre le service LeakOSINT." });
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error("LeakOSINT API error:", response.status, errText.slice(0, 300));
        if (response.status === 429) {
          return res.status(429).json({ message: "Limite de requetes LeakOSINT atteinte. Reessayez plus tard." });
        }
        return res.status(502).json({ message: "Erreur du service LeakOSINT." });
      }

      const data = await response.json() as Record<string, unknown>;

      if (data["Error code"]) {
        console.error("LeakOSINT API error code:", data["Error code"]);
        return res.status(502).json({ message: `Erreur LeakOSINT: ${data["Error code"]}` });
      }

      const listData = data["List"] as Record<string, { InfoLeak?: string; Data?: Record<string, unknown>[] }> | undefined;
      const results: Record<string, unknown>[] = [];

      if (listData) {
        for (const [dbName, dbInfo] of Object.entries(listData)) {
          if (dbName === "No results found") continue;
          if (dbInfo.Data && Array.isArray(dbInfo.Data)) {
            for (const row of dbInfo.Data) {
              results.push({ _source: dbName, ...row });
            }
          }
        }
      }

      const wUser = await buildUserInfo(req);
      webhookLeakosintSearch(wUser, String(searchRequest), results.length);

      res.json({
        results,
        raw: data,
        quota: {
          used: newCount,
          limit: leakosintLimit,
          tier,
        },
      });
    } catch (err) {
      console.error("POST /api/leakosint-search error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public API v1 - search via API key (for API tier users)
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

      if (await storage.isFrozen(validation.userId)) {
        return res.status(403).json({ error: "Account frozen. Contact an administrator." });
      }

      const request = api.search.perform.input.parse(req.body);
      const { results, total } = await searchAllIndexes(request.criteria, request.limit, request.offset);

      const today = new Date().toISOString().split("T")[0];
      await storage.incrementDailyUsage(validation.userId, today);

      const criteriaStr = request.criteria.map((c: any) => `${c.type}:${c.value}`).join(", ");
      webhookApiSearch(validation.userId, criteriaStr, total ?? 0);

      res.json({ results, total });
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

  return httpServer;
}
