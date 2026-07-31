import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import { storage } from "./storage";
import type { RequestHandler } from "express";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Rate limiting: max 5 messages per 10s per user
const rateLimitMap = new Map<string, number[]>();
const MAX_MSGS = 5;
const WINDOW_MS = 10_000;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter(t => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_MSGS) return true;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
}

function sanitize(msg: string): string {
  return msg.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim().slice(0, 500);
}

export function initChatServer(httpServer: HttpServer, sessionMiddleware?: RequestHandler) {
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  // Attach express-session to Socket.IO engine so WebSocket upgrade requests
  // get their session parsed — required for V2 (username/password) users.
  if (sessionMiddleware) {
    io.engine.use(sessionMiddleware);
  }

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      const req = socket.request as any;

      // ── Path 1: V2 session-based auth ────────────────────────────────────
      const sessionUserId: number | undefined = req.session?.authUserId;
      if (sessionUserId) {
        const userRow = await storage.getUser(sessionUserId);
        if (!userRow) {
          console.warn("[chat] V2 auth rejected: user not found for session userId", sessionUserId);
          return next(new Error("Utilisateur introuvable"));
        }
        const username = (req.session?.authUsername as string | undefined) || userRow.username || "Anonyme";
        const avatarUrl: string | null = (userRow as any).avatar_url ?? null;
        // Use String(userId) so the rest of the handler is uniform
        const userIdStr = String(userRow.id);
        const isAdmin = userRow.role === "admin";
        (socket as any).userId = userIdStr;
        (socket as any).username = username;
        (socket as any).avatarUrl = avatarUrl;
        (socket as any).tier = isAdmin ? "admin" : (userRow.role ?? "free");
        (socket as any).isAdmin = isAdmin;
        console.log(`[chat] V2 session auth OK: ${username} (${userIdStr}) tier=${(socket as any).tier}`);
        return next();
      }

      // ── Path 2: Supabase JWT auth (legacy / Supabase users) ──────────────
      if (!token) {
        console.warn("[chat] Auth rejected: no token and no session");
        return next(new Error("Non authentifié"));
      }
      if (!supabase) {
        console.warn("[chat] Auth rejected: Supabase not configured");
        return next(new Error("Supabase non configuré"));
      }
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        console.warn("[chat] Auth rejected: invalid token —", error?.message);
        return next(new Error("Token invalide"));
      }
      const user = data.user;
      const sub = await storage.getOrCreateSubscription(user.id);
      // Fetch profile role from Supabase (admin role lives in profiles table, not subscriptions)
      const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const isAdmin = profileData?.role === "admin";
      const username =
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Anonyme";
      (socket as any).userId = user.id;
      (socket as any).username = username;
      (socket as any).avatarUrl = user.user_metadata?.avatar_url ?? null;
      // Use "admin" as tier if user has admin role so the badge displays correctly
      (socket as any).tier = isAdmin ? "admin" : ((sub as any)?.tier ?? "free");
      (socket as any).isAdmin = isAdmin;
      console.log(`[chat] Supabase auth OK: ${username} (${user.id}) tier=${(socket as any).tier} isAdmin=${isAdmin}`);
      next();
    } catch (err) {
      console.error("[chat] Auth error:", err);
      next(new Error("Erreur authentification"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId: string = (socket as any).userId;
    const username: string = (socket as any).username;
    const avatarUrl: string | null = (socket as any).avatarUrl;
    const tier: string = (socket as any).tier;

    console.log(`[chat] Connected: ${username} (${socket.id})`);

    try {
      const history = await storage.getChatHistory(60);
      socket.emit("chat:history", history);
    } catch (err) {
      console.error("[chat] Failed to load history:", err);
    }

    socket.on("chat:message", async (data: { message: string }) => {
      try {
        const raw = typeof data?.message === "string" ? data.message : "";
        const message = sanitize(raw);
        if (!message) return;

        // Check mute
        try {
          const mute = await storage.getMute(userId);
          if (mute) {
            if (!mute.mutedUntil || mute.mutedUntil > new Date()) {
              socket.emit("chat:error", { message: "Tu es muté." + (mute.reason ? ` Raison : ${mute.reason}` : "") });
              return;
            } else {
              await storage.removeMute(userId);
            }
          }
        } catch (muteErr) {
          console.warn("[chat] Mute check failed (non-fatal):", muteErr);
        }

        // Rate limit
        if (isRateLimited(userId)) {
          socket.emit("chat:error", { message: "Tu envoies trop vite. Attends quelques secondes." });
          return;
        }

        const saved = await storage.saveChatMessage({ userId, username, avatarUrl: avatarUrl ?? undefined, tier, message });
        console.log(`[chat] Message saved id=${saved.id} from ${username}: ${message.slice(0, 50)}`);
        io.emit("chat:message", saved);
      } catch (err) {
        console.error("[chat] Message handler error:", err);
        socket.emit("chat:error", { message: "Erreur lors de l'envoi du message." });
      }
    });

    socket.on("chat:delete", async (data: { id: number }) => {
      if (!(socket as any).isAdmin) { socket.emit("chat:error", { message: "Accès refusé" }); return; }
      try {
        await storage.deleteChatMessage(data.id);
        io.emit("chat:deleted", { id: data.id });
      } catch (err) {
        console.error("[chat] Delete error:", err);
      }
    });

    socket.on("chat:mute", async (data: { userId: string; reason?: string; durationMinutes?: number }) => {
      if (!(socket as any).isAdmin) { socket.emit("chat:error", { message: "Accès refusé" }); return; }
      try {
        const until = data.durationMinutes ? new Date(Date.now() + data.durationMinutes * 60_000) : undefined;
        await storage.setMute(data.userId, data.reason, until);
        io.emit("chat:muted", { userId: data.userId });
      } catch (err) {
        console.error("[chat] Mute error:", err);
      }
    });

    socket.on("chat:unmute", async (data: { userId: string }) => {
      if (!(socket as any).isAdmin) { socket.emit("chat:error", { message: "Accès refusé" }); return; }
      try {
        await storage.removeMute(data.userId);
        io.emit("chat:unmuted", { userId: data.userId });
      } catch (err) {
        console.error("[chat] Unmute error:", err);
      }
    });

    socket.on("chat:clear", async () => {
      if (!(socket as any).isAdmin) { socket.emit("chat:error", { message: "Accès refusé" }); return; }
      try {
        await storage.clearChatMessages();
        io.emit("chat:cleared");
      } catch (err) {
        console.error("[chat] Clear error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[chat] Disconnected: ${username} (${socket.id})`);
    });
  });

  console.log("[chat] Socket.IO chat server initialized");
  return io;
}
