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

export function webhookExternalProxySearch(user: UserInfo, term: string, resultCount: number) {
  const desc = [
    userBlock(user),
    sep(),
    `**Requete** : \`${String(term).slice(0, 200)}\``,
    sep(),
    `**Resultat** : **${resultCount}** trouve(s)`,
  ].join("\n");

  sendSearchWebhook({
    title: "\u{1F50D} Recherche Externe (Proxy)",
    description: desc,
    color: COLORS.search,
  });
}

export function webhookLeakosintSearch(user: UserInfo, request: string, resultCount: number, status?: "ok" | "error", errorReason?: string) {
  const statusIcon = status === "error" ? "\u{1F534}" : "\u{1F7E2}";
  const statusLabel = status === "error" ? `Erreur (${errorReason || "inconnu"})` : "Fonctionnel";
  const desc = [
    userBlock(user),
    sep(),
    `**Requete** : \`${String(request).slice(0, 200)}\``,
    sep(),
    `**Resultat** : **${resultCount}** trouve(s)`,
    `**Etat API** : ${statusIcon} ${statusLabel}`,
  ].join("\n");

  sendSearchWebhook({
    title: "\u{1F4E1} Recherche LeakOSINT",
    description: desc,
    color: status === "error" ? COLORS.admin : COLORS.search,
  });
}

