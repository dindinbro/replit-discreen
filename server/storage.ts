import {
  users, categories, subscriptions, dailyUsage, apiKeys, vouches, licenseKeys,
  blacklistRequests, blacklistEntries, infoRequests, pendingServiceRequests,
  wantedProfiles, siteSettings,
  type User, type InsertUser, type Category, type InsertCategory,
  type Subscription, type ApiKey, type PlanTier, type Vouch, type InsertVouch,
  type LicenseKey, type BlacklistRequest, type InsertBlacklistRequest,
  type BlacklistEntry, type InsertBlacklistEntry,
  type InfoRequest, type InsertInfoRequest, type PendingServiceRequest,
  type WantedProfile, type InsertWantedProfile,
  PLAN_LIMITS,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, asc, desc, sql, lte } from "drizzle-orm";
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
  createLicenseKey(tier: PlanTier, orderId?: string, createdBy?: string): Promise<LicenseKey>;
  redeemLicenseKey(key: string, userId: string): Promise<{ success: boolean; tier?: PlanTier; message: string }>;
  getLicenseKeys(): Promise<LicenseKey[]>;
  getLicenseKeyByOrder(orderId: string): Promise<LicenseKey | undefined>;
  expireSubscriptions(): Promise<number>;
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

  async createLicenseKey(tier: PlanTier, orderId?: string, createdBy?: string): Promise<LicenseKey> {
    const key = `DSC-${tier.toUpperCase()}-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;

    try {
      const values: any = { key, tier };
      if (orderId) values.orderId = orderId;
      values.createdBy = createdBy || null;

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
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      const code = err?.code || "";
      if (msg.includes("created_by") || code === "42703") {
        console.warn("[storage] created_by column missing, using raw SQL fallback");
        const result = await db.execute(sql`
          INSERT INTO license_keys (key, tier${orderId ? sql`, order_id` : sql``})
          VALUES (${key}, ${tier}${orderId ? sql`, ${orderId}` : sql``})
          ${orderId ? sql`ON CONFLICT (order_id) DO NOTHING` : sql``}
          RETURNING *
        `);
        const row = (result as any).rows?.[0] || (result as any)[0];
        if (!row && orderId) {
          const [existing] = await db.select().from(licenseKeys).where(eq(licenseKeys.orderId, orderId));
          return existing;
        }
        if (row) return row as LicenseKey;
        throw new Error("Failed to create license key");
      }
      throw err;
    }
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

  async expireSubscriptions(): Promise<number> {
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
    return expired.length;
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
}

export const storage = new DatabaseStorage();
