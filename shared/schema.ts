import { pgTable, text, serial, timestamp, integer, date, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("Folder"),
  color: text("color").notNull().default("#10b981"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const SearchFilterType = z.enum([
  "username",
  "displayName",
  "macAddress",
  "ipAddress",
  "email",
  "address",
  "lastName",
  "firstName",
  "ssn",
  "phone",
  "gender",
  "dob",
  "yob",
  "iban",
  "bic",
  "hashedPassword",
  "password",
  "vin",
  "discordId",
  "fivemLicense",
  "steamId",
  "fivemId",
  "xbox",
  "live"
]);

export type SearchFilterType = z.infer<typeof SearchFilterType>;

export const FilterLabels: Record<SearchFilterType, string> = {
  username: "Nom d'utilisateur",
  displayName: "Nom d'affichage",
  macAddress: "Adresse MAC",
  ipAddress: "Adresse IP",
  email: "Adresse Email",
  address: "Adresse",
  lastName: "Nom",
  firstName: "Prénom",
  ssn: "Numéro de sécurité sociale",
  phone: "Numéro de Téléphone",
  gender: "Genre",
  dob: "Date de naissance",
  yob: "Année de naissance",
  iban: "IBAN",
  bic: "BIC",
  hashedPassword: "Hashed Password",
  password: "Password",
  vin: "VIN / Plaque",
  discordId: "Discord ID",
  fivemLicense: "License FiveM",
  steamId: "Steam ID",
  fivemId: "ID FiveM",
  xbox: "Xbox",
  live: "Live",
};

export const FivemFilterTypes = ["fivemId", "fivemLicense", "steamId", "discordId", "xbox", "live"] as const;
export type FivemFilterType = typeof FivemFilterTypes[number];

export const FivemFilterLabels: Record<FivemFilterType, string> = {
  fivemId: "ID FiveM",
  fivemLicense: "License FiveM",
  steamId: "Steam ID",
  discordId: "Discord ID",
  xbox: "Xbox",
  live: "Live",
};

export const MainSearchFilterTypes = [
  "username", "displayName", "macAddress", "ipAddress", "email", "address",
  "lastName", "firstName", "ssn", "phone", "gender", "dob", "yob",
  "iban", "bic", "hashedPassword", "password", "vin",
] as const;

export const WantedFilterTypes = [
  "nom",
  "prenom",
  "pseudo",
  "email",
  "phone",
  "ipAddress",
  "discordId",
  "discord",
  "address",
  "password",
  "iban",
  "bic",
  "plaque",
  "notes",
] as const;

export type WantedFilterType = typeof WantedFilterTypes[number];

export const WantedFilterLabels: Record<WantedFilterType, string> = {
  nom: "Nom",
  prenom: "Prénom",
  pseudo: "Pseudo",
  email: "Email",
  phone: "Téléphone",
  ipAddress: "Adresse IP",
  discordId: "Discord ID",
  discord: "Discord",
  address: "Adresse",
  password: "Password",
  iban: "IBAN",
  bic: "BIC",
  plaque: "Plaque d'immatriculation",
  notes: "Notes / Signalement",
};

export const WantedFilterToApiParam: Record<WantedFilterType, string> = {
  nom: "nom",
  prenom: "prenom",
  pseudo: "pseudo",
  email: "email",
  phone: "phone",
  ipAddress: "ip",
  discordId: "discordId",
  discord: "discord",
  address: "adresse",
  password: "password",
  iban: "iban",
  bic: "bic",
  plaque: "plaque",
  notes: "notes",
};

export const SearchCriterionSchema = z.object({
  type: SearchFilterType,
  value: z.string().min(1, "Value is required")
});

export type SearchCriterion = z.infer<typeof SearchCriterionSchema>;

export const SearchRequestSchema = z.object({
  criteria: z.array(SearchCriterionSchema).min(1, "Au moins un critère est requis"),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export const SearchResponseSchema = z.object({
  results: z.array(z.record(z.string(), z.any())),
  total: z.number().nullable(),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const ResultItemSchema = z.object({
  content: z.string(),
  lineNumber: z.number().optional()
});

export type ResultItem = z.infer<typeof ResultItemSchema>;

export const GroupedResultSchema = z.object({
  source: z.string(),
  items: z.array(ResultItemSchema),
  count: z.number()
});

export type GroupedResult = z.infer<typeof GroupedResultSchema>;

// Subscription plan tiers
export const PlanTier = z.enum(["free", "vip", "pro", "business", "api"]);
export type PlanTier = z.infer<typeof PlanTier>;

export const PLAN_LIMITS: Record<PlanTier, { dailySearches: number; dailyLeakosintSearches: number; price: number; label: string }> = {
  free: { dailySearches: 5, dailyLeakosintSearches: 0, price: 0, label: "Free" },
  vip: { dailySearches: 50, dailyLeakosintSearches: 10, price: 6.99, label: "VIP" },
  pro: { dailySearches: 200, dailyLeakosintSearches: 50, price: 14.99, label: "PRO" },
  business: { dailySearches: 500, dailyLeakosintSearches: 150, price: 24.99, label: "Business" },
  api: { dailySearches: -1, dailyLeakosintSearches: 200, price: 49.99, label: "API" },
};

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  tier: text("tier").notNull().default("free"),
  frozen: boolean("frozen").notNull().default(false),
  frozenAt: timestamp("frozen_at"),
  expiresAt: timestamp("expires_at"),
  discordId: text("discord_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export const dailyUsage = pgTable("daily_usage", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  usageDate: date("usage_date").notNull(),
  searchCount: integer("search_count").notNull().default(0),
  leakosintCount: integer("leakosint_count").notNull().default(0),
}, (table) => [
  uniqueIndex("daily_usage_user_date_idx").on(table.userId, table.usageDate),
]);

export type DailyUsage = typeof dailyUsage.$inferSelect;

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  name: text("name").notNull().default("Default"),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;

export const licenseKeys = pgTable("license_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  tier: text("tier").notNull(),
  used: boolean("used").notNull().default(false),
  usedBy: text("used_by"),
  orderId: text("order_id").unique(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  usedAt: timestamp("used_at"),
});

export const insertLicenseKeySchema = createInsertSchema(licenseKeys).omit({ id: true, createdAt: true, usedAt: true });
export type InsertLicenseKey = z.infer<typeof insertLicenseKeySchema>;
export type LicenseKey = typeof licenseKeys.$inferSelect;

export const vouches = pgTable("vouches", {
  id: serial("id").primaryKey(),
  discordUserId: text("discord_user_id").notNull(),
  discordUsername: text("discord_username").notNull(),
  discordAvatar: text("discord_avatar"),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertVouchSchema = createInsertSchema(vouches).omit({ id: true, createdAt: true });
export type InsertVouch = z.infer<typeof insertVouchSchema>;
export type Vouch = typeof vouches.$inferSelect;

export const blacklistRequests = pgTable("blacklist_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  pseudo: text("pseudo"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertBlacklistRequestSchema = createInsertSchema(blacklistRequests).omit({ id: true, createdAt: true, status: true, adminNotes: true });
export type InsertBlacklistRequest = z.infer<typeof insertBlacklistRequestSchema>;
export type BlacklistRequest = typeof blacklistRequests.$inferSelect;

export const blacklistEntries = pgTable("blacklist_entries", {
  id: serial("id").primaryKey(),
  civilite: text("civilite"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  pseudo: text("pseudo"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  ville: text("ville"),
  codePostal: text("code_postal"),
  dateNaissance: text("date_naissance"),
  discord: text("discord"),
  discordId: text("discord_id"),
  password: text("password"),
  iban: text("iban"),
  ip: text("ip"),
  emails: text("emails").array(),
  phones: text("phones").array(),
  ips: text("ips").array(),
  discordIds: text("discord_ids").array(),
  addresses: text("addresses").array(),
  reason: text("reason"),
  notes: text("notes"),
  sourceRequestId: integer("source_request_id"),
  addedBy: text("added_by"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertBlacklistEntrySchema = createInsertSchema(blacklistEntries).omit({ id: true, createdAt: true });
export type InsertBlacklistEntry = z.infer<typeof insertBlacklistEntrySchema>;
export type BlacklistEntry = typeof blacklistEntries.$inferSelect;

export const infoRequests = pgTable("info_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  discordId: text("discord_id"),
  email: text("email"),
  pseudo: text("pseudo"),
  ipAddress: text("ip_address"),
  additionalInfo: text("additional_info"),
  orderId: text("order_id"),
  paid: boolean("paid").notNull().default(false),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertInfoRequestSchema = createInsertSchema(infoRequests).omit({ id: true, createdAt: true, status: true, adminNotes: true, paid: true });
export type InsertInfoRequest = z.infer<typeof insertInfoRequestSchema>;
export type InfoRequest = typeof infoRequests.$inferSelect;

export const wantedProfiles = pgTable("wanted_profiles", {
  id: serial("id").primaryKey(),
  nom: text("nom"),
  prenom: text("prenom"),
  email: text("email"), // Keeping for compatibility, but we'll use a JSON/Text for multiples
  telephone: text("telephone"), // Keeping for compatibility
  adresse: text("adresse"),
  ville: text("ville"),
  codePostal: text("code_postal"),
  civilite: text("civilite"),
  dateNaissance: text("date_naissance"),
  ip: text("ip"), // Keeping for compatibility
  pseudo: text("pseudo"),
  discord: text("discord"),
  discordId: text("discord_id"), // Added Discord ID field
  password: text("password"),
  iban: text("iban"),
  bic: text("bic"),
  plaque: text("plaque"),
  notes: text("notes"),
  emails: text("emails").array(), // Added multiple emails
  phones: text("phones").array(), // Added multiple phones
  ips: text("ips").array(), // Added multiple IPs
  discordIds: text("discord_ids").array(), // Added multiple Discord IDs
  addresses: text("addresses").array(), // Added multiple addresses
  addedBy: text("added_by"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertWantedProfileSchema = createInsertSchema(wantedProfiles).omit({ id: true, createdAt: true });
export type InsertWantedProfile = z.infer<typeof insertWantedProfileSchema>;
export type WantedProfile = typeof wantedProfiles.$inferSelect;

export const pendingServiceRequests = pgTable("pending_service_requests", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  type: text("type").notNull(),
  userId: text("user_id"),
  formData: text("form_data").notNull(),
  paid: boolean("paid").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type PendingServiceRequest = typeof pendingServiceRequests.$inferSelect;

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;

export const discordLinkCodes = pgTable("discord_link_codes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  code: text("code").notNull().unique(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type DiscordLinkCode = typeof discordLinkCodes.$inferSelect;

export const dofProfiles = pgTable("dof_profiles", {
  id: serial("id").primaryKey(),
  pseudo: text("pseudo").notNull(),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  tier: text("tier").notNull().default("platine"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertDofProfileSchema = createInsertSchema(dofProfiles).omit({ id: true, createdAt: true });
export type InsertDofProfile = z.infer<typeof insertDofProfileSchema>;
export type DofProfile = typeof dofProfiles.$inferSelect;

export const DOF_TIERS = ["diamant", "platine", "label"] as const;
export type DofTier = (typeof DOF_TIERS)[number];

export const DOF_TEMPLATES: Record<string, { tier: DofTier; pseudo: string; description: string; imageUrl: string }[]> = {
  team: [
    { tier: "diamant", pseudo: "Fondateur", description: "Fondateur du projet", imageUrl: "" },
    { tier: "diamant", pseudo: "Co-Fondateur", description: "Co-fondateur du projet", imageUrl: "" },
    { tier: "platine", pseudo: "Developpeur", description: "Developpeur principal", imageUrl: "" },
    { tier: "platine", pseudo: "Moderateur", description: "Moderateur de la communaute", imageUrl: "" },
  ],
  label: [
    { tier: "label", pseudo: "Mon Label", description: "Membres: ...", imageUrl: "" },
  ],
  empty: [],
};

export const discordOAuthTokens = pgTable("discord_oauth_tokens", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type DiscordOAuthToken = typeof discordOAuthTokens.$inferSelect;

export * from "./models/chat";
