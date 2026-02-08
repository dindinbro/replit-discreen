function getWebhookUrl(): string | undefined {
  return process.env.DISCORD_WEBHOOK_URL;
}

function getSearchWebhookUrl(): string | undefined {
  return process.env.DISCORD_SEARCH_WEBHOOK_URL;
}

interface WebhookOptions {
  title: string;
  description?: string;
  color?: number;
  footer?: string;
  content?: string;
}

const COLORS = {
  search: 0x10b981,
  payment: 0xf59e0b,
  role: 0x6366f1,
  admin: 0xef4444,
  security: 0xe74c3c,
  info: 0x3b82f6,
  lookup: 0x8b5cf6,
};

interface UserInfo {
  id: string;
  email: string;
  username?: string;
  uniqueId?: number;
}

function userBlock(u: UserInfo): string {
  const lines: string[] = [
    ">>> **Information Utilisateur**",
    `**Nom d'utilisateur** : \`${u.username || "N/A"}\``,
    `**Email** : \`${u.email}\``,
    `**ID Unique** : \`#${u.uniqueId ?? "N/A"}\``,
  ];
  return lines.join("\n");
}

function sep(): string {
  return "\n\u200B";
}

async function sendToWebhook(webhookUrl: string, options: WebhookOptions, label: string): Promise<void> {
  try {
    const embed: any = {
      title: options.title,
      color: options.color || COLORS.info,
      timestamp: new Date().toISOString(),
    };

    if (options.description) embed.description = options.description;
    if (options.footer) embed.footer = { text: options.footer };

    const payload: any = {
      username: "Discreen Logs",
      embeds: [embed],
    };
    if (options.content) payload.content = options.content;

    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      console.error(`[webhook:${label}] Discord returned ${resp.status}: ${await resp.text().catch(() => "")}`);
    }
  } catch (err) {
    console.error(`[webhook:${label}] Send error:`, err);
  }
}

export async function sendWebhook(options: WebhookOptions): Promise<void> {
  const url = getWebhookUrl();
  if (!url) {
    console.warn("[webhook] DISCORD_WEBHOOK_URL not set, skipping");
    return;
  }
  await sendToWebhook(url, options, "general");
}

async function sendSearchWebhook(options: WebhookOptions): Promise<void> {
  const url = getSearchWebhookUrl();
  if (!url) {
    console.warn("[webhook] DISCORD_SEARCH_WEBHOOK_URL not set, skipping search log");
    return;
  }
  await sendToWebhook(url, options, "search");
}

export function webhookSearch(user: UserInfo, type: string, criteria: string, resultCount: number) {
  const desc = [
    userBlock(user),
    sep(),
    `**Requete**`,
    `**Type** : ${type}`,
    `**Criteres** : \`${criteria.slice(0, 200) || "N/A"}\``,
    sep(),
    `**Resultat** : **${resultCount}** trouve(s)`,
  ].join("\n");

  sendSearchWebhook({
    title: "\u{1F50D} Recherche Interne",
    description: desc,
    color: COLORS.search,
  });
}

export function webhookBreachSearch(user: UserInfo, term: string, fields: string[], resultCount: number) {
  const desc = [
    userBlock(user),
    sep(),
    `**Requete**`,
    `**Terme** : \`${term.slice(0, 200)}\``,
    `**Champs** : ${fields.join(", ")}`,
    sep(),
    `**Resultat** : **${resultCount}** trouve(s)`,
  ].join("\n");

  sendSearchWebhook({
    title: "\u{1F310} Recherche Externe (Breach)",
    description: desc,
    color: COLORS.search,
  });
}

export function webhookLeakosintSearch(user: UserInfo, request: string, resultCount: number) {
  const desc = [
    userBlock(user),
    sep(),
    `**Requete** : \`${String(request).slice(0, 200)}\``,
    sep(),
    `**Resultat** : **${resultCount}** trouve(s)`,
  ].join("\n");

  sendSearchWebhook({
    title: "\u{1F4E1} Recherche LeakOSINT",
    description: desc,
    color: COLORS.search,
  });
}

export function webhookApiSearch(userId: string, criteria: string, resultCount: number) {
  const desc = [
    `>>> **Information Utilisateur**`,
    `**User ID** : \`${userId}\``,
    sep(),
    `**Requete** : \`${criteria.slice(0, 200) || "N/A"}\``,
    sep(),
    `**Resultat** : **${resultCount}** trouve(s)`,
  ].join("\n");

  sendSearchWebhook({
    title: "\u{1F527} Recherche API v1",
    description: desc,
    color: COLORS.search,
  });
}

