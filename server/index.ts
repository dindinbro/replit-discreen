import "dotenv/config";

function checkRequiredEnv() {
  const required: { key: string; alt?: string }[] = [
    { key: "DATABASE_URL" },
    { key: "VITE_SUPABASE_URL", alt: "SUPABASE_URL" },
    { key: "VITE_SUPABASE_ANON_KEY" },
    { key: "SUPABASE_SERVICE_ROLE_KEY" },
  ];
  const missing: string[] = [];
  for (const { key, alt } of required) {
    if (!process.env[key] && !(alt && process.env[alt])) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    console.error(`[env] Missing required environment variables: ${missing.join(", ")}`);
    console.error(`[env] Copy .env.example to .env and fill in the values.`);
    process.exit(1);
  }
}
checkRequiredEnv();

import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startDiscordBot } from "./discord-bot";
import { startTaskBot } from "./task-bot";
import { startLinksBot } from "./links-bot";
import { storage } from "./storage";
import { pool } from "./db";
import { webhookSubscriptionExpired } from "./webhook";

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : undefined,
  /\.replit\.dev$/,
  /\.repl\.co$/,
].filter(Boolean) as (string | RegExp)[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === "string") return origin === allowed;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    if (isAllowed) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requetes. Reessayez dans une minute." },
  validate: { xForwardedForHeader: false, trustProxy: false },
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de recherches. Reessayez dans une minute." },
  validate: { xForwardedForHeader: false, trustProxy: false },
});

const heartbeatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requetes heartbeat." },
  validate: { xForwardedForHeader: false, trustProxy: false },
});

const invoiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de demandes de paiement. Reessayez dans une minute." },
  validate: { xForwardedForHeader: false, trustProxy: false },
});

app.use("/api/", globalLimiter);
app.use("/api/heartbeat", heartbeatLimiter);
app.use("/api/search", searchLimiter);
app.use("/api/breach-search", searchLimiter);
app.use("/api/leakosint-search", searchLimiter);
app.use("/api/v1/search", searchLimiter);
app.use("/api/create-invoice", invoiceLimiter);
app.use("/api/create-service-invoice", invoiceLimiter);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const blocked = /\.(db|sqlite|sqlite3|sql|db-wal|db-shm)(\?.*)?$/i;
  const blockedPaths = /^\/(server|data|migrations|node_modules)\//i;
  if (blocked.test(req.path) || blockedPaths.test(req.path)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  if (process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT) {
    log("Skipping Discord bot on Replit (bot runs on VPS only)", "discord");
  } else {
    startDiscordBot().catch((err) => {
      log(`Discord bot failed to start: ${err}`, "discord");
    });
    startTaskBot().catch((err) => {
      log(`Task bot failed to start: ${err}`, "task-bot");
    });
    startLinksBot().catch((err) => {
      log(`Links bot failed to start: ${err}`, "links-bot");
    });
  }

  setInterval(async () => {
    try {
      const count = await storage.expireSubscriptions();
      if (count > 0) {
        log(`Expired ${count} subscription(s)`, "cron");
        webhookSubscriptionExpired(count);
      }
    } catch (err) {
      log(`Subscription expiry check error: ${err}`, "cron");
    }
  }, 5 * 60 * 1000);

  const apiKeyStatus = [
    { key: "LEAK_OSINT_API_KEY", label: "LeakOSINT" },
    { key: "LEAKOSINT_API_KEY", label: "LeakOSINT (alt)" },
    { key: "EXTERNAL_PROXY_SECRET", label: "External Proxy" },
    { key: "VPS_BRIDGE_SECRET", label: "VPS Bridge" },
    { key: "VPS_SEARCH_URL", label: "VPS Search URL" },
  ].map(({ key, label }) => `${label}: ${process.env[key] ? "OK" : "MISSING"}`);
  log(`API config: ${apiKeyStatus.join(", ")}`);

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
