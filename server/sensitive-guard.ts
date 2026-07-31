import type { Request, Response, NextFunction } from "express";

/**
 * Kill switch for every module tied to leaked-data search, sensitive
 * external sources (LeakOSINT/Breach.vip/Dalton/VPS bridge/username OSINT),
 * payments, or person-lookup features. Nothing below is deleted — set
 * ENABLE_SENSITIVE_FEATURES=true (and provide the relevant secrets) to
 * re-enable once those integrations are properly reviewed/authorized.
 */
export const SENSITIVE_FEATURES_ENABLED = process.env.ENABLE_SENSITIVE_FEATURES === "true";

const SENSITIVE_PATH_PREFIXES = [
  // Data-dump / leak search
  "/api/search",
  "/api/filters",
  "/api/search-quota",
  "/api/leakosint-quota",
  "/api/breach-search",
  "/api/leakosint-search",
  "/api/dalton-search",
  "/api/v1/search",
  "/api/categories",
  "/api/admin/categories",
  // Person lookup / OSINT
  "/api/phone/lookup",
  "/api/geoip",
  "/api/nir/decode",
  "/api/xeuledoc",
  "/api/sherlock",
  "/api/whatsmyname",
  "/api/holehe",
  "/api/exiftool",
  "/api/wanted",
  "/api/admin/wanted-profiles",
  "/api/dof-profiles",
  "/api/admin/dof-profiles",
  "/api/disx",
  // Payments / subscriptions / monetized API access
  "/api/create-invoice",
  "/api/create-service-invoice",
  "/api/nowpayments",
  "/api/payment",
  "/api/license-by-order",
  "/api/redeem-key",
  "/api/subscription",
  "/api/discount",
  "/api/api-keys",
  "/api/admin/crypto-payments",
  "/api/admin/license-keys",
  "/api/admin/generate-key",
  "/api/admin/subscriptions",
  "/api/admin/revoke-subscription",
  "/api/admin/discount-codes",
  // Discord mass-join task bot
  "/api/discord-task",
  // Data-removal / blacklist management (operates on the disabled search index)
  "/api/blacklist",
  "/api/info-request",
  "/api/admin/blacklist",
  "/api/admin/info-requests",
  "/api/admin/blocked-ips",
  // Search logging / bypass whitelist
  "/api/admin/search-logs",
  "/api/superadmin/search-logs",
  "/api/superadmin/bypass",
];

export function sensitiveFeatureGuard(req: Request, res: Response, next: NextFunction) {
  if (SENSITIVE_FEATURES_ENABLED) return next();
  const isSensitive = SENSITIVE_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix));
  if (isSensitive) {
    return res.status(503).json({
      message: "Cette fonctionnalité est désactivée sur cet environnement.",
    });
  }
  next();
}

/**
 * Always blocked, regardless of the flag above: this is a hardcoded-secret
 * arbitrary source-file disclosure endpoint, not a legitimate feature.
 */
export function blockDeployFileBackdoor(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/api/_deploy-file") {
    return res.status(404).json({ error: "Not found" });
  }
  next();
}
