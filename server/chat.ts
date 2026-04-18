import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import { storage } from "./storage";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Sanitize message: strip HTML tags, trim
function sanitize(msg: string): string {
  return msg.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim().slice(0, 500);
}

export function initChatServer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Non authentifié"));
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) return next(new Error("Token invalide"));
      const user = data.user;
      const sub = await storage.getOrCreateSubscription(user.id);
      const username =
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Anonyme";
      (socket as any).userId = user.id;
      (socket as any).username = username;
      (socket as any).avatarUrl = user.user_metadata?.avatar_url ?? null;
      (socket as any).tier = sub?.tier ?? "free";
      (socket as any).isAdmin = (sub as any)?.role === "admin";
      next();
    } catch (err) {
      next(new Error("Erreur authentification"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId: string = (socket as any).userId;
    const username: string = (socket as any).username;
    const avatarUrl: string | null = (socket as any).avatarUrl;
    const tier: string = (socket as any).tier;

    try {
      const history = await storage.getChatHistory(60);
      socket.emit("chat:history", history);
    } catch {}

    socket.on("chat:message", async (data: { message: string }) => {
      try {
        const raw = typeof data?.message === "string" ? data.message : "";
        const message = sanitize(raw);
        if (!message) return;

        // Check mute
        const mute = await storage.getMute(userId);
        if (mute) {
          if (!mute.mutedUntil || mute.mutedUntil > new Date()) {
            socket.emit("chat:error", { message: "Tu es muté." + (mute.reason ? ` Raison : ${mute.reason}` : "") });
            return;
          } else {
            await storage.removeMute(userId);
          }
        }

        // Rate limit
        if (isRateLimited(userId)) {
          socket.emit("chat:error", { message: "Tu envoies trop vite. Attends quelques secondes." });
          return;
        }

        const saved = await storage.saveChatMessage({ userId, username, avatarUrl: avatarUrl ?? undefined, tier, message });
        io.emit("chat:message", saved);
      } catch {}
    });

    // Admin events
    socket.on("chat:delete", async (data: { id: number }) => {
      if (!(socket as any).isAdmin) { socket.emit("chat:error", { message: "Accès refusé" }); return; }
      try {
        await storage.deleteChatMessage(data.id);
        io.emit("chat:deleted", { id: data.id });
      } catch {}
    });

    socket.on("chat:mute", async (data: { userId: string; reason?: string; durationMinutes?: number }) => {
      if (!(socket as any).isAdmin) { socket.emit("chat:error", { message: "Accès refusé" }); return; }
      try {
        const until = data.durationMinutes ? new Date(Date.now() + data.durationMinutes * 60_000) : undefined;
        await storage.setMute(data.userId, data.reason, until);
        io.emit("chat:muted", { userId: data.userId });
      } catch {}
    });

    socket.on("chat:unmute", async (data: { userId: string }) => {
      if (!(socket as any).isAdmin) { socket.emit("chat:error", { message: "Accès refusé" }); return; }
      try {
        await storage.removeMute(data.userId);
        io.emit("chat:unmuted", { userId: data.userId });
      } catch {}
    });

    socket.on("chat:clear", async () => {
      if (!(socket as any).isAdmin) { socket.emit("chat:error", { message: "Accès refusé" }); return; }
      try {
        await storage.clearChatMessages();
        io.emit("chat:cleared");
      } catch {}
    });
  });

  console.log("[chat] Socket.IO chat server initialized");
  return io;
}
