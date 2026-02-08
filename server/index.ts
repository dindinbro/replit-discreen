import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startDiscordBot } from "./discord-bot";
import { storage } from "./storage";
import { webhookSubscriptionExpired } from "./webhook";

const app = express();
const httpServer = createServer(app);

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

app.use("/api/", globalLimiter);
app.use("/api/search", searchLimiter);
app.use("/api/breach-search", searchLimiter);
app.use("/api/leakosint-search", searchLimiter);
app.use("/api/v1/search", searchLimiter);

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
  startDiscordBot().catch((err) => {
    log(`Discord bot failed to start: ${err}`, "discord");
  });

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
