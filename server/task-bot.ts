import {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { db } from "./db";
import { discordOAuthTokens, subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { log } from "./index";

let taskClient: Client | null = null;

export async function startTaskBot() {
  if (taskClient) {
    log("Task bot already running, destroying old client...", "task-bot");
    try {
      taskClient.removeAllListeners();
      await taskClient.destroy();
    } catch {}
    taskClient = null;
  }

  const token = process.env.TASK_BOT_TOKEN;
  if (!token) {
    log("TASK_BOT_TOKEN not set, Task bot disabled", "task-bot");
    return;
  }

  const clientId = process.env.TASK_BOT_CLIENT_ID;
  if (!clientId) {
    log("TASK_BOT_CLIENT_ID not set, Task bot disabled", "task-bot");
    return;
  }

  taskClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  const commands = [
    new SlashCommandBuilder()
      .setName("massjoin")
      .setDescription("Faire rejoindre tous les utilisateurs autorisés sur ce serveur")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
      .setName("authstats")
      .setDescription("Voir le nombre d'utilisateurs ayant autorisé le bot")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  ];

  const rest = new REST().setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands.map((c) => c.toJSON()),
    });
    log("Task bot slash commands registered", "task-bot");
  } catch (err) {
    log(`Task bot command registration error: ${err}`, "task-bot");
  }

  taskClient.once("ready", () => {
    log(`Task bot ready as ${taskClient?.user?.tag}`, "task-bot");
  });

  taskClient.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "massjoin") {
      await handleMassJoin(interaction);
    }

    if (interaction.commandName === "authstats") {
      await handleAuthStats(interaction);
    }
  });

  await taskClient.login(token);
}

async function handleMassJoin(interaction: any) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply({ content: "Cette commande doit etre utilisee dans un serveur." });
      return;
    }

    const tokens = await db.select().from(discordOAuthTokens);
    if (tokens.length === 0) {
      await interaction.editReply({ content: "Aucun utilisateur n'a autorise le bot." });
      return;
    }

    const botToken = process.env.TASK_BOT_TOKEN!;
    let added = 0;
    let alreadyIn = 0;
    let failed = 0;
    let expired = 0;

    const BATCH_SIZE = 5;
    const DELAY_MS = 1500;

    for (let i = 0; i < tokens.length; i++) {
      const oauthToken = tokens[i];
      try {
        let accessToken = oauthToken.accessToken;

        if (oauthToken.expiresAt && new Date(oauthToken.expiresAt) < new Date()) {
          const refreshed = await refreshAccessToken(oauthToken.refreshToken, oauthToken.discordId);
          if (!refreshed) {
            expired++;
            continue;
          }
          accessToken = refreshed;
        }

        const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${oauthToken.discordId}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ access_token: accessToken }),
        });

        if (res.status === 201) {
          added++;
        } else if (res.status === 204) {
          alreadyIn++;
        } else if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("retry-after") || "5", 10);
          log(`Rate limited, waiting ${retryAfter}s...`, "task-bot");
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          i--;
          continue;
        } else {
          const errText = await res.text();
          log(`MassJoin failed for ${oauthToken.discordId}: ${res.status} ${errText}`, "task-bot");
          failed++;
        }

        if ((i + 1) % BATCH_SIZE === 0 && i < tokens.length - 1) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      } catch (err) {
        log(`MassJoin error for ${oauthToken.discordId}: ${err}`, "task-bot");
        failed++;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle("Mass Join - Resultats")
      .addFields(
        { name: "Ajoutes", value: `${added}`, inline: true },
        { name: "Deja presents", value: `${alreadyIn}`, inline: true },
        { name: "Echecs", value: `${failed}`, inline: true },
        { name: "Tokens expires", value: `${expired}`, inline: true },
        { name: "Total traites", value: `${tokens.length}`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    log(`MassJoin command error: ${err}`, "task-bot");
    try {
      await interaction.editReply({ content: "Erreur lors du mass join." });
    } catch {}
  }
}

async function handleAuthStats(interaction: any) {
  try {
    const tokens = await db.select().from(discordOAuthTokens);
    const validCount = tokens.filter(
      (t) => !t.expiresAt || new Date(t.expiresAt) > new Date()
    ).length;

    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle("Statistiques d'autorisation")
      .addFields(
        { name: "Utilisateurs autorises", value: `${tokens.length}`, inline: true },
        { name: "Tokens valides", value: `${validCount}`, inline: true },
        { name: "Tokens expires", value: `${tokens.length - validCount}`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    log(`AuthStats error: ${err}`, "task-bot");
    await interaction.reply({ content: "Erreur.", ephemeral: true });
  }
}

async function refreshAccessToken(refreshToken: string | null, discordId: string): Promise<string | null> {
  if (!refreshToken) return null;

  const clientId = process.env.TASK_BOT_CLIENT_ID;
  const clientSecret = process.env.TASK_BOT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      log(`Token refresh failed for ${discordId}: ${res.status}`, "task-bot");
      return null;
    }

    const data: any = await res.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await db.update(discordOAuthTokens)
      .set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(discordOAuthTokens.discordId, discordId));

    return data.access_token;
  } catch (err) {
    log(`Token refresh error for ${discordId}: ${err}`, "task-bot");
    return null;
  }
}