export function webhookRoleChange(adminEmail: string, targetUserId: string, newRole: string) {
  const desc = [
    `>>> **Action Admin**`,
    `**Admin** : \`${adminEmail}\``,
    sep(),
    `**Cible** : \`${targetUserId}\``,
    `**Nouveau Role** : \`${newRole.toUpperCase()}\``,
  ].join("\n");

  sendWebhook({
    title: "\u{1F3AD} Changement de Role",
    description: desc,
    color: COLORS.role,
  });
}

export function webhookFreeze(adminEmail: string, targetEmail: string, targetUsername: string, targetUniqueId: number | null, targetUserId: string, frozen: boolean, tier: string = "free") {
  const icon = frozen ? "\u{2744}\u{FE0F}" : "\u{2705}";
  const label = frozen ? "Compte Gele" : "Compte Degele";
  const status = frozen ? "**GELE**" : "**ACTIF**";

  const desc = [
    `>>> **Action Admin**`,
    `**Admin** : \`${adminEmail}\``,
    sep(),
    `**Cible** : \`${targetEmail}\``,
    `**Nom d'utilisateur** : \`${targetUsername}\``,
    `**ID Unique** : \`${targetUniqueId ?? "N/A"}\``,
    `**ID** : \`${targetUserId}\``,
    `**Abonnement** : ${tier.toLowerCase() === "free" ? "**Inactif**" : "**Actif**"}`,
    `**Type** : \`${tier.charAt(0).toUpperCase() + tier.slice(1)}\``,
    `**Statut** : ${status}`,
  ].join("\n");

  sendWebhook({
    title: `${icon} ${label}`,
    description: desc,
    color: COLORS.admin,
  });
}

export function webhookInvoiceCreated(plan: string, orderId: string, amount: number) {
  const desc = [
    `>>> **Details Facture**`,
    `**Plan** : \`${plan.toUpperCase()}\``,
    `**Montant** : ${amount} EUR`,
    `**Commande** : \`${orderId}\``,
  ].join("\n");

  sendWebhook({
    title: "\u{1F4C4} Facture Creee",
    description: desc,
    color: COLORS.payment,
  });
}

export function webhookPaymentCompleted(orderId: string, tier: string, amount: string, currency: string) {
  const desc = [
    `>>> **Details Paiement**`,
    `**Commande** : \`${orderId}\``,
    `**Tier** : \`${tier.toUpperCase()}\``,
    `**Montant** : ${amount} ${currency}`,
  ].join("\n");

  sendWebhook({
    title: "\u{1F4B3} Paiement Complete",
    description: desc,
    color: COLORS.payment,
  });
}

export function webhookKeyRedeemed(user: UserInfo, tier: string) {
  const desc = [
    userBlock(user),
    sep(),
    `**Tier** : \`${tier.toUpperCase()}\``,
  ].join("\n");

  sendWebhook({
    title: "\u{1F511} Cle de Licence Activee",
    description: desc,
    color: COLORS.payment,
  });
}

export function webhookKeyGenerated(adminEmail: string, tier: string, key: string) {
  const desc = [
    `>>> **Action Admin**`,
    `**Admin** : \`${adminEmail}\``,
    sep(),
    `**Tier** : \`${tier.toUpperCase()}\``,
    `**Cle** : ||${key}||`,
  ].join("\n");

  sendWebhook({
    title: "\u{1F511} Cle de Licence Generee",
    description: desc,
    color: COLORS.admin,
  });
}

export function webhookApiKeyCreated(user: UserInfo, keyName: string) {
  const desc = [
    userBlock(user),
    sep(),
    `**Nom de la cle** : \`${keyName}\``,
  ].join("\n");

  sendWebhook({
    title: "\u{1F5DD}\u{FE0F} Cle API Creee",
    description: desc,
    color: COLORS.info,
  });
}

export function webhookApiKeyRevoked(user: UserInfo, keyId: number) {
  const desc = [
    userBlock(user),
    sep(),
    `**ID Cle** : \`${keyId}\``,
  ].join("\n");

  sendWebhook({
    title: "\u{26D4} Cle API Revoquee",
    description: desc,
    color: COLORS.security,
  });
}

export function webhookPhoneLookup(user: UserInfo, phone: string) {
  const desc = [
    userBlock(user),
    sep(),
    `**Numero** : \`${phone}\``,
  ].join("\n");

  sendSearchWebhook({
    title: "\u{1F4F1} Lookup Telephone",
    description: desc,
    color: COLORS.lookup,
  });
}

export function webhookGeoIP(user: UserInfo, ip: string) {
  const desc = [
    userBlock(user),
    sep(),
    `**IP** : \`${ip}\``,
  ].join("\n");

  sendSearchWebhook({
    title: "\u{1F30D} Lookup GeoIP",
    description: desc,
    color: COLORS.lookup,
  });
}