export function webhookDaltonSearch(user: UserInfo, request: string, resultCount: number, status?: "ok" | "error", errorReason?: string) {
  const statusIcon = status === "error" ? "\u{1F534}" : "\u{1F7E2}";
  const statusLabel = status === "error" ? `Erreur (${errorReason || "inconnu"})` : "Fonctionnel";
  const desc = [
    userBlock(user),
    sep(),
    `**Requete** : \`${String(request).slice(0, 200)}\``,
    sep(),
    `**Resultat** : **${resultCount}** trouve(s)`,
    `**Etat API** : ${statusIcon} ${statusLabel}`,
  ].join("\n");

  sendSearchWebhook({
    title: "\u{1F4E1} Recherche DaltonAPI",
    description: desc,
    color: status === "error" ? COLORS.admin : COLORS.search,
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

export function webhookRoleChange(adminEmail: string, target: { email: string; username: string; uniqueId: number | null; userId: string }, newRole: string) {
  const desc = [
    `>>> **Action Admin**`,
    `**Admin** : \`${adminEmail}\``,
    sep(),
    `**Cible** : \`${target.email}\``,
    `**Nom d'utilisateur** : \`${target.username}\``,
    `**ID Unique** : \`${target.uniqueId ?? "N/A"}\``,
    `**ID** : \`${target.userId}\``,
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

export function webhookKeyRedeemed(user: UserInfo, tier: string, key?: string, discordId?: string | null, createdBy?: string | null) {
  const lines = [
    userBlock(user),
    sep(),
    `**Tier** : \`${tier.toUpperCase()}\``,
    `**Duree** : 30 jours`,
  ];

  if (key) lines.push(`**Cle** : ||\`${key}\`||`);
  if (discordId) lines.push(`**Discord** : <@${discordId}> (\`${discordId}\`)`);

  if (createdBy) {
    if (createdBy === "nowpayments") {
      lines.push(`**Cree par** : NOWPayments (paiement auto)`);
    } else if (createdBy.startsWith("discord:")) {
      const cid = createdBy.replace("discord:", "");
      lines.push(`**Cree par** : <@${cid}> (Bot Discord)`);
    } else if (createdBy.startsWith("admin:")) {
      lines.push(`**Cree par** : \`${createdBy.replace("admin:", "")}\` (Panel Admin)`);
    } else {
      lines.push(`**Cree par** : \`${createdBy}\``);
    }
  }

  const desc = lines.join("\n");

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

function getBotLogsWebhookUrl(): string | undefined {
  return process.env.DISCORD_BOT_LOGS_WEBHOOK_URL;
}

async function sendBotLogsWebhook(options: WebhookOptions): Promise<void> {
  const url = getBotLogsWebhookUrl();
  if (!url) {
    console.warn("[webhook] DISCORD_BOT_LOGS_WEBHOOK_URL not set, skipping bot log");
    return;
  }
  await sendToWebhook(url, options, "bot-logs");
}

export function webhookBotGkey(adminTag: string, adminDiscordId: string, tier: string, key: string) {
  const desc = [
    `>>> **Commande Bot**`,
    `**Admin** : <@${adminDiscordId}> (\`${adminTag}\`)`,
    `**Discord ID** : \`${adminDiscordId}\``,
    sep(),
    `**Tier** : \`${tier.toUpperCase()}\``,
    `**Duree** : 30 jours`,
    `**Cle** : ||\`${key}\`||`,
  ].join("\n");

  sendBotLogsWebhook({
    title: "\u{1F511} /gkey - Cle Generee",
    description: desc,
    color: COLORS.admin,
  });
}

export function webhookBotRkey(adminTag: string, key: string, success: boolean) {
  const desc = [
    `>>> **Commande Bot**`,
    `**Admin** : \`${adminTag}\``,
    sep(),
    `**Cle** : \`${key}\``,
    `**Resultat** : ${success ? "Revoquee" : "Introuvable"}`,
  ].join("\n");

  sendBotLogsWebhook({
    title: "\u{26D4} /rkey - Revocation Cle",
    description: desc,
    color: success ? COLORS.admin : COLORS.security,
  });
}

export function webhookBotIkey(adminTag: string, key: string, found: boolean, tier?: string, used?: boolean, usedBy?: string) {
  const details: string[] = [
    `>>> **Commande Bot**`,
    `**Admin** : \`${adminTag}\``,
    sep(),
    `**Cle** : \`${key}\``,
  ];

  if (found) {
    details.push(`**Tier** : \`${(tier || "").toUpperCase()}\``);
    details.push(`**Utilisee** : ${used ? "Oui" : "Non"}`);
    if (usedBy) details.push(`**Par** : \`${usedBy}\``);
  } else {
    details.push(`**Resultat** : Introuvable`);
  }

  sendBotLogsWebhook({
    title: "\u{1F50D} /ikey - Info Cle",
    description: details.join("\n"),
    color: COLORS.info,
  });
}

export function webhookBotIuser(adminTag: string, uniqueId: number, found: boolean, email?: string, tier?: string, frozen?: boolean) {
  const details: string[] = [
    `>>> **Commande Bot**`,
    `**Admin** : \`${adminTag}\``,
    sep(),
    `**ID Unique** : \`#${uniqueId}\``,
  ];

  if (found) {
    if (email) details.push(`**Email** : \`${email}\``);
    if (tier) details.push(`**Tier** : \`${tier.toUpperCase()}\``);
    if (frozen !== undefined) details.push(`**Gele** : ${frozen ? "Oui" : "Non"}`);
  } else {
    details.push(`**Resultat** : Utilisateur introuvable`);
  }

  sendBotLogsWebhook({
    title: "\u{1F464} /iuser - Info Utilisateur",
    description: details.join("\n"),
    color: COLORS.info,
  });
}

export function webhookBotSetplan(adminTag: string, uniqueId: number, email: string, plan: string) {
  const desc = [
    `>>> **Commande Bot**`,
    `**Admin** : \`${adminTag}\``,
    sep(),
    `**ID Unique** : \`#${uniqueId}\``,
    `**Email** : \`${email}\``,
    `**Nouveau Plan** : \`${plan.toUpperCase()}\``,
  ].join("\n");

  sendBotLogsWebhook({
    title: "\u{1F3AD} /setplan - Plan Modifie",
    description: desc,
    color: COLORS.role,
  });
}

export function webhookBotResetR(adminTag: string, adminDiscordId: string, uniqueId: number, email: string, username: string, tier: string) {
  const desc = [
    `>>> **Commande Bot**`,
    `**Reset par** : <@${adminDiscordId}> (\`${adminTag}\`)`,
    sep(),
    `**ID Unique** : \`#${uniqueId}\``,
    `**Email** : \`${email}\``,
    `**Nom d'utilisateur** : \`${username}\``,
    `**Abonnement** : \`${tier.toUpperCase()}\``,
  ].join("\n");

  sendBotLogsWebhook({
    title: "\u{1F504} /resetr - Recherches Reinitialisees",
    description: desc,
    color: COLORS.role,
  });
}

export function webhookBotWantedlist(adminTag: string, count: number) {
  const desc = [
    `>>> **Commande Bot**`,
    `**Admin** : \`${adminTag}\``,
    sep(),
    `**Profils trouves** : **${count}**`,
  ].join("\n");

  sendBotLogsWebhook({
    title: "\u{1F4CB} /wantedlist - Liste Wanted",
    description: desc,
    color: COLORS.info,
  });
}

export function webhookBotGeneric(adminTag: string, command: string, details?: string) {
  const desc = [
    `>>> **Commande Bot**`,
    `**Admin** : \`${adminTag}\``,
    `**Commande** : \`/${command}\``,
    ...(details ? [sep(), details] : []),
  ].join("\n");

  sendBotLogsWebhook({
    title: `\u{2699}\u{FE0F} /${command}`,
    description: desc,
    color: COLORS.info,
  });
}

export function webhookBotKeyRedeemed(username: string, uniqueId: number | undefined, discordId: string | null, tier: string, key: string, createdBy: string | null) {
  const lines = [
    `>>> **Cle Activee**`,
    `**Utilisateur** : \`${username}\``,
    `**ID Unique** : \`#${uniqueId ?? "N/A"}\``,
  ];

  if (discordId) {
    lines.push(`**Discord** : <@${discordId}> (\`${discordId}\`)`);
  } else {
    lines.push(`**Discord** : Non lie`);
  }

  lines.push(sep());
  lines.push(`**Tier** : \`${tier.toUpperCase()}\``);
  lines.push(`**Duree** : 30 jours`);
  lines.push(`**Cle** : ||\`${key}\`||`);

  if (createdBy) {
    if (createdBy === "nowpayments") {
      lines.push(`**Cree par** : NOWPayments (paiement auto)`);
    } else if (createdBy.startsWith("discord:")) {
      const cid = createdBy.replace("discord:", "");
      lines.push(`**Cree par** : <@${cid}> (Bot Discord)`);
    } else if (createdBy.startsWith("admin:")) {
      lines.push(`**Cree par** : \`${createdBy.replace("admin:", "")}\` (Panel Admin)`);
    } else {
      lines.push(`**Cree par** : \`${createdBy}\``);
    }
  } else {
    lines.push(`**Cree par** : Inconnu`);
  }

  sendBotLogsWebhook({
    title: "\u{2705} Cle de Licence Activee",
    description: lines.join("\n"),
    color: COLORS.payment,
  });
}

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
