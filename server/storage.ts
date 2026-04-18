import {
  users, categories, subscriptions, dailyUsage, apiKeys, vouches, licenseKeys,
  blacklistRequests, blacklistEntries, infoRequests, pendingServiceRequests,
  wantedProfiles, siteSettings, discordLinkCodes, dofProfiles, activeSessions,
  blockedIps, referralCodes, referralEvents, loginLogs, gameScores, discountCodes, gameBoosts,
  searchLogs, reviews, gameLogs,
  type User, type InsertUser, type Category, type InsertCategory,
  type Subscription, type ApiKey, type PlanTier, type Vouch, type InsertVouch,
  type LicenseKey, type BlacklistRequest, type InsertBlacklistRequest,
  type BlacklistEntry, type InsertBlacklistEntry,
  type InfoRequest, type InsertInfoRequest, type PendingServiceRequest,
  type WantedProfile, type InsertWantedProfile,
  type DiscordLinkCode, type DofProfile, type InsertDofProfile,
  type ActiveSession, type BlockedIp,
  type ReferralCode, type ReferralEvent, type LoginLog,
  type DiscountCode, type GameBoost, type ServiceStatus,
  type SearchLog, type InsertSearchLog, type Review, type InsertReview,
  type GameLog, type InsertGameLog,
  serviceStatus,
  PLAN_LIMITS,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, asc, desc, sql, lte, gte, count } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  getSubscription(userId: string): Promise<Subscription | undefined>;
  getOrCreateSubscription(userId: string): Promise<Subscription>;
  getSubscriptionByUniqueId(uniqueId: number): Promise<Subscription | undefined>;
  upsertSubscription(userId: string, tier: PlanTier): Promise<Subscription>;
  getDailyUsage(userId: string, date: string): Promise<number>;
  incrementDailyUsage(userId: string, date: string): Promise<number>;
  resetDailyUsage(userId: string): Promise<void>;
  getLeakosintDailyUsage(userId: string, date: string): Promise<number>;
  incrementLeakosintDailyUsage(userId: string, date: string): Promise<number>;
  checkSearchAllowed(userId: string, isAdmin?: boolean): Promise<{ allowed: boolean; used: number; limit: number; tier: PlanTier }>;
  createApiKey(userId: string, name: string): Promise<{ key: string; apiKey: ApiKey }>;
  getApiKeysByUser(userId: string): Promise<ApiKey[]>;
  validateApiKey(rawKey: string): Promise<{ valid: boolean; userId?: string; tier?: PlanTier }>;
  revokeApiKey(id: number, userId: string): Promise<boolean>;
  setFrozen(userId: string, frozen: boolean): Promise<boolean>;
  isFrozen(userId: string): Promise<boolean>;
  createVouch(vouch: InsertVouch): Promise<Vouch>;
  getVouches(): Promise<Vouch[]>;
  getVouchByDiscordUser(discordUserId: string): Promise<Vouch | undefined>;
  deleteVouch(id: number): Promise<boolean>;
  createLicenseKey(tier: PlanTier, orderId?: string, isLifetime?: boolean): Promise<LicenseKey>;
  redeemLicenseKey(key: string, userId: string): Promise<{ success: boolean; tier?: PlanTier; message: string }>;
  getLicenseKeys(): Promise<LicenseKey[]>;
  getLicenseKeyByOrder(orderId: string): Promise<LicenseKey | undefined>;
  expireSubscriptions(): Promise<{ count: number; expired: typeof subscriptions.$inferSelect[] }>;
  createBlacklistRequest(data: InsertBlacklistRequest): Promise<BlacklistRequest>;
  getBlacklistRequests(): Promise<BlacklistRequest[]>;
  updateBlacklistRequestStatus(id: number, status: string, adminNotes?: string): Promise<BlacklistRequest | undefined>;
  createBlacklistEntry(data: InsertBlacklistEntry): Promise<BlacklistEntry>;
  getBlacklistEntries(): Promise<BlacklistEntry[]>;
  updateBlacklistEntry(id: number, data: Partial<InsertBlacklistEntry>): Promise<BlacklistEntry | undefined>;
  deleteBlacklistEntry(id: number): Promise<boolean>;
  checkBlacklist(values: string[]): Promise<BlacklistEntry[]>;
  createInfoRequest(data: InsertInfoRequest): Promise<InfoRequest>;
  getInfoRequests(): Promise<InfoRequest[]>;
  updateInfoRequestStatus(id: number, status: string, adminNotes?: string): Promise<InfoRequest | undefined>;
  markInfoRequestPaid(orderId: string): Promise<InfoRequest | undefined>;
  createPendingServiceRequest(orderId: string, type: string, userId: string | null, formData: string): Promise<PendingServiceRequest>;
  getPendingServiceRequest(orderId: string): Promise<PendingServiceRequest | undefined>;
  markPendingServiceRequestPaid(orderId: string): Promise<PendingServiceRequest | undefined>;
  setDiscordId(userId: string, discordId: string): Promise<Subscription | undefined>;
  clearDiscordId(userId: string): Promise<void>;
  getDiscordId(userId: string): Promise<string | null>;
  createWantedProfile(data: InsertWantedProfile): Promise<WantedProfile>;
  getWantedProfiles(): Promise<WantedProfile[]>;
  getWantedProfileById(id: number): Promise<WantedProfile | undefined>;
  updateWantedProfile(id: number, data: Partial<InsertWantedProfile>): Promise<WantedProfile | undefined>;
  deleteWantedProfile(id: number): Promise<boolean>;
  searchWantedProfiles(criteria: Record<string, string>): Promise<WantedProfile[]>;
  getAllSubscriptions(): Promise<Subscription[]>;
  revokeSubscription(userId: string): Promise<boolean>;
  deleteUserData(userId: string): Promise<void>;
  getSiteSetting(key: string): Promise<string | null>;
  setSiteSetting(key: string, value: string): Promise<void>;
  createDiscordLinkCode(userId: string): Promise<string>;
  consumeDiscordLinkCode(code: string): Promise<{ userId: string } | null>;
  getSubscriptionByDiscordId(discordId: string): Promise<Subscription | undefined>;
  getDofProfiles(): Promise<DofProfile[]>;
  getDofProfileById(id: number): Promise<DofProfile | undefined>;
  createDofProfile(data: InsertDofProfile): Promise<DofProfile>;
  updateDofProfile(id: number, data: Partial<InsertDofProfile>): Promise<DofProfile | undefined>;
  deleteDofProfile(id: number): Promise<boolean>;
  createSession(userId: string, sessionToken: string, ipAddress?: string, userAgent?: string): Promise<ActiveSession>;
  getActiveSessionCount(userId: string): Promise<number>;
  getActiveSessions(userId: string): Promise<ActiveSession[]>;
  validateSession(userId: string, sessionToken: string): Promise<boolean>;
  touchSession(sessionToken: string): Promise<void>;
  removeSession(sessionToken: string): Promise<void>;
  removeAllSessions(userId: string): Promise<void>;
  removeOldestSession(userId: string): Promise<void>;
  cleanupStaleSessions(maxAgeMinutes?: number): Promise<number>;
  getSessionsByIp(ipAddress: string): Promise<ActiveSession[]>;
  getBlockedIps(): Promise<BlockedIp[]>;
  isIpBlocked(ip: string): Promise<boolean>;
  blockIp(ipAddress: string, reason: string, blockedBy: string): Promise<BlockedIp>;
  unblockIp(id: string): Promise<void>;
  getOrCreateReferralCode(userId: string): Promise<ReferralCode>;
  getReferralCodeByCode(code: string): Promise<ReferralCode | undefined>;
  getReferralStats(userId: string): Promise<{ code: string; totalCredits: number; referralCount: number }>;
  recordReferralEvent(referrerId: string, refereeId: string, orderId: string): Promise<ReferralEvent>;
  creditReferral(orderId: string): Promise<boolean>;
  storeReferralForOrder(orderId: string, referrerUserId: string, refereeUserId: string): Promise<void>;
  getPendingReferral(orderId: string): Promise<{ referrerId: string; refereeId: string } | null>;
  setReferralCredits(userId: string, credits: number): Promise<void>;
  createLoginLog(data: { userId: string; email?: string; username?: string; ip: string; userAgent?: string; provider: string; tier: string; discordId?: string }): Promise<void>;
  getLoginLogs(limit?: number): Promise<LoginLog[]>;
  submitGameScore(userId: string, username: string, score: number): Promise<void>;
  getGameLeaderboard(): Promise<Array<{ userId: string; username: string; score: number; rank: number }>>;
  getUserBestScore(userId: string): Promise<number>;
  getUserGameCredits(userId: string): Promise<{ total: number; gamesPlayed: number }>;
  adminResetUserGameData(userId: string): Promise<void>;
  adminSetUserGameScore(userId: string, username: string, score: number): Promise<void>;
  getAllDiscountCodes(): Promise<DiscountCode[]>;
  getDiscountCodeByCode(code: string): Promise<DiscountCode | null>;
  createDiscountCode(data: { code: string; discountPercent: number; maxUses?: number | null; createdBy: string; active?: boolean; expiresAt?: Date | null }): Promise<DiscountCode>;
  updateDiscountCode(id: number, data: Partial<{ active: boolean; maxUses: number | null; expiresAt: Date | null; discountPercent: number }>): Promise<DiscountCode | null>;
  deleteDiscountCode(id: number): Promise<boolean>;
  incrementDiscountCodeUsage(id: number): Promise<void>;
  storeDiscountForOrder(orderId: string, codeId: number, discountPercent: number): Promise<void>;
  getDiscountForOrder(orderId: string): Promise<{ codeId: number; code: string; discountPercent: number } | null>;
  getAllGameBoosts(): Promise<GameBoost[]>;
  getGameBoostByCode(code: string): Promise<GameBoost | null>;
  createGameBoost(data: { name: string; code: string; multiplier: number; maxUses?: number | null; createdBy: string; active?: boolean; expiresAt?: Date | null }): Promise<GameBoost>;
  updateGameBoost(id: number, data: Partial<{ name: string; active: boolean; maxUses: number | null; expiresAt: Date | null; multiplier: number }>): Promise<GameBoost | null>;
  deleteGameBoost(id: number): Promise<boolean>;
  incrementGameBoostUsage(id: number): Promise<void>;
  getAllServiceStatus(): Promise<ServiceStatus[]>;
  createServiceStatus(data: { name: string; description?: string; status?: string; latencyMs?: number | null; uptime?: string; sortOrder?: number }): Promise<ServiceStatus>;
  updateServiceStatus(id: number, data: Partial<{ name: string; description: string; status: string; latencyMs: number | null; uptime: string; sortOrder: number }>): Promise<ServiceStatus | null>;
  deleteServiceStatus(id: number): Promise<boolean>;
  getRecentSubscriptionActivity(): Promise<{ tier: string; createdAt: Date }[]>;
  createSearchLog(data: InsertSearchLog): Promise<void>;
  getSearchLogs(filters: { userId?: string; searchType?: string; dateFrom?: string; dateTo?: string; query?: string; page?: number; limit?: number }): Promise<{ rows: SearchLog[]; total: number }>;
  createReview(data: InsertReview & { userId: string; username?: string; email?: string; subscriptionTier?: string; verified?: boolean }): Promise<Review>;
  getApprovedReviews(page?: number, limit?: number): Promise<{ rows: Review[]; total: number }>;
  getAdminReviews(filters: { status?: string; page?: number; limit?: number }): Promise<{ rows: Review[]; total: number }>;
  updateReviewStatus(id: number, status: string, reviewedBy?: string): Promise<Review | undefined>;
  deleteReview(id: number): Promise<boolean>;
  getUserReview(userId: string): Promise<Review | undefined>;
  createGameLog(data: InsertGameLog): Promise<void>;
  getGameLogs(filters: { userId?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }): Promise<{ rows: GameLog[]; total: number }>;
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): string {
  const prefix = "dsk";
  const random = crypto.randomBytes(24).toString("hex");
  return `${prefix}_${random}`;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [cat] = await db.select().from(categories).where(eq(categories.id, id));
    return cat;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [cat] = await db.insert(categories).values(category).returning();
    return cat;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const [cat] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return cat;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return sub;
  }

  async getOrCreateSubscription(userId: string): Promise<Subscription> {
    const existing = await this.getSubscription(userId);
    if (existing) return existing;
    const [created] = await db
      .insert(subscriptions)
      .values({ userId, tier: "free" })
      .returning();
    return created;
  }

  async getSubscriptionByUniqueId(uniqueId: number): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, uniqueId));
    return sub;
  }

  async upsertSubscription(userId: string, tier: PlanTier, expiresAt?: Date): Promise<Subscription> {
    const existing = await this.getSubscription(userId);
    const setData: any = { tier };
    if (expiresAt !== undefined) setData.expiresAt = expiresAt;
    if (existing) {
      const [updated] = await db
        .update(subscriptions)
        .set(setData)
        .where(eq(subscriptions.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(subscriptions)
      .values({ userId, tier, ...(expiresAt ? { expiresAt } : {}) })
      .returning();
    return created;
  }

  async getDailyUsage(userId: string, date: string): Promise<number> {
    const [row] = await db
      .select()
      .from(dailyUsage)
      .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.usageDate, date)));
    return row?.searchCount ?? 0;
  }

  async incrementDailyUsage(userId: string, date: string): Promise<number> {
    const [result] = await db
      .insert(dailyUsage)
      .values({ userId, usageDate: date, searchCount: 1 })
      .onConflictDoUpdate({
        target: [dailyUsage.userId, dailyUsage.usageDate],
        set: { searchCount: sql`${dailyUsage.searchCount} + 1` },
      })
      .returning();
    return result.searchCount;
  }

  async resetDailyUsage(userId: string): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    await db
      .update(dailyUsage)
      .set({ searchCount: 0, leakosintCount: 0 })
      .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.usageDate, today)));
  }

  async getLeakosintDailyUsage(userId: string, date: string): Promise<number> {
    const [row] = await db
      .select({ leakosintCount: dailyUsage.leakosintCount })
      .from(dailyUsage)
      .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.usageDate, date)));
    return row?.leakosintCount ?? 0;
  }

  async incrementLeakosintDailyUsage(userId: string, date: string): Promise<number> {
    const [result] = await db
      .insert(dailyUsage)
      .values({ userId, usageDate: date, searchCount: 0, leakosintCount: 1 })
      .onConflictDoUpdate({
        target: [dailyUsage.userId, dailyUsage.usageDate],
        set: { leakosintCount: sql`${dailyUsage.leakosintCount} + 1` },
      })
      .returning();
    return result.leakosintCount;
  }

  async checkSearchAllowed(userId: string, isAdmin?: boolean): Promise<{ allowed: boolean; used: number; limit: number; tier: PlanTier }> {
    if (isAdmin) {
      const today = new Date().toISOString().split("T")[0];
      const used = await this.getDailyUsage(userId, today);
      return { allowed: true, used, limit: -1, tier: "api" as PlanTier };
    }

    const sub = await this.getSubscription(userId);
    const tier = (sub?.tier as PlanTier) || "free";
    const planInfo = PLAN_LIMITS[tier] || PLAN_LIMITS.free;

    if (planInfo.dailySearches === -1) {
      const today = new Date().toISOString().split("T")[0];
      const used = await this.getDailyUsage(userId, today);
      return { allowed: true, used, limit: -1, tier };
    }

    const today = new Date().toISOString().split("T")[0];
    const used = await this.getDailyUsage(userId, today);
    return {
      allowed: used < planInfo.dailySearches,
      used,
      limit: planInfo.dailySearches,
      tier,
    };
  }

  async createApiKey(userId: string, name: string): Promise<{ key: string; apiKey: ApiKey }> {
    const raw = generateApiKey();
    const hashed = hashKey(raw);
    const prefix = raw.slice(0, 8);

    const [apiKey] = await db
      .insert(apiKeys)
      .values({ userId, keyHash: hashed, keyPrefix: prefix, name })
      .returning();

    return { key: raw, apiKey };
  }

  async getApiKeysByUser(userId: string): Promise<ApiKey[]> {
    return db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.revoked, false)));
  }

  async validateApiKey(rawKey: string): Promise<{ valid: boolean; userId?: string; tier?: PlanTier }> {
    const hashed = hashKey(rawKey);
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hashed), eq(apiKeys.revoked, false)));

    if (!key) return { valid: false };

    const sub = await this.getSubscription(key.userId);
    const tier = (sub?.tier as PlanTier) || "free";

    if (tier === "api") {
      return { valid: true, userId: key.userId, tier };
    }

    return { valid: false };
  }

  async validateApiKeyWithAdmin(rawKey: string, checkAdmin: (userId: string) => Promise<boolean>): Promise<{ valid: boolean; userId?: string; tier?: PlanTier }> {
    const hashed = hashKey(rawKey);
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hashed), eq(apiKeys.revoked, false)));

    if (!key) return { valid: false };

    const isAdmin = await checkAdmin(key.userId);
    if (isAdmin) {
      return { valid: true, userId: key.userId, tier: "api" };
    }

    const sub = await this.getSubscription(key.userId);
    const tier = (sub?.tier as PlanTier) || "free";

    if (tier === "api") {
      return { valid: true, userId: key.userId, tier };
    }

    return { valid: false };
  }

  async revokeApiKey(id: number, userId: string): Promise<boolean> {
    const result = await db
      .update(apiKeys)
      .set({ revoked: true })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async setFrozen(userId: string, frozen: boolean): Promise<boolean> {
    const existing = await this.getSubscription(userId);
    if (existing) {
      const updateData: any = { frozen };

      if (frozen) {
        updateData.frozenAt = new Date();
      } else if (existing.frozenAt && existing.expiresAt) {
        const frozenDuration = Date.now() - new Date(existing.frozenAt).getTime();
        if (frozenDuration > 0) {
          updateData.expiresAt = new Date(new Date(existing.expiresAt).getTime() + frozenDuration);
        }
        updateData.frozenAt = null;
      }

      await db
        .update(subscriptions)
        .set(updateData)
        .where(eq(subscriptions.userId, userId));
      return true;
    }
    await db
      .insert(subscriptions)
      .values({ userId, tier: "free", frozen });
    return true;
  }

  async isFrozen(userId: string): Promise<boolean> {
    const sub = await this.getSubscription(userId);
    return sub?.frozen ?? false;
  }

  async createVouch(vouch: InsertVouch): Promise<Vouch> {
    const [created] = await db.insert(vouches).values(vouch).returning();
    return created;
  }

  async getVouches(): Promise<Vouch[]> {
    return db.select().from(vouches).orderBy(desc(vouches.createdAt));
  }

  async getVouchByDiscordUser(discordUserId: string): Promise<Vouch | undefined> {
    const [v] = await db.select().from(vouches).where(eq(vouches.discordUserId, discordUserId));
    return v;
  }

  async deleteVouch(id: number): Promise<boolean> {
    const result = await db.delete(vouches).where(eq(vouches.id, id)).returning();
    return result.length > 0;
  }

  async createLicenseKey(tier: PlanTier, orderId?: string, isLifetime?: boolean): Promise<LicenseKey> {
    const prefix = isLifetime ? "LFT" : "DSC";
    const key = `${prefix}-${tier.toUpperCase()}-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;

    const values: any = { key, tier };
    if (orderId) values.orderId = orderId;

    if (orderId) {
      const [created] = await db
        .insert(licenseKeys)
        .values(values)
        .onConflictDoNothing({ target: licenseKeys.orderId })
        .returning();
      if (!created) {
        const [existing] = await db.select().from(licenseKeys).where(eq(licenseKeys.orderId, orderId));
        return existing;
      }
      return created;
    }

    const [created] = await db
      .insert(licenseKeys)
      .values(values)
      .returning();
    return created;
  }

  async redeemLicenseKey(key: string, userId: string): Promise<{ success: boolean; tier?: PlanTier; message: string }> {
    const [updated] = await db
      .update(licenseKeys)
      .set({ used: true, usedBy: userId, usedAt: new Date() })
      .where(and(eq(licenseKeys.key, key.trim()), eq(licenseKeys.used, false)))
      .returning();

    if (!updated) {
      const [existing] = await db.select().from(licenseKeys).where(eq(licenseKeys.key, key.trim()));
      if (!existing) {
        return { success: false, message: "Cle invalide ou introuvable." };
      }
      return { success: false, message: "Cette cle a deja ete utilisee." };
    }

    const tier = updated.tier as PlanTier;
    if (!PLAN_LIMITS[tier]) {
      return { success: false, message: "Tier invalide pour cette cle." };
    }

    const isLifetime = key.trim().startsWith("LFT-") ||
      (updated.orderId && updated.orderId.includes("_lifetime_"));

    if (isLifetime) {
      const farFuture = new Date("2099-12-31T23:59:59Z");
      await this.upsertSubscription(userId, tier, farFuture);
      return { success: true, tier, message: `Abonnement ${PLAN_LIMITS[tier].label} Lifetime active a vie.` };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await this.upsertSubscription(userId, tier, expiresAt);

    return { success: true, tier, message: `Abonnement ${PLAN_LIMITS[tier].label} active pour 30 jours.` };
  }

  async getLicenseKeys(): Promise<LicenseKey[]> {
    return db.select().from(licenseKeys).orderBy(desc(licenseKeys.createdAt));
  }

  async getLicenseKey(key: string): Promise<LicenseKey | undefined> {
    const [lk] = await db.select().from(licenseKeys).where(eq(licenseKeys.key, key));
    return lk;
  }

  async getLicenseKeyByOrder(orderId: string): Promise<LicenseKey | undefined> {
    const [lk] = await db.select().from(licenseKeys).where(eq(licenseKeys.orderId, orderId));
    return lk;
  }

  async revokeLicenseKey(key: string): Promise<boolean> {
    const result = await db
      .update(licenseKeys)
      .set({ used: true, usedBy: "REVOKED" })
      .where(eq(licenseKeys.key, key))
      .returning();
    return result.length > 0;
  }

  async expireSubscriptions(): Promise<{ count: number; expired: typeof subscriptions.$inferSelect[] }> {
    const now = new Date();
    const expired = await db
      .update(subscriptions)
      .set({ tier: "free", expiresAt: null })
      .where(and(
        lte(subscriptions.expiresAt, now),
        sql`${subscriptions.tier} != 'free'`,
        eq(subscriptions.frozen, false)
      ))
      .returning();
    return { count: expired.length, expired };
  }

  async createBlacklistRequest(data: InsertBlacklistRequest): Promise<BlacklistRequest> {
    const [created] = await db.insert(blacklistRequests).values(data).returning();
    return created;
  }

  async getBlacklistRequests(): Promise<BlacklistRequest[]> {
    return db.select().from(blacklistRequests).orderBy(desc(blacklistRequests.createdAt));
  }

  async updateBlacklistRequestStatus(id: number, status: string, adminNotes?: string): Promise<BlacklistRequest | undefined> {
    const setData: any = { status };
    if (adminNotes !== undefined) setData.adminNotes = adminNotes;
    const [updated] = await db.update(blacklistRequests).set(setData).where(eq(blacklistRequests.id, id)).returning();
    return updated;
  }

  async createBlacklistEntry(data: InsertBlacklistEntry): Promise<BlacklistEntry> {
    const [created] = await db.insert(blacklistEntries).values(data).returning();
    return created;
  }

  async getBlacklistEntries(): Promise<BlacklistEntry[]> {
    return db.select().from(blacklistEntries).orderBy(desc(blacklistEntries.createdAt));
  }

  async updateBlacklistEntry(id: number, data: Partial<InsertBlacklistEntry>): Promise<BlacklistEntry | undefined> {
    const [updated] = await db.update(blacklistEntries).set(data).where(eq(blacklistEntries.id, id)).returning();
    return updated;
  }

  async deleteBlacklistEntry(id: number): Promise<boolean> {
    const result = await db.delete(blacklistEntries).where(eq(blacklistEntries.id, id)).returning();
    return result.length > 0;
  }

  async checkBlacklist(values: string[]): Promise<BlacklistEntry[]> {
    if (values.length === 0) return [];
    const conditions = values.map(v => {
      const val = `%${v.trim().toLowerCase()}%`;
      return or(
        sql`LOWER(COALESCE(${blacklistEntries.firstName}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.lastName}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.email}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.phone}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.address}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.pseudo}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.discord}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.discordId}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.password}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.iban}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.ip}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.civilite}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.ville}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.codePostal}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.dateNaissance}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.reason}, '')) LIKE ${val}`,
        sql`LOWER(COALESCE(${blacklistEntries.notes}, '')) LIKE ${val}`,
        sql`EXISTS (SELECT 1 FROM unnest(${blacklistEntries.emails}) AS e WHERE LOWER(e) LIKE ${val})`,
        sql`EXISTS (SELECT 1 FROM unnest(${blacklistEntries.phones}) AS p WHERE LOWER(p) LIKE ${val})`,
        sql`EXISTS (SELECT 1 FROM unnest(${blacklistEntries.ips}) AS i WHERE LOWER(i) LIKE ${val})`,
        sql`EXISTS (SELECT 1 FROM unnest(${blacklistEntries.discordIds}) AS d WHERE LOWER(d) LIKE ${val})`,
        sql`EXISTS (SELECT 1 FROM unnest(${blacklistEntries.addresses}) AS a WHERE LOWER(a) LIKE ${val})`
      );
    });
    return db.select().from(blacklistEntries).where(or(...conditions));
  }

  async createInfoRequest(data: InsertInfoRequest): Promise<InfoRequest> {
    const [created] = await db.insert(infoRequests).values(data).returning();
    return created;
  }

  async getInfoRequests(): Promise<InfoRequest[]> {
    return db.select().from(infoRequests).orderBy(desc(infoRequests.createdAt));
  }

  async updateInfoRequestStatus(id: number, status: string, adminNotes?: string): Promise<InfoRequest | undefined> {
    const setData: any = { status };
    if (adminNotes !== undefined) setData.adminNotes = adminNotes;
    const [updated] = await db.update(infoRequests).set(setData).where(eq(infoRequests.id, id)).returning();
    return updated;
  }

  async markInfoRequestPaid(orderId: string): Promise<InfoRequest | undefined> {
    const [updated] = await db.update(infoRequests).set({ paid: true }).where(eq(infoRequests.orderId, orderId)).returning();
    return updated;
  }

  async createPendingServiceRequest(orderId: string, type: string, userId: string | null, formData: string): Promise<PendingServiceRequest> {
    const [created] = await db.insert(pendingServiceRequests).values({ orderId, type, userId, formData }).returning();
    return created;
  }

  async getPendingServiceRequest(orderId: string): Promise<PendingServiceRequest | undefined> {
    const [found] = await db.select().from(pendingServiceRequests).where(eq(pendingServiceRequests.orderId, orderId));
    return found;
  }

  async markPendingServiceRequestPaid(orderId: string): Promise<PendingServiceRequest | undefined> {
    const [updated] = await db.update(pendingServiceRequests).set({ paid: true }).where(eq(pendingServiceRequests.orderId, orderId)).returning();
    return updated;
  }

  async setDiscordId(userId: string, discordId: string): Promise<Subscription | undefined> {
    await this.getOrCreateSubscription(userId);
    const [updated] = await db
      .update(subscriptions)
      .set({ discordId })
      .where(eq(subscriptions.userId, userId))
      .returning();
    return updated;
  }

  async clearDiscordId(userId: string): Promise<void> {
    await db
      .update(subscriptions)
      .set({ discordId: null })
      .where(eq(subscriptions.userId, userId));
  }

  async getDiscordId(userId: string): Promise<string | null> {
    const sub = await this.getSubscription(userId);
    return sub?.discordId || null;
  }

  async createWantedProfile(data: InsertWantedProfile): Promise<WantedProfile> {
    const [created] = await db.insert(wantedProfiles).values(data).returning();
    return created;
  }

  async getWantedProfiles(): Promise<WantedProfile[]> {
    return db.select().from(wantedProfiles).orderBy(desc(wantedProfiles.createdAt));
  }

  async getWantedProfileById(id: number): Promise<WantedProfile | undefined> {
    const [found] = await db.select().from(wantedProfiles).where(eq(wantedProfiles.id, id));
    return found;
  }

  async updateWantedProfile(id: number, data: Partial<InsertWantedProfile>): Promise<WantedProfile | undefined> {
    const [updated] = await db.update(wantedProfiles).set(data).where(eq(wantedProfiles.id, id)).returning();
    return updated;
  }

  async deleteWantedProfile(id: number): Promise<boolean> {
    const result = await db.delete(wantedProfiles).where(eq(wantedProfiles.id, id)).returning();
    return result.length > 0;
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  }

  async revokeSubscription(userId: string): Promise<boolean> {
    const result = await db
      .update(subscriptions)
      .set({ tier: "free", expiresAt: null, frozen: false, frozenAt: null })
      .where(eq(subscriptions.userId, userId))
      .returning();
    return result.length > 0;
  }

  async deleteUserData(userId: string): Promise<void> {
    await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await db.delete(dailyUsage).where(eq(dailyUsage.userId, userId));
    await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
  }

  async searchWantedProfiles(criteria: Record<string, string>): Promise<WantedProfile[]> {
    const conditions: any[] = [];

    for (const [key, value] of Object.entries(criteria)) {
      if (!value || typeof value !== 'string') continue;

      const val = value.trim();

      if (key === "email") {
        conditions.push(
          or(
            ilike(wantedProfiles.email, `%${val}%`),
            sql`EXISTS (SELECT 1 FROM unnest(${wantedProfiles.emails}) e WHERE e ILIKE ${'%' + val + '%'})`
          )
        );
      } else if (key === "phone" || key === "telephone") {
        conditions.push(
          or(
            ilike(wantedProfiles.telephone, `%${val}%`),
            sql`EXISTS (SELECT 1 FROM unnest(${wantedProfiles.phones}) p WHERE p ILIKE ${'%' + val + '%'})`
          )
        );
      } else if (key === "ip" || key === "ipAddress") {
        conditions.push(
          or(
            ilike(wantedProfiles.ip, `%${val}%`),
            sql`EXISTS (SELECT 1 FROM unnest(${wantedProfiles.ips}) i WHERE i ILIKE ${'%' + val + '%'})`
          )
        );
      } else if (key === "discordId") {
        conditions.push(
          or(
            ilike(wantedProfiles.discordId, `%${val}%`),
            sql`EXISTS (SELECT 1 FROM unnest(${wantedProfiles.discordIds}) d WHERE d ILIKE ${'%' + val + '%'})`
          )
        );
      } else if (key === "nom") {
        conditions.push(ilike(wantedProfiles.nom, `%${val}%`));
      } else if (key === "prenom") {
        conditions.push(ilike(wantedProfiles.prenom, `%${val}%`));
      } else if (key === "pseudo") {
        conditions.push(ilike(wantedProfiles.pseudo, `%${val}%`));
      } else if (key === "discord") {
        conditions.push(ilike(wantedProfiles.discord, `%${val}%`));
      } else if (key === "adresse" || key === "address") {
        conditions.push(
          or(
            ilike(wantedProfiles.adresse, `%${val}%`),
            sql`EXISTS (SELECT 1 FROM unnest(${wantedProfiles.addresses}) a WHERE a ILIKE ${'%' + val + '%'})`
          )
        );
      } else if (key === "notes") {
        conditions.push(ilike(wantedProfiles.notes, `%${val}%`));
      } else if (key === "password") {
        conditions.push(ilike(wantedProfiles.password, `%${val}%`));
      } else if (key === "iban") {
        conditions.push(ilike(wantedProfiles.iban, `%${val}%`));
      } else if (key === "bic") {
        conditions.push(ilike(wantedProfiles.bic, `%${val}%`));
      } else if (key === "plaque") {
        conditions.push(ilike(wantedProfiles.plaque, `%${val}%`));
      } else if (key === "nir") {
        conditions.push(ilike(wantedProfiles.nir, `%${val}%`));
      }
    }

    if (conditions.length === 0) return [];

    return await db.select()
      .from(wantedProfiles)
      .where(and(...conditions))
      .orderBy(desc(wantedProfiles.createdAt));
  }
  async getSiteSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return row?.value ?? null;
  }

  async setSiteSetting(key: string, value: string): Promise<void> {
    await db.insert(siteSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value } });
  }

  async createDiscordLinkCode(userId: string): Promise<string> {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.delete(discordLinkCodes).where(
      and(eq(discordLinkCodes.userId, userId), eq(discordLinkCodes.used, false))
    );
    await db.insert(discordLinkCodes).values({ userId, code, expiresAt });
    return code;
  }

  async consumeDiscordLinkCode(code: string): Promise<{ userId: string } | null> {
    const [row] = await db.select().from(discordLinkCodes).where(
      and(
        eq(discordLinkCodes.code, code.toUpperCase()),
        eq(discordLinkCodes.used, false)
      )
    );
    if (!row) return null;
    if (new Date() > row.expiresAt) return null;
    await db.update(discordLinkCodes)
      .set({ used: true })
      .where(eq(discordLinkCodes.id, row.id));
    return { userId: row.userId };
  }

  async getSubscriptionByDiscordId(discordId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.discordId, discordId));
    return sub;
  }

  async getDofProfiles(): Promise<DofProfile[]> {
    return db.select().from(dofProfiles).orderBy(asc(dofProfiles.sortOrder), asc(dofProfiles.id));
  }

  async getDofProfileById(id: number): Promise<DofProfile | undefined> {
    const [profile] = await db.select().from(dofProfiles).where(eq(dofProfiles.id, id));
    return profile;
  }

  async createDofProfile(data: InsertDofProfile): Promise<DofProfile> {
    const [profile] = await db.insert(dofProfiles).values(data).returning();
    return profile;
  }

  async updateDofProfile(id: number, data: Partial<InsertDofProfile>): Promise<DofProfile | undefined> {
    const [profile] = await db.update(dofProfiles).set(data).where(eq(dofProfiles.id, id)).returning();
    return profile;
  }

  async deleteDofProfile(id: number): Promise<boolean> {
    const result = await db.delete(dofProfiles).where(eq(dofProfiles.id, id)).returning();
    return result.length > 0;
  }

  async createSession(userId: string, sessionToken: string, ipAddress?: string, userAgent?: string): Promise<ActiveSession> {
    const [session] = await db.insert(activeSessions).values({
      userId,
      sessionToken,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    })
    .onConflictDoUpdate({
      target: activeSessions.sessionToken,
      set: { lastActiveAt: new Date() },
    })
    .returning();
    return session;
  }

  async getActiveSessionCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(activeSessions)
      .where(eq(activeSessions.userId, userId));
    return result[0]?.count ?? 0;
  }

  async getActiveSessions(userId: string): Promise<ActiveSession[]> {
    return db.select().from(activeSessions)
      .where(eq(activeSessions.userId, userId))
      .orderBy(asc(activeSessions.createdAt));
  }

  async validateSession(userId: string, sessionToken: string): Promise<boolean> {
    const [session] = await db.select().from(activeSessions)
      .where(and(eq(activeSessions.userId, userId), eq(activeSessions.sessionToken, sessionToken)));
    return !!session;
  }

  async touchSession(sessionToken: string): Promise<void> {
    await db.update(activeSessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(activeSessions.sessionToken, sessionToken));
  }

  async removeSession(sessionToken: string): Promise<void> {
    await db.delete(activeSessions).where(eq(activeSessions.sessionToken, sessionToken));
  }

  async removeAllSessions(userId: string): Promise<void> {
    await db.delete(activeSessions).where(eq(activeSessions.userId, userId));
  }

  async removeOldestSession(userId: string): Promise<void> {
    const oldest = await db.select().from(activeSessions)
      .where(eq(activeSessions.userId, userId))
      .orderBy(asc(activeSessions.lastActiveAt))
      .limit(1);
    if (oldest.length > 0) {
      await db.delete(activeSessions).where(eq(activeSessions.id, oldest[0].id));
    }
  }

  async cleanupStaleSessions(maxAgeMinutes: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const result = await db.delete(activeSessions)
      .where(lte(activeSessions.lastActiveAt, cutoff))
      .returning();
    return result.length;
  }

  async getSessionsByIp(ipAddress: string): Promise<ActiveSession[]> {
    return db.select().from(activeSessions).where(eq(activeSessions.ipAddress, ipAddress));
  }

  async getBlockedIps(): Promise<BlockedIp[]> {
    return db.select().from(blockedIps).orderBy(desc(blockedIps.createdAt));
  }

  async isIpBlocked(ip: string): Promise<boolean> {
    const [entry] = await db.select().from(blockedIps).where(eq(blockedIps.ipAddress, ip));
    return !!entry;
  }

  async blockIp(ipAddress: string, reason: string, blockedBy: string): Promise<BlockedIp> {
    const existing = await db.select().from(blockedIps).where(eq(blockedIps.ipAddress, ipAddress));
    if (existing.length > 0) return existing[0];
    const id = `ip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const [entry] = await db
      .insert(blockedIps)
      .values({ id, ipAddress, reason, blockedBy })
      .returning();
    return entry;
  }

  async unblockIp(id: string): Promise<void> {
    await db.delete(blockedIps).where(eq(blockedIps.id, id));
  }

  private generateReferralCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "DS-";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async getOrCreateReferralCode(userId: string): Promise<ReferralCode> {
    const [existing] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId));
    if (existing) return existing;
    const code = this.generateReferralCode();
    const [created] = await db.insert(referralCodes).values({ userId, code }).returning();
    return created;
  }

  async getReferralCodeByCode(code: string): Promise<ReferralCode | undefined> {
    const [ref] = await db.select().from(referralCodes).where(eq(referralCodes.code, code.toUpperCase()));
    return ref;
  }

  async getReferralStats(userId: string): Promise<{ code: string; totalCredits: number; referralCount: number }> {
    const refCode = await this.getOrCreateReferralCode(userId);
    const events = await db.select().from(referralEvents).where(eq(referralEvents.referrerId, userId));
    return {
      code: refCode.code,
      totalCredits: refCode.totalCredits,
      referralCount: events.length,
    };
  }

  async recordReferralEvent(referrerId: string, refereeId: string, orderId: string): Promise<ReferralEvent> {
    const [event] = await db.insert(referralEvents).values({
      referrerId,
      refereeId,
      orderId,
    }).returning();
    await db.update(referralCodes)
      .set({ totalCredits: sql`${referralCodes.totalCredits} + 1` })
      .where(eq(referralCodes.userId, referrerId));
    return event;
  }

  async creditReferral(orderId: string): Promise<boolean> {
    const pending = await this.getPendingReferral(orderId);
    if (!pending) return false;
    const existingEvents = await db.select().from(referralEvents).where(eq(referralEvents.orderId, orderId));
    if (existingEvents.length > 0) return false;
    await this.recordReferralEvent(pending.referrerId, pending.refereeId, orderId);
    const settingKey = `referral_pending_${orderId}`;
    await db.delete(siteSettings).where(eq(siteSettings.key, settingKey));
    return true;
  }

  async storeReferralForOrder(orderId: string, referrerUserId: string, refereeUserId: string): Promise<void> {
    const settingKey = `referral_pending_${orderId}`;
    const value = JSON.stringify({ referrerId: referrerUserId, refereeId: refereeUserId });
    await db.insert(siteSettings).values({ key: settingKey, value }).onConflictDoUpdate({
      target: siteSettings.key,
      set: { value },
    });
  }

  async getPendingReferral(orderId: string): Promise<{ referrerId: string; refereeId: string } | null> {
    const settingKey = `referral_pending_${orderId}`;
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, settingKey));
    if (!setting) return null;
    try {
      return JSON.parse(setting.value);
    } catch {
      return null;
    }
  }

  async setReferralCredits(userId: string, credits: number): Promise<void> {
    const [existing] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId));
    if (existing) {
      await db.update(referralCodes).set({ totalCredits: credits }).where(eq(referralCodes.userId, userId));
    } else {
      const code = "DS-" + Array.from({ length: 6 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]).join("");
      await db.insert(referralCodes).values({ userId, code, totalCredits: credits });
    }
  }

  async createLoginLog(data: { userId: string; email?: string; username?: string; ip: string; userAgent?: string; provider: string; tier: string; discordId?: string }): Promise<void> {
    const [{ nextId }] = await db
      .select({ nextId: sql<number>`COALESCE(MAX(${loginLogs.id}), 0) + 1` })
      .from(loginLogs);
    await db.insert(loginLogs).values({
      id: nextId,
      userId: data.userId,
      email: data.email ?? null,
      username: data.username ?? null,
      ip: data.ip,
      userAgent: data.userAgent ?? null,
      provider: data.provider,
      tier: data.tier,
      discordId: data.discordId ?? null,
    });
  }

  async getLoginLogs(limit = 200): Promise<LoginLog[]> {
    return db.select().from(loginLogs).orderBy(desc(loginLogs.createdAt)).limit(limit);
  }

  async submitGameScore(userId: string, username: string, score: number): Promise<void> {
    // Compute next id manually to avoid requiring sequence USAGE permission.
    // The sequence (game_scores_id_seq) may not be granted to the app DB user on VPS.
    const [{ nextId }] = await db
      .select({ nextId: sql<number>`COALESCE(MAX(${gameScores.id}), 0) + 1` })
      .from(gameScores);
    await db.insert(gameScores).values({ id: nextId, userId, username, score });
  }

  async getGameLeaderboard(): Promise<Array<{ userId: string; username: string; score: number; rank: number }>> {
    const rows = await db
      .select({
        userId:   gameScores.userId,
        username: gameScores.username,
        score:    sql<number>`MAX(${gameScores.score})`,
      })
      .from(gameScores)
      .groupBy(gameScores.userId, gameScores.username)
      .orderBy(desc(sql`MAX(${gameScores.score})`))
      .limit(50); // over-fetch to de-dup by userId client-side

    // If a user has multiple usernames (pseudo change), keep only their best
    const byUser = new Map<string, { userId: string; username: string; score: number }>();
    for (const r of rows) {
      const existing = byUser.get(r.userId);
      if (!existing || r.score > existing.score) {
        byUser.set(r.userId, r);
      }
    }
    return Array.from(byUser.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }

  async getUserBestScore(userId: string): Promise<number> {
    const rows = await db
      .select({ best: sql<number>`MAX(${gameScores.score})` })
      .from(gameScores)
      .where(eq(gameScores.userId, userId));
    return rows[0]?.best ?? 0;
  }

  async getUserGameCredits(userId: string): Promise<{ total: number; gamesPlayed: number }> {
    const rows = await db
      .select({ score: gameScores.score })
      .from(gameScores)
      .where(eq(gameScores.userId, userId));
    const total = rows.reduce((acc, r) => acc + Math.floor(r.score / 60), 0);
    return { total, gamesPlayed: rows.length };
  }

  async adminResetUserGameData(userId: string): Promise<void> {
    await db.delete(gameScores).where(eq(gameScores.userId, userId));
  }

  async adminSetUserGameScore(userId: string, username: string, score: number): Promise<void> {
    await db.delete(gameScores).where(eq(gameScores.userId, userId));
    const [{ nextId }] = await db
      .select({ nextId: sql<number>`COALESCE(MAX(${gameScores.id}), 0) + 1` })
      .from(gameScores);
    await db.insert(gameScores).values({ id: nextId, userId, username, score });
  }

  async getAllDiscountCodes(): Promise<DiscountCode[]> {
    return db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
  }

  async getDiscountCodeByCode(code: string): Promise<DiscountCode | null> {
    const rows = await db.select().from(discountCodes).where(eq(discountCodes.code, code.toUpperCase()));
    return rows[0] ?? null;
  }

  async createDiscountCode(data: { code: string; discountPercent: number; maxUses?: number | null; createdBy: string; active?: boolean; expiresAt?: Date | null }): Promise<DiscountCode> {
    const [row] = await db.insert(discountCodes).values({
      code: data.code.toUpperCase(),
      discountPercent: data.discountPercent,
      maxUses: data.maxUses ?? null,
      createdBy: data.createdBy,
      active: data.active ?? true,
      expiresAt: data.expiresAt ?? null,
    }).returning();
    return row;
  }

  async updateDiscountCode(id: number, data: Partial<{ active: boolean; maxUses: number | null; expiresAt: Date | null; discountPercent: number }>): Promise<DiscountCode | null> {
    const [row] = await db.update(discountCodes).set(data).where(eq(discountCodes.id, id)).returning();
    return row ?? null;
  }

  async deleteDiscountCode(id: number): Promise<boolean> {
    const result = await db.delete(discountCodes).where(eq(discountCodes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementDiscountCodeUsage(id: number): Promise<void> {
    await db.update(discountCodes)
      .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
      .where(eq(discountCodes.id, id));
  }

  async storeDiscountForOrder(orderId: string, codeId: number, discountPercent: number): Promise<void> {
    const settingKey = `discount_order_${orderId}`;
    await db.insert(siteSettings).values({
      key: settingKey,
      value: JSON.stringify({ codeId, discountPercent }),
    }).onConflictDoUpdate({ target: siteSettings.key, set: { value: JSON.stringify({ codeId, discountPercent }) } });
  }

  async getDiscountForOrder(orderId: string): Promise<{ codeId: number; code: string; discountPercent: number } | null> {
    const settingKey = `discount_order_${orderId}`;
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, settingKey));
    if (!rows[0]) return null;
    try {
      const parsed = JSON.parse(rows[0].value);
      const dc = await db.select().from(discountCodes).where(eq(discountCodes.id, parsed.codeId));
      if (!dc[0]) return null;
      return { codeId: parsed.codeId, code: dc[0].code, discountPercent: parsed.discountPercent };
    } catch {
      return null;
    }
  }

  async getAllGameBoosts(): Promise<GameBoost[]> {
    return db.select().from(gameBoosts).orderBy(desc(gameBoosts.createdAt));
  }

  async getGameBoostByCode(code: string): Promise<GameBoost | null> {
    const rows = await db.select().from(gameBoosts).where(eq(gameBoosts.code, code.toUpperCase()));
    return rows[0] ?? null;
  }

  async createGameBoost(data: { name: string; code: string; multiplier: number; maxUses?: number | null; createdBy: string; active?: boolean; expiresAt?: Date | null }): Promise<GameBoost> {
    const [row] = await db.insert(gameBoosts).values({
      name: data.name,
      code: data.code.toUpperCase(),
      multiplier: data.multiplier,
      maxUses: data.maxUses ?? null,
      createdBy: data.createdBy,
      active: data.active ?? true,
      expiresAt: data.expiresAt ?? null,
    }).returning();
    return row;
  }

  async updateGameBoost(id: number, data: Partial<{ name: string; active: boolean; maxUses: number | null; expiresAt: Date | null; multiplier: number }>): Promise<GameBoost | null> {
    const [row] = await db.update(gameBoosts).set(data).where(eq(gameBoosts.id, id)).returning();
    return row ?? null;
  }

  async deleteGameBoost(id: number): Promise<boolean> {
    const result = await db.delete(gameBoosts).where(eq(gameBoosts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementGameBoostUsage(id: number): Promise<void> {
    await db.update(gameBoosts)
      .set({ usedCount: sql`${gameBoosts.usedCount} + 1` })
      .where(eq(gameBoosts.id, id));
  }

  async getAllServiceStatus(): Promise<ServiceStatus[]> {
    return db.select().from(serviceStatus).orderBy(serviceStatus.sortOrder);
  }

  async createServiceStatus(data: { name: string; description?: string; status?: string; latencyMs?: number | null; uptime?: string; sortOrder?: number }): Promise<ServiceStatus> {
    const [row] = await db.insert(serviceStatus).values({
      name: data.name,
      description: data.description ?? "",
      status: data.status ?? "operational",
      latencyMs: data.latencyMs ?? null,
      uptime: data.uptime ?? "99.99%",
      sortOrder: data.sortOrder ?? 0,
      updatedAt: new Date(),
    }).returning();
    return row;
  }

  async updateServiceStatus(id: number, data: Partial<{ name: string; description: string; status: string; latencyMs: number | null; uptime: string; sortOrder: number }>): Promise<ServiceStatus | null> {
    const [row] = await db.update(serviceStatus)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceStatus.id, id))
      .returning();
    return row ?? null;
  }

  async deleteServiceStatus(id: number): Promise<boolean> {
    const result = await db.delete(serviceStatus).where(eq(serviceStatus.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getRecentSubscriptionActivity(): Promise<{ tier: string; createdAt: Date }[]> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const rows = await db.select({ tier: subscriptions.tier, createdAt: subscriptions.createdAt })
      .from(subscriptions)
      .where(sql`${subscriptions.createdAt} >= ${cutoff} AND ${subscriptions.tier} != 'free'`)
      .orderBy(sql`${subscriptions.createdAt} DESC`)
      .limit(10);
    return rows.map(r => ({ tier: r.tier ?? "free", createdAt: r.createdAt }));
  }

  async createSearchLog(data: InsertSearchLog): Promise<void> {
    try {
      const [{ nextId }] = await db
        .select({ nextId: sql<number>`COALESCE(MAX(${searchLogs.id}), 0) + 1` })
        .from(searchLogs);
      await db.insert(searchLogs).values({
        id: nextId,
        userId: data.userId,
        email: data.email ?? null,
        username: data.username ?? null,
        discordId: data.discordId ?? null,
        searchType: data.searchType,
        searchQuery: data.searchQuery,
        resultCount: data.resultCount ?? 0,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        subscriptionTier: data.subscriptionTier ?? "free",
      });
    } catch (e) {
      console.error("[searchLog] Failed to write log:", e);
    }
  }

  async getSearchLogs(filters: { userId?: string; searchType?: string; dateFrom?: string; dateTo?: string; query?: string; page?: number; limit?: number }): Promise<{ rows: SearchLog[]; total: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 50);
    const offset = (page - 1) * limit;
    const conditions: ReturnType<typeof eq>[] = [];
    if (filters.userId) conditions.push(eq(searchLogs.userId, filters.userId));
    if (filters.searchType) conditions.push(eq(searchLogs.searchType, filters.searchType));
    if (filters.dateFrom) conditions.push(gte(searchLogs.createdAt, new Date(filters.dateFrom)));
    if (filters.dateTo) {
      const d = new Date(filters.dateTo);
      d.setHours(23, 59, 59, 999);
      conditions.push(lte(searchLogs.createdAt, d));
    }
    if (filters.query) conditions.push(ilike(searchLogs.searchQuery, `%${filters.query}%`));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalRow] = await db.select({ c: count() }).from(searchLogs).where(where);
    const rows = await db.select().from(searchLogs).where(where).orderBy(desc(searchLogs.createdAt)).limit(limit).offset(offset);
    return { rows, total: Number(totalRow?.c ?? 0) };
  }

  async createReview(data: InsertReview & { userId: string; username?: string; email?: string; subscriptionTier?: string; verified?: boolean }): Promise<Review> {
    const [{ nextId }] = await db
      .select({ nextId: sql<number>`COALESCE(MAX(${reviews.id}), 0) + 1` })
      .from(reviews);
    const [row] = await db.insert(reviews).values({
      id: nextId,
      userId: data.userId,
      username: data.username ?? null,
      email: data.email ?? null,
      subscriptionTier: data.subscriptionTier ?? "free",
      rating: data.rating,
      comment: data.comment,
      status: "pending",
      verified: data.verified ?? false,
    }).returning();
    return row;
  }

  async getApprovedReviews(page = 1, limit = 20): Promise<{ rows: Review[]; total: number }> {
    const offset = (page - 1) * limit;
    const [totalRow] = await db.select({ c: count() }).from(reviews).where(eq(reviews.status, "approved"));
    const rows = await db.select().from(reviews).where(eq(reviews.status, "approved")).orderBy(desc(reviews.createdAt)).limit(limit).offset(offset);
    return { rows, total: Number(totalRow?.c ?? 0) };
  }

  async getAdminReviews(filters: { status?: string; page?: number; limit?: number }): Promise<{ rows: Review[]; total: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 20);
    const offset = (page - 1) * limit;
    const where = filters.status && filters.status !== "all" ? eq(reviews.status, filters.status) : undefined;
    const [totalRow] = await db.select({ c: count() }).from(reviews).where(where);
    const rows = await db.select().from(reviews).where(where).orderBy(desc(reviews.createdAt)).limit(limit).offset(offset);
    return { rows, total: Number(totalRow?.c ?? 0) };
  }

  async updateReviewStatus(id: number, status: string, reviewedBy?: string): Promise<Review | undefined> {
    const [row] = await db.update(reviews).set({
      status,
      reviewedAt: new Date(),
      reviewedBy: reviewedBy ?? null,
    }).where(eq(reviews.id, id)).returning();
    return row;
  }

  async deleteReview(id: number): Promise<boolean> {
    const result = await db.delete(reviews).where(eq(reviews.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getUserReview(userId: string): Promise<Review | undefined> {
    const rows = await db.select().from(reviews).where(eq(reviews.userId, userId)).limit(1);
    return rows[0];
  }

  async createGameLog(data: InsertGameLog): Promise<void> {
    const [{ nextId }] = await db
      .select({ nextId: sql<number>`COALESCE(MAX(${gameLogs.id}), 0) + 1` })
      .from(gameLogs);
    await db.insert(gameLogs).values({ ...data, id: nextId });
  }

  async getGameLogs(filters: { userId?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }): Promise<{ rows: GameLog[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const offset = (page - 1) * limit;
    const conditions: ReturnType<typeof eq>[] = [];
    if (filters.userId) conditions.push(eq(gameLogs.userId, filters.userId));
    if (filters.dateFrom) conditions.push(gte(gameLogs.createdAt, new Date(filters.dateFrom)));
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(gameLogs.createdAt, to));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [rows, [{ value: total }]] = await Promise.all([
      db.select().from(gameLogs).where(where).orderBy(desc(gameLogs.createdAt)).limit(limit).offset(offset),
      db.select({ value: count() }).from(gameLogs).where(where),
    ]);
    return { rows, total: Number(total) };
  }
}

export const storage = new DatabaseStorage();