export function webhookVouchDeleted(adminEmail: string, vouchId: number) {
  const desc = [
    `>>> **Action Admin**`,
    `**Admin** : \`${adminEmail}\``,
    sep(),
    `**ID Avis** : \`${vouchId}\``,
  ].join("\n");

  sendWebhook({
    title: "\u{1F5D1}\u{FE0F} Avis Supprime",
    description: desc,
    color: COLORS.admin,
  });
}

export function webhookCategoryCreated(adminEmail: string, name: string) {
  const desc = [
    `>>> **Action Admin**`,
    `**Admin** : \`${adminEmail}\``,
    sep(),
    `**Nom** : \`${name}\``,
  ].join("\n");

  sendWebhook({
    title: "\u{1F4C1} Categorie Creee",
    description: desc,
    color: COLORS.admin,
  });
}

export function webhookCategoryUpdated(adminEmail: string, categoryId: number) {
  const desc = [
    `>>> **Action Admin**`,
    `**Admin** : \`${adminEmail}\``,
    sep(),
    `**ID** : \`${categoryId}\``,
  ].join("\n");

  sendWebhook({
    title: "\u{270F}\u{FE0F} Categorie Modifiee",
    description: desc,
    color: COLORS.admin,
  });
}

export function webhookCategoryDeleted(adminEmail: string, categoryId: number) {
  const desc = [
    `>>> **Action Admin**`,
    `**Admin** : \`${adminEmail}\``,
    sep(),
    `**ID** : \`${categoryId}\``,
  ].join("\n");

  sendWebhook({
    title: "\u{1F5D1}\u{FE0F} Categorie Supprimee",
    description: desc,
    color: COLORS.admin,
  });
}

export function webhookBlacklistRequest(user: UserInfo, fields: Record<string, string | null | undefined>) {
  const details: string[] = [];
  if (fields.firstName) details.push(`**Prenom** : \`${fields.firstName}\``);
  if (fields.lastName) details.push(`**Nom** : \`${fields.lastName}\``);
  if (fields.email) details.push(`**Email** : \`${fields.email}\``);
  if (fields.phone) details.push(`**Telephone** : \`${fields.phone}\``);
  if (fields.address) details.push(`**Adresse** : \`${fields.address}\``);
  if (fields.reason) details.push(`**Raison** : ${fields.reason}`);

  const desc = [
    userBlock(user),
    sep(),
    `**Details de la demande**`,
    ...(details.length > 0 ? details : ["Aucun champ renseigne"]),
  ].join("\n");

  sendWebhook({
    title: "\u{1F4CB} Demande de Blacklist",
    description: desc,
    color: COLORS.security,
  });
}

export function webhookInfoRequest(user: UserInfo, fields: Record<string, string | null | undefined>) {
  const details: string[] = [];
  if (fields.discordId) details.push(`**Discord ID** : \`${fields.discordId}\``);
  if (fields.email) details.push(`**Email** : \`${fields.email}\``);
  if (fields.pseudo) details.push(`**Pseudo** : \`${fields.pseudo}\``);
  if (fields.ipAddress) details.push(`**IP** : \`${fields.ipAddress}\``);
  if (fields.additionalInfo) details.push(`**Infos** : ${fields.additionalInfo}`);

  const desc = [
    userBlock(user),
    sep(),
    `**Details de la demande d'information**`,
    ...(details.length > 0 ? details : ["Aucun champ renseigne"]),
  ].join("\n");

  sendWebhook({
    title: "\uD83D\uDD0D Demande d'Information",
    description: desc,
    color: COLORS.info,
  });
}

export function webhookSubscriptionExpired(count: number) {
  if (count === 0) return;
  sendWebhook({
    title: "\u{23F0} Abonnements Expires",
    description: `**${count}** abonnement(s) ont expire et ont ete remis en Free.`,
    color: COLORS.info,
  });
}

const ALERT_ROLE_ID = "1469798855099945172";

export function webhookAbnormalActivity(user: UserInfo, searchCount: number, limit: number) {
  const desc = [
    userBlock(user),
    sep(),
    `**Activite Anormale Detectee**`,
    `**Recherches aujourd'hui** : **${searchCount}** / ${limit}`,
    `\nUtilisateur a depasse le seuil d'activite normale.`,
  ].join("\n");

  sendWebhook({
    title: "\u{26A0}\u{FE0F} Activite Suspecte",
    description: desc,
    color: COLORS.security,
    content: `<@&${ALERT_ROLE_ID}>`,
  });
}
