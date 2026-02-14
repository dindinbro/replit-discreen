import {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder,
} from "discord.js";
import { storage } from "./storage";
import { log } from "./index";

let linksClient: Client | null = null;

const DISCREEN_GUILD_ID = "1130682847749996564";
const SOUTIEN_ROLE_ID = "1469926673582653648";
const CUSTOMER_ROLE_ID = "1469798856937177278";
const PAID_TIERS = ["vip", "pro", "business", "api"];

export async function startLinksBot() {
  if (linksClient) {
    log("Links bot already running, destroying old client...", "links-bot");
    try {
      linksClient.removeAllListeners();
      await linksClient.destroy();
    } catch {}
    linksClient = null;
  }

  const token = process.env.LINKS_BOT_TOKEN;
  if (!token) {
    log("LINKS_BOT_TOKEN not set, Links bot disabled", "links-bot");
    return;
  }

  const clientId = process.env.LINKS_BOT_CLIENT_ID;
  if (!clientId) {
    log("LINKS_BOT_CLIENT_ID not set, Links bot disabled", "links-bot");
    return;
  }

  linksClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
    ],
  });

  const commands = [
    new SlashCommandBuilder()
      .setName("link")
      .setDescription("Lier votre compte Discord a votre compte Discreen")
      .addStringOption((opt) =>
        opt.setName("code")
          .setDescription("Le code de liaison genere depuis votre profil Discreen")
          .setRequired(true)
      ),
  ];

  const rest = new REST().setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands.map((c) => c.toJSON()),
    });
    log("Links bot slash commands registered", "links-bot");
  } catch (err) {
    log(`Links bot command registration error: ${err}`, "links-bot");
  }

  linksClient.once("ready", () => {
    log(`Links bot ready as ${linksClient?.user?.tag}`, "links-bot");
  });

  linksClient.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "link") {
      await handleLink(interaction);
    }
  });

  await linksClient.login(token);
}

async function handleLink(interaction: any) {
  try {
    const code = interaction.options.getString("code", true).trim().toUpperCase();
    const discordId = interaction.user.id;

    const existingSub = await storage.getSubscriptionByDiscordId(discordId);
    if (existingSub) {
      await interaction.reply({ content: "Ce compte Discord est deja lie a un compte Discreen.", ephemeral: true });
      return;
    }

    const result = await storage.consumeDiscordLinkCode(code);
    if (!result) {
      await interaction.reply({ content: "Code invalide ou expire. Generez un nouveau code depuis votre profil Discreen.", ephemeral: true });
      return;
    }

    await storage.setDiscordId(result.userId, discordId);

    const sub = await storage.getSubscription(result.userId);

    if (linksClient) {
      const guild = linksClient.guilds.cache.get(DISCREEN_GUILD_ID);
      if (guild) {
        try {
          const member = await guild.members.fetch(discordId).catch(() => null);
          if (member) {
            if (sub && PAID_TIERS.includes(sub.tier)) {
              if (!member.roles.cache.has(CUSTOMER_ROLE_ID)) {
                await member.roles.add(CUSTOMER_ROLE_ID);
                log(`Assigned customer role to ${discordId} (tier: ${sub.tier})`, "links-bot");
              }
            }
            if (!member.roles.cache.has(SOUTIEN_ROLE_ID)) {
              await member.roles.add(SOUTIEN_ROLE_ID);
            }
          }
        } catch (roleErr) {
          log(`Error assigning roles during link: ${roleErr}`, "links-bot");
        }
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle("Compte lie avec succes !")
      .setDescription(`Ton compte Discord a ete lie a ton compte Discreen.${sub && PAID_TIERS.includes(sub.tier) ? "\nLe role Client t'a ete attribue." : ""}`)
      .setFooter({ text: "Discreen" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    log(`Discord account ${discordId} linked to user ${result.userId} via Links bot`, "links-bot");
  } catch (err) {
    log(`Error in link command: ${err}`, "links-bot");
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Une erreur est survenue lors de la liaison.", ephemeral: true });
    }
  }
}
