import {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder,
  PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, ChannelType,
  Partials, OverwriteType,
  type ButtonInteraction, type ModalSubmitInteraction, type ChannelSelectMenuInteraction
} from "discord.js";
import { storage } from "./storage";
import { log } from "./index";
import { createClient } from "@supabase/supabase-js";
import type { PlanTier } from "@shared/schema";
import {
  webhookBotGkey, webhookBotRkey, webhookBotIkey, webhookBotIuser,
  webhookBotSetplan, webhookBotWantedlist, webhookBotGeneric
} from "./webhook";

let client: Client | null = null;
const SOUTIEN_ROLE_ID = "1469926673582653648";

export async function startDiscordBot() {
  if (client) {
    log("Discord bot already running, destroying old client...", "discord");
    try {
      client.removeAllListeners();
      await client.destroy();
    } catch {}
    client = null;
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    log("DISCORD_BOT_TOKEN not set, Discord bot disabled", "discord");
    return;
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    log("DISCORD_CLIENT_ID not set, Discord bot disabled", "discord");
    return;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Reaction],
  });

  const vouchCommand = new SlashCommandBuilder()
    .setName("vouch")
    .setDescription("Laisser un avis sur Discreen")
    .addIntegerOption((opt) =>
      opt
        .setName("note")
        .setDescription("Note de 1 a 5 etoiles")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5)
    )
    .addStringOption((opt) =>
      opt
        .setName("commentaire")
        .setDescription("Votre avis sur le service")
        .setRequired(true)
        .setMaxLength(500)
    );

  const deleteVouchCommand = new SlashCommandBuilder()
    .setName("deletevouch")
    .setDescription("Supprimer votre avis");

  const massiveRoleCommand = new SlashCommandBuilder()
    .setName("massiverole")
    .setDescription("Ajouter un role a tous les membres du serveur")
    .addRoleOption((opt) =>
      opt
        .setName("role")
        .setDescription("Le role a ajouter a tous les membres")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const embedCommand = new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Creer un embed interactif avec des boutons de modification")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const tosCommand = new SlashCommandBuilder()
    .setName("tos")
    .setDescription("Afficher les conditions d'utilisation du service")
    .addChannelOption((opt) =>
      opt
        .setName("salon")
        .setDescription("Le salon ou envoyer le TOS (par defaut: salon actuel)")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const sayCommand = new SlashCommandBuilder()
    .setName("say")
    .setDescription("Envoyer un message via le bot dans un salon")
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription("Le message a envoyer")
        .setRequired(true)
        .setMaxLength(2000)
    )
    .addChannelOption((opt) =>
      opt
        .setName("salon")
        .setDescription("Le salon ou envoyer le message")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addAttachmentOption((opt) =>
      opt.setName("image1").setDescription("Image 1").setRequired(false)
    )
    .addAttachmentOption((opt) =>
      opt.setName("image2").setDescription("Image 2").setRequired(false)
    )
    .addAttachmentOption((opt) =>
      opt.setName("image3").setDescription("Image 3").setRequired(false)
    )
    .addAttachmentOption((opt) =>
      opt.setName("image4").setDescription("Image 4").setRequired(false)
    )
    .addAttachmentOption((opt) =>
      opt.setName("image5").setDescription("Image 5").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const gkeyCommand = new SlashCommandBuilder()
    .setName("gkey")
    .setDescription("Generer une cle de licence")
    .addStringOption((opt) =>
      opt
        .setName("tier")
        .setDescription("Le tier de l'abonnement")
        .setRequired(true)
        .addChoices(
          { name: "VIP", value: "vip" },
          { name: "PRO", value: "pro" },
          { name: "Business", value: "business" },
          { name: "API", value: "api" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const rkeyCommand = new SlashCommandBuilder()
    .setName("rkey")
    .setDescription("Revoquer une cle de licence")
    .addStringOption((opt) =>
      opt
        .setName("cle")
        .setDescription("La cle a revoquer")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const ikeyCommand = new SlashCommandBuilder()
    .setName("ikey")
    .setDescription("Informations sur une cle de licence")
    .addStringOption((opt) =>
      opt
        .setName("cle")
        .setDescription("La cle a verifier")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const iuserCommand = new SlashCommandBuilder()
    .setName("iuser")
    .setDescription("Informations sur un utilisateur par ID unique")
    .addIntegerOption((opt) =>
      opt
        .setName("idunique")
        .setDescription("L'ID unique de l'utilisateur")
        .setRequired(true)
        .setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const setplanCommand = new SlashCommandBuilder()
    .setName("setplan")
    .setDescription("Changer l'abonnement d'un utilisateur")
    .addIntegerOption((opt) =>
      opt
        .setName("idunique")
        .setDescription("L'ID unique de l'utilisateur")
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption((opt) =>
      opt
        .setName("plan")
        .setDescription("Le plan a attribuer")
        .setRequired(true)
        .addChoices(
          { name: "Free", value: "free" },
          { name: "VIP", value: "vip" },
          { name: "PRO", value: "pro" },
          { name: "Business", value: "business" },
          { name: "API", value: "api" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const setupTicketCommand = new SlashCommandBuilder()
    .setName("setupticket")
    .setDescription("Configurer le systeme de tickets dans un salon")
    .addChannelOption((opt) =>
      opt
        .setName("salon")
        .setDescription("Le salon ou envoyer l'embed de tickets")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const statusCommand = new SlashCommandBuilder()
    .setName("status")
    .setDescription("Afficher le statut des services du bot dans un salon")
    .addChannelOption((opt) =>
      opt
        .setName("salon")
        .setDescription("Le salon ou envoyer le statut")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const soutienCommand = new SlashCommandBuilder()
    .setName("soutien")
    .setDescription("Envoyer l'embed du role Soutien dans un salon")
    .addChannelOption((opt) =>
      opt
        .setName("salon")
        .setDescription("Le salon ou envoyer l'embed Soutien")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const renewCommand = new SlashCommandBuilder()
    .setName("renew")
    .setDescription("Recreer le salon actuel (memes permissions, meme position)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const linksCommand = new SlashCommandBuilder()
    .setName("links")
    .setDescription("Afficher les liens officiels de Discreen")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Salon ou envoyer les liens")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    );

  const linkCommand = new SlashCommandBuilder()
    .setName("link")
    .setDescription("Lier ton compte Discord a ton compte Discreen")
    .addStringOption((option) =>
      option
        .setName("code")
        .setDescription("Le code de verification genere depuis ton profil Discreen")
        .setRequired(true)
    );

  const wantedCommand = new SlashCommandBuilder()
    .setName("wantedlist")
    .setDescription("Lister tous les pseudos de l'historique Wanted")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const wantedPreviewCommand = new SlashCommandBuilder()
    .setName("wantedpreview")
    .setDescription("Voir la liste des pseudos Wanted (10 par page)");

  const wrefreshCommand = new SlashCommandBuilder()
    .setName("wrefresh")
    .setDescription("Actualiser la liste Wanted et voir les ajouts recents")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    log("Registering Discord slash commands...", "discord");
    await rest.put(Routes.applicationCommands(clientId), {
      body: [
        vouchCommand.toJSON(),
        deleteVouchCommand.toJSON(),
        massiveRoleCommand.toJSON(),
        embedCommand.toJSON(),
        sayCommand.toJSON(),
        tosCommand.toJSON(),
        gkeyCommand.toJSON(),
        rkeyCommand.toJSON(),
        ikeyCommand.toJSON(),
        iuserCommand.toJSON(),
        setplanCommand.toJSON(),
        setupTicketCommand.toJSON(),
        statusCommand.toJSON(),
        soutienCommand.toJSON(),
        renewCommand.toJSON(),
        linksCommand.toJSON(),
        linkCommand.toJSON(),
        wantedCommand.toJSON(),
        wantedPreviewCommand.toJSON(),
        wrefreshCommand.toJSON()
      ],
    });
    log("Discord slash commands registered", "discord");
  } catch (err) {
    log(`Failed to register slash commands: ${err}`, "discord");
    return;
  }

  client.once("clientReady", async () => {
    log(`Discord bot logged in as ${client?.user?.tag}`, "discord");
    const commands = [
      vouchCommand.toJSON(),
      deleteVouchCommand.toJSON(),
      massiveRoleCommand.toJSON(),
      embedCommand.toJSON(),
      sayCommand.toJSON(),
      tosCommand.toJSON(),
      gkeyCommand.toJSON(),
      rkeyCommand.toJSON(),
      ikeyCommand.toJSON(),
      iuserCommand.toJSON(),
      setplanCommand.toJSON(),
      setupTicketCommand.toJSON(),
      statusCommand.toJSON(),
      soutienCommand.toJSON(),
      renewCommand.toJSON(),
      linksCommand.toJSON(),
      linkCommand.toJSON(),
      wantedCommand.toJSON(),
      wantedPreviewCommand.toJSON(),
      wrefreshCommand.toJSON()
    ];
    const guilds = client?.guilds.cache;
    if (guilds) {
      for (const [guildId, guild] of Array.from(guilds.entries())) {
        try {
          await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
          log(`Guild commands registered for ${guild.name} (${guildId})`, "discord");
        } catch (err) {
          log(`Failed to register guild commands for ${guild.name}: ${err}`, "discord");
        }
      }
    }

    // Auto-sync approved vouches from Discord channel
    try {
      const vouchCh = client?.channels.cache.get("1469798983168688219") ||
        await client?.channels.fetch("1469798983168688219").catch(() => null);
      if (vouchCh && vouchCh.isTextBased() && "messages" in vouchCh) {
        let imported = 0;
        let lastId: string | undefined;
        let allMessages: any[] = [];

        // Fetch all messages (100 at a time)
        while (true) {
          const fetched = await (vouchCh as any).messages.fetch({ limit: 100, ...(lastId ? { before: lastId } : {}) });
          if (fetched.size === 0) break;
          allMessages = allMessages.concat(Array.from(fetched.values()));
          lastId = fetched.last()?.id;
          if (fetched.size < 100) break;
        }

        for (const msg of allMessages) {
          const embed = msg.embeds?.[0];
          if (!embed || !embed.title?.includes("Approuve")) continue;

          const discordIdField = embed.fields?.find((f: any) => f.name === "ID Discord");
          const auteurField = embed.fields?.find((f: any) => f.name === "Auteur");
          const noteField = embed.fields?.find((f: any) => f.name === "Note");

          if (!discordIdField || !auteurField || !noteField) continue;

          const discordUserId = discordIdField.value;
          const existing = await storage.getVouchByDiscordUser(discordUserId);
          if (existing) continue;

          const discordUsername = auteurField.value;
          const rating = (noteField.value.match(/★/g) || []).length;
          const comment = embed.description || "";
          const discordAvatar = embed.thumbnail?.url || "";

          await storage.createVouch({
            discordUserId,
            discordUsername,
            discordAvatar,
            rating,
            comment,
          });
          imported++;
          log(`Re-imported vouch from ${discordUsername}`, "discord");
        }

        if (imported > 0) {
          log(`Vouch sync complete: ${imported} vouches re-imported from Discord`, "discord");
        } else {
          log(`Vouch sync complete: all vouches already in database`, "discord");
        }
      }
    } catch (err) {
      log(`Error syncing vouches from Discord: ${err}`, "discord");
    }
  });

  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    try {
      const wasBoosting = !!oldMember.premiumSince;
      const isBoosting = !!newMember.premiumSince;

      if (!wasBoosting && isBoosting) {
        if (!newMember.roles.cache.has(SOUTIEN_ROLE_ID)) {
          await newMember.roles.add(SOUTIEN_ROLE_ID);
          log(`Role Soutien ajoute a ${newMember.user.tag} (boost)`, "discord");
        }
      }

      if (wasBoosting && !isBoosting) {
        if (newMember.roles.cache.has(SOUTIEN_ROLE_ID)) {
          await newMember.roles.remove(SOUTIEN_ROLE_ID);
          log(`Role Soutien retire de ${newMember.user.tag} (fin boost)`, "discord");
        }
      }
    } catch (err) {
      log(`Erreur gestion role Soutien: ${err}`, "discord");
    }
  });

  const vouchChannelId = "1469798983168688219";

  client.on("messageReactionAdd", async (reaction, user) => {
    try {
      if (user.bot) return;

      if (reaction.partial) {
        try { await reaction.fetch(); } catch { return; }
      }
      if (reaction.message.partial) {
        try { await reaction.message.fetch(); } catch { return; }
      }

      if (reaction.message.channel.id !== vouchChannelId) return;

      const embed = reaction.message.embeds[0];
      if (!embed || !embed.title?.includes("En attente")) return;

      const member = reaction.message.guild?.members.cache.get(user.id) ||
        await reaction.message.guild?.members.fetch(user.id).catch(() => null);
      if (!member || !member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

      const emoji = reaction.emoji.name;

      if (emoji === "✅") {
        const discordIdField = embed.fields.find(f => f.name === "ID Discord");
        const auteurField = embed.fields.find(f => f.name === "Auteur");
        const noteField = embed.fields.find(f => f.name === "Note");

        if (!discordIdField || !auteurField || !noteField) return;

        const discordUserId = discordIdField.value;
        const discordUsername = auteurField.value;
        const rating = (noteField.value.match(/★/g) || []).length;
        const comment = embed.description || "";
        const discordAvatar = embed.thumbnail?.url || "";

        const existing = await storage.getVouchByDiscordUser(discordUserId);
        if (existing) {
          log(`Vouch already exists for ${discordUserId}, skipping`, "discord");
          return;
        }

        await storage.createVouch({
          discordUserId,
          discordUsername,
          discordAvatar,
          rating,
          comment,
        });

        const approvedEmbed = EmbedBuilder.from(embed)
          .setTitle("Avis Discreen (Approuve)")
          .setColor(0x10b981)
          .setFooter({ text: "© Discreen - Vouches" });

        await reaction.message.edit({ embeds: [approvedEmbed] });
        await reaction.message.reactions.removeAll().catch(() => {});

        log(`Vouch approved for ${discordUsername} by ${user.username}`, "discord");
      } else if (emoji === "❌") {
        const rejectedEmbed = EmbedBuilder.from(embed)
          .setTitle("Avis Discreen (Refuse)")
          .setColor(0xe74c3c)
          .setFooter({ text: "© Discreen - Vouches" });

        await reaction.message.edit({ embeds: [rejectedEmbed] });
        await reaction.message.reactions.removeAll().catch(() => {});

        log(`Vouch rejected by ${user.username}`, "discord");
      }
    } catch (err) {
      log(`Error handling vouch reaction: ${err}`, "discord");
    }
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "vouch") {
      const rating = interaction.options.getInteger("note", true);
      const comment = interaction.options.getString("commentaire", true);
      const discordUserId = interaction.user.id;
      const discordUsername = interaction.user.username;
      const discordAvatar = interaction.user.displayAvatarURL({ size: 128 });

      try {
        const existing = await storage.getVouchByDiscordUser(discordUserId);
        if (existing) {
          await interaction.reply({
            content: "Vous avez deja laisse un avis. Utilisez `/deletevouch` pour le supprimer avant d'en poster un nouveau.",
            ephemeral: true,
          });
          return;
        }

        const stars = getStarsDisplay(rating);

        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("Nouvel avis Discreen (En attente)")
          .setDescription(comment)
          .addFields(
            { name: "Note", value: stars, inline: true },
            { name: "Auteur", value: discordUsername, inline: true },
            { name: "ID Discord", value: discordUserId, inline: true }
          )
          .setThumbnail(discordAvatar)
          .setTimestamp()
          .setFooter({ text: "© Discreen - Vouches" });

        const channel = interaction.guild?.channels.cache.get(vouchChannelId);

        if (channel && channel.isTextBased() && "send" in channel) {
          const message = await (channel as any).send({ embeds: [embed] });
          await message.react("✅");
          await message.react("❌");

          await interaction.reply({
            content: "Votre avis a été envoyé pour modération. Merci !",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "Le salon des avis est mal configuré. Contactez un administrateur.",
            ephemeral: true,
          });
        }
      } catch (err) {
        log(`Error creating vouch: ${err}`, "discord");
        await interaction.reply({
          content: "Une erreur est survenue. Reessayez plus tard.",
          ephemeral: true,
        });
      }
    }

    if (interaction.commandName === "massiverole") {
      if (!interaction.guild) {
        await interaction.reply({
          content: "Cette commande ne peut etre utilisee que dans un serveur.",
          ephemeral: true,
        });
        return;
      }

      const role = interaction.options.getRole("role", true);

      if (role.managed || role.id === interaction.guild.id) {
        await interaction.reply({
          content: "Ce role ne peut pas etre attribue (role gere par une integration ou role @everyone).",
          ephemeral: true,
        });
        return;
      }

      const botMember = interaction.guild.members.me;
      if (botMember && botMember.roles.highest.position <= role.position) {
        await interaction.reply({
          content: "Le bot n'a pas la permission d'attribuer ce role. Son role le plus eleve doit etre au-dessus du role cible.",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      try {
        const members = await interaction.guild.members.fetch();
        const memberArray = Array.from(members.values());
        let added = 0;
        let skipped = 0;
        let failed = 0;

        for (const member of memberArray) {
          if (member.user.bot) {
            skipped++;
            continue;
          }
          if (member.roles.cache.has(role.id)) {
            skipped++;
            continue;
          }
          try {
            await member.roles.add(role.id);
            added++;
          } catch {
            failed++;
          }
        }

        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("Massiverole termine")
          .addFields(
            { name: "Role", value: `<@&${role.id}>`, inline: true },
            { name: "Ajoute", value: `${added}`, inline: true },
            { name: "Ignore", value: `${skipped}`, inline: true },
            { name: "Echoue", value: `${failed}`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: `Execute par ${interaction.user.username}` });

        await interaction.editReply({ embeds: [embed] });
        webhookBotGeneric(interaction.user.tag, "massiverole", `**Role** : ${role.name}\n**Ajoute** : ${added}\n**Ignore** : ${skipped}\n**Echoue** : ${failed}`);
        log(`massiverole: ${added} added, ${skipped} skipped, ${failed} failed for role ${role.name}`, "discord");
      } catch (err) {
        log(`Error in massiverole: ${err}`, "discord");
        await interaction.editReply("Une erreur est survenue lors de l'attribution du role.");
      }
    }

    if (interaction.commandName === "embed") {
      try {
        const embed = new EmbedBuilder()
          .setTitle("Nouvel Embed")
          .setDescription("Utilisez les boutons ci-dessous pour modifier cet embed.")
          .setColor(0x10b981);

        const rows = buildEmbedButtons();

        const reply = await interaction.reply({
          embeds: [embed],
          components: rows,
          fetchReply: true,
        });

        embedSessions.set(reply.id, interaction.user.id);

        setTimeout(() => {
          embedSessions.delete(reply.id);
        }, 15 * 60 * 1000);
      } catch (err) {
        log(`Error in embed command: ${err}`, "discord");
        await interaction.reply({
          content: "Une erreur est survenue.",
          ephemeral: true,
        });
      }
    }

    if (interaction.commandName === "say") {
      try {
        const message = interaction.options.getString("message", true);
        const salon = interaction.options.getChannel("salon", true);

        const files: { attachment: string; name: string }[] = [];
        for (let i = 1; i <= 5; i++) {
          const img = interaction.options.getAttachment(`image${i}`);
          if (img) files.push({ attachment: img.url, name: img.name });
        }

        const targetChannel = interaction.guild?.channels.cache.get(salon.id);
        if (targetChannel && targetChannel.isTextBased() && "send" in targetChannel) {
          const sendOptions: any = { content: message };
          if (files.length > 0) {
            sendOptions.files = files;
          }
          await (targetChannel as any).send(sendOptions);
          await interaction.reply({
            content: `Message envoye dans <#${salon.id}>`,
            ephemeral: true,
          });
          webhookBotGeneric(interaction.user.tag, "say", `**Salon** : <#${salon.id}>\n**Message** : \`${message.slice(0, 100)}${message.length > 100 ? "..." : ""}\``);
        } else {
          await interaction.reply({
            content: "Impossible d'envoyer dans ce salon.",
            ephemeral: true,
          });
        }
      } catch (err) {
        log(`Error in say command: ${err}`, "discord");
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "Une erreur est survenue.",
            ephemeral: true,
          });
        }
      }
    }

    if (interaction.commandName === "tos") {
      try {
        const salon = interaction.options.getChannel("salon");

        const tosEmbed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("\u{1f4dc} Conditions d'Utilisation \u2014 Discreen")
          .setDescription("En utilisant Discreen, vous acceptez les conditions suivantes.")
          .addFields(
            {
              name: "\u{1f50d} Qu'est-ce que Discreen ?",
              value: "Discreen est un moteur de recherche permettant d'explorer des bases de donnees issues de fuites publiques et librement accessibles sur Internet. Aucune collecte illegale n'est realisee par nos services.",
              inline: false,
            },
            {
              name: "\u{1f4c1} Origine des donnees",
              value: "L'ensemble des informations indexees provient de bases de donnees compromises rendues publiques par des tiers. Discreen n'est en aucun cas a l'origine de ces fuites de donnees.",
              inline: false,
            },
            {
              name: "\u2705 Usages autorises",
              value: [
                "\u2022 Verification de la compromission de vos propres donnees personnelles",
                "\u2022 Recherche en cybersecurite (OSINT, threat intelligence)",
                "\u2022 Sensibilisation a la protection des donnees",
                "\u2022 Audit de securite dans un cadre professionnel",
              ].join("\n"),
              inline: true,
            },
            {
              name: "\u274c Usages strictement interdits",
              value: [
                "\u2022 Harcelement, doxing ou atteinte a la vie privee",
                "\u2022 Usurpation d'identite ou fraude",
                "\u2022 Revente ou redistribution des donnees",
                "\u2022 Toute activite contraire a la loi",
              ].join("\n"),
              inline: true,
            },
            {
              name: "\u26a0\ufe0f Responsabilite",
              value: "Discreen est un outil neutre mis a disposition a des fins de recherche et de securite. Vous etes seul responsable de l'usage que vous faites des informations obtenues via notre plateforme.",
              inline: false,
            },
            {
              name: "\u{1f6e1}\ufe0f Demandes de suppression",
              value: "Les donnees indexees proviennent de fuites rendues publiques. Discreen ne procede pas aux suppressions individuelles de donnees. Pour toute demande, contactez directement la source d'origine.",
              inline: false,
            },
            {
              name: "\u{1f4b3} Abonnements & Remboursements",
              value: "Les abonnements sont non-remboursables apres activation. En souscrivant, vous reconnaissez accepter l'integralite de ces conditions.",
              inline: false,
            },
          )
          .setFooter({ text: "Discreen \u2022 En utilisant nos services, vous acceptez ces conditions." })
          .setTimestamp();

        if (salon && salon.id !== interaction.channelId) {
          const targetChannel = interaction.guild?.channels.cache.get(salon.id);
          if (targetChannel && targetChannel.isTextBased() && "send" in targetChannel) {
            await (targetChannel as any).send({ embeds: [tosEmbed] });
            await interaction.reply({
              content: `TOS envoye dans <#${salon.id}>`,
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: "Impossible d'envoyer dans ce salon.",
              ephemeral: true,
            });
          }
        } else {
          await interaction.reply({ embeds: [tosEmbed] });
        }
      } catch (err) {
        log(`Error in tos command: ${err}`, "discord");
        await interaction.reply({
          content: "Une erreur est survenue.",
          ephemeral: true,
        });
      }
    }

    if (interaction.commandName === "deletevouch") {
      const discordUserId = interaction.user.id;

      try {
        const existing = await storage.getVouchByDiscordUser(discordUserId);
        if (!existing) {
          await interaction.reply({
            content: "Vous n'avez pas d'avis a supprimer.",
            ephemeral: true,
          });
          return;
        }

        await storage.deleteVouch(existing.id);
        await interaction.reply({
          content: "Votre avis a ete supprime avec succes.",
          ephemeral: true,
        });
      } catch (err) {
        log(`Error deleting vouch: ${err}`, "discord");
        await interaction.reply({
          content: "Une erreur est survenue. Reessayez plus tard.",
          ephemeral: true,
        });
      }
    }

    if (interaction.commandName === "gkey") {
      try {
        const tier = interaction.options.getString("tier", true) as any;
        const license = await (storage as any).createLicenseKey(tier);
        
        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("Cle de licence generee")
          .addFields(
            { name: "Cle", value: `\`${license.key}\`` },
            { name: "Tier", value: tier.toUpperCase(), inline: true },
            { name: "Duree", value: "30 jours", inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        webhookBotGkey(interaction.user.tag, interaction.user.id, tier, license.key);
      } catch (err) {
        log(`Error generating key: ${err}`, "discord");
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "Erreur lors de la generation.", ephemeral: true });
        }
      }
    }

    if (interaction.commandName === "rkey") {
      try {
        const key = interaction.options.getString("cle", true);
        const success = await (storage as any).revokeLicenseKey(key);
        
        if (success) {
          await interaction.reply({ content: `La cle \`${key}\` a ete revoquee.`, ephemeral: true });
        } else {
          await interaction.reply({ content: "Cle introuvable.", ephemeral: true });
        }
        webhookBotRkey(interaction.user.tag, key, !!success);
      } catch (err) {
        log(`Error revoking key: ${err}`, "discord");
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "Erreur lors de la revocation.", ephemeral: true });
        }
      }
    }

    if (interaction.commandName === "iuser") {
      try {
        const uniqueId = interaction.options.getInteger("idunique", true);
        const sub = await storage.getSubscriptionByUniqueId(uniqueId);

        if (!sub) {
          await interaction.reply({ content: `Aucun utilisateur trouve avec l'ID unique \`${uniqueId}\`.`, ephemeral: true });
          webhookBotIuser(interaction.user.tag, uniqueId, false);
          return;
        }

        let email = "Inconnu";
        let username = "Inconnu";
        let createdAt: Date | null = null;
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && supabaseKey) {
          const supaAdmin = createClient(supabaseUrl, supabaseKey);
          const { data } = await supaAdmin.auth.admin.getUserById(sub.userId);
          if (data?.user) {
            email = data.user.email || "Inconnu";
            username = data.user.user_metadata?.display_name || data.user.user_metadata?.username || data.user.email?.split("@")[0] || "Inconnu";
            if (data.user.created_at) {
              createdAt = new Date(data.user.created_at);
            }
          }
        }

        let tier = sub.tier || "free";
        let expiryStr = "Aucun";
        if (sub.expiresAt) {
          const expDate = new Date(sub.expiresAt);
          const now = new Date();
          if (expDate < now) {
            tier = "free";
            expiryStr = "Expire";
          } else {
            const diffMs = expDate.getTime() - now.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const expDay = expDate.getDate().toString().padStart(2, "0");
            const expMonth = (expDate.getMonth() + 1).toString().padStart(2, "0");
            const expYear = expDate.getFullYear();
            expiryStr = `${diffDays}j ${diffHours}h restant (${expDay}/${expMonth}/${expYear})`;
          }
        }

        let joinedStr = "Inconnu";
        if (createdAt) {
          const now = new Date();
          const diffMs = now.getTime() - createdAt.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const day = createdAt.getDate().toString().padStart(2, "0");
          const month = (createdAt.getMonth() + 1).toString().padStart(2, "0");
          const year = createdAt.getFullYear();
          const dateStr = `${day}/${month}/${year}`;
          if (diffDays === 0) {
            joinedStr = `Rejoint aujourd'hui (${dateStr})`;
          } else if (diffDays === 1) {
            joinedStr = `Rejoint hier (${dateStr})`;
          } else {
            joinedStr = `Rejoint il y a ${diffDays} jours (${dateStr})`;
          }
        }

        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle(`Utilisateur #${uniqueId}`)
          .addFields(
            { name: "ID Unique", value: `\`${uniqueId}\``, inline: true },
            { name: "Email", value: email, inline: true },
            { name: "Nom d'utilisateur", value: username, inline: true },
            { name: "Abonnement", value: tier.toUpperCase(), inline: true },
            { name: "Gele", value: sub.frozen ? "Oui" : "Non", inline: true },
            { name: "Expiration", value: expiryStr, inline: true },
            { name: "Inscription", value: joinedStr, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        webhookBotIuser(interaction.user.tag, uniqueId, true, email, tier, sub.frozen);
      } catch (err) {
        log(`Error in /iuser: ${err}`, "discord");
        await interaction.reply({ content: "Erreur lors de la recuperation des informations.", ephemeral: true });
      }
    }

    if (interaction.commandName === "setplan") {
      try {
        await interaction.deferReply({ ephemeral: true });
        const uniqueId = interaction.options.getInteger("idunique", true);
        const plan = interaction.options.getString("plan", true);
        const sub = await storage.getSubscriptionByUniqueId(uniqueId);

        if (!sub) {
          await interaction.editReply({ content: `Aucun utilisateur trouve avec l'ID unique \`${uniqueId}\`.` });
          return;
        }

        await storage.upsertSubscription(sub.userId, plan as PlanTier);

        const CUSTOMER_ROLE_ID = "1469798856937177278";
        const PAID_TIERS = ["vip", "pro", "business", "api"];
        if (sub.discordId) {
          try {
            const guild = client.guilds.cache.get(DISCREEN_GUILD_ID);
            if (guild) {
              const member = await guild.members.fetch(sub.discordId).catch(() => null);
              if (member) {
                if (PAID_TIERS.includes(plan)) {
                  if (!member.roles.cache.has(CUSTOMER_ROLE_ID)) {
                    await member.roles.add(CUSTOMER_ROLE_ID);
                    log(`Customer role added to ${sub.discordId} (plan: ${plan})`, "discord");
                  }
                } else {
                  if (member.roles.cache.has(CUSTOMER_ROLE_ID)) {
                    await member.roles.remove(CUSTOMER_ROLE_ID);
                    log(`Customer role removed from ${sub.discordId} (plan: ${plan})`, "discord");
                  }
                }
              }
            }
          } catch (roleErr) {
            log(`/setplan: Error managing customer role: ${roleErr}`, "discord");
          }
        }

        let email = "Inconnu";
        try {
          const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (supabaseUrl && supabaseKey) {
            const supaAdmin = createClient(supabaseUrl, supabaseKey);
            const { data } = await supaAdmin.auth.admin.getUserById(sub.userId);
            if (data?.user) {
              email = data.user.email || "Inconnu";
            }
          }
        } catch (supaErr) {
          log(`/setplan: Supabase lookup failed: ${supaErr}`, "discord");
        }

        const embed = new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle("Abonnement Modifie")
          .addFields(
            { name: "ID Unique", value: `\`${uniqueId}\``, inline: true },
            { name: "Email", value: email, inline: true },
            { name: "Nouveau Plan", value: plan.toUpperCase(), inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        webhookBotSetplan(interaction.user.tag, uniqueId, email, plan);
        log(`/setplan: User #${uniqueId} set to ${plan} by ${interaction.user.username}`, "discord");
      } catch (err) {
        log(`Error in /setplan: ${err}`, "discord");
        if (interaction.deferred) {
          await interaction.editReply({ content: "Erreur lors de la modification de l'abonnement." });
        } else if (!interaction.replied) {
          await interaction.reply({ content: "Erreur lors de la modification de l'abonnement.", ephemeral: true });
        }
      }
    }

    if (interaction.commandName === "setupticket") {
      try {
        const salon = interaction.options.getChannel("salon", true);
        const targetChannel = interaction.guild?.channels.cache.get(salon.id);

        if (!targetChannel || !targetChannel.isTextBased() || !("send" in targetChannel)) {
          await interaction.reply({ content: "Impossible d'envoyer dans ce salon.", ephemeral: true });
          return;
        }

        const ticketEmbed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("Tickets")
          .setDescription(
            "**Une question ou un souci ?**\n" +
            "Le support Discreen est la pour t'aider simplement et rapidement.\n\n" +
            "Contacte-nous, on s'occupe du reste."
          )
          .setFooter({ text: "Discreen Support" })
          .setTimestamp();

        const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("ticket_aide").setLabel("Aide par rapport au site").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("ticket_suggestion").setLabel("Suggestion").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("ticket_autre").setLabel("Autre").setStyle(ButtonStyle.Primary),
        );
        const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("ticket_db").setLabel("Demande ajout de DB").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("ticket_paiement").setLabel("Paiements").setStyle(ButtonStyle.Secondary),
        );

        await (targetChannel as any).send({ embeds: [ticketEmbed], components: [row1, row2] });
        await interaction.reply({ content: `Systeme de tickets configure dans <#${salon.id}>`, ephemeral: true });
        webhookBotGeneric(interaction.user.tag, "setupticket", `**Salon** : <#${salon.id}>`);
        log(`Ticket system setup in #${salon.id} by ${interaction.user.username}`, "discord");
      } catch (err) {
        log(`Error in setupticket: ${err}`, "discord");
        await interaction.reply({ content: "Une erreur est survenue.", ephemeral: true });
      }
    }

    if (interaction.commandName === "ikey") {
      try {
        const key = interaction.options.getString("cle", true);
        const license = await (storage as any).getLicenseKey(key);
        
        if (!license) {
          await interaction.reply({ content: "Cle introuvable.", ephemeral: true });
          webhookBotIkey(interaction.user.tag, key, false);
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("Infos Cle de licence")
          .addFields(
            { name: "Cle", value: `\`${license.key}\`` },
            { name: "Tier", value: license.tier.toUpperCase(), inline: true },
            { name: "Utilisee", value: license.used ? "Oui" : "Non", inline: true }
          );

        if (license.used) {
          embed.addFields(
            { name: "Utilisee par", value: license.usedBy || "Inconnu", inline: true },
            { name: "Le", value: license.usedAt ? license.usedAt.toLocaleString() : "Inconnu", inline: true }
          );
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
        webhookBotIkey(interaction.user.tag, key, true, license.tier, license.used, license.usedBy || undefined);
      } catch (err) {
        log(`Error getting key info: ${err}`, "discord");
        await interaction.reply({ content: "Erreur lors de la recuperation des infos.", ephemeral: true });
      }
    }

    if (interaction.commandName === "status") {
      try {
        const targetChannel = interaction.options.getChannel("salon", true);
        await interaction.deferReply({ ephemeral: true });

        const fs = await import("fs");
        const pathModule = await import("path");
        const dataDir = process.env.DATA_DIR || pathModule.join(process.cwd(), "server", "data");

        type ServiceStatus = "operational" | "degraded" | "down";
        const services: { name: string; status: ServiceStatus }[] = [];

        const siteOk = !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        let dbOk = false;
        try {
          await storage.getAllUsers();
          dbOk = true;
        } catch {}
        services.push({
          name: "Site",
          status: siteOk && dbOk ? "operational" : (siteOk || dbOk ? "degraded" : "down")
        });

        const botOk = !!client?.isReady();
        services.push({
          name: "Bot",
          status: botOk ? "operational" : "down"
        });

        const breachOk = !!process.env.BREACH_API_KEY;
        const leakOk = !!process.env.LEAK_OSINT_API_KEY || !!process.env.LEAKOSINT_API_KEY;
        const paymentsOk = !!process.env.NOWPAYMENTS_API_KEY;
        services.push({
          name: "API",
          status: breachOk && leakOk && paymentsOk ? "operational" : (breachOk || leakOk ? "degraded" : "down")
        });

        services.push({
          name: "GeoIP",
          status: "operational"
        });

        services.push({
          name: "Lookup Numero",
          status: "operational"
        });

        const indexPath = pathModule.join(dataDir, "index.db");
        const indexExists = fs.existsSync(indexPath);
        services.push({
          name: "Recherche par critere",
          status: indexExists ? "operational" : "down"
        });

        const incomingPath = pathModule.join(dataDir, "incoming.db");
        const bothDb = indexExists && fs.existsSync(incomingPath);
        services.push({
          name: "Recherche Globale",
          status: bothDb ? "operational" : (indexExists ? "degraded" : "down")
        });

        services.push({
          name: "Autres sources",
          status: breachOk && leakOk ? "operational" : (breachOk || leakOk ? "degraded" : "down")
        });

        services.push({
          name: "Decodeur NIR",
          status: "operational"
        });

        const dot = (s: ServiceStatus) =>
          s === "operational" ? "\uD83D\uDFE2" : s === "degraded" ? "\uD83D\uDFE0" : "\uD83D\uDD34";

        const statusLines = services.map(s => `${dot(s.status)} ${s.name}`).join("\n");

        const opCount = services.filter(s => s.status === "operational").length;
        const degCount = services.filter(s => s.status === "degraded").length;
        const downCount = services.filter(s => s.status === "down").length;

        const overallColor = downCount > 0 ? 0xef4444 : degCount > 0 ? 0xf59e0b : 0x10b981;
        const overallText = downCount > 0
          ? "Certains services sont hors ligne"
          : degCount > 0
            ? "Certains services sont degrades"
            : "Tous les services sont operationnels";

        const uptimeMs = client?.uptime || 0;
        const uptimeD = Math.floor(uptimeMs / 86400000);
        const uptimeH = Math.floor((uptimeMs % 86400000) / 3600000);
        const uptimeM = Math.floor((uptimeMs % 3600000) / 60000);
        const uptimeStr = uptimeD > 0 ? `${uptimeD}j ${uptimeH}h ${uptimeM}m` : `${uptimeH}h ${uptimeM}m`;

        const embed = new EmbedBuilder()
          .setColor(overallColor)
          .setTitle("Discreen - Statut des Services")
          .setDescription(`**${overallText}**`)
          .addFields(
            {
              name: "Services",
              value: statusLines,
              inline: false
            },
            {
              name: "Legende",
              value: "\uD83D\uDD34 Hors ligne \u2022 \uD83D\uDFE0 Degrade \u2022 \uD83D\uDFE2 Operationnel",
              inline: false
            },
            {
              name: "Uptime",
              value: uptimeStr,
              inline: true
            },
            {
              name: "Ping",
              value: `${client?.ws.ping || 0}ms`,
              inline: true
            },
            {
              name: "Resume",
              value: `\uD83D\uDFE2 ${opCount} \u2022 \uD83D\uDFE0 ${degCount} \u2022 \uD83D\uDD34 ${downCount}`,
              inline: true
            }
          )
          .setFooter({ text: "\u00A9 Discreen - Status" })
          .setTimestamp();

        const channel = await client?.channels.fetch(targetChannel.id);
        if (channel && channel.isTextBased() && "send" in channel) {
          await (channel as any).send({ embeds: [embed] });
          await interaction.editReply({ content: `Statut envoye dans <#${targetChannel.id}>` });
          webhookBotGeneric(interaction.user.tag, "status", `**Salon** : <#${targetChannel.id}>`);
        } else {
          await interaction.editReply({ content: "Impossible d'envoyer dans ce salon." });
        }
      } catch (err) {
        log(`Error in status command: ${err}`, "discord");
        if (interaction.deferred) {
          await interaction.editReply({ content: "Erreur lors de la verification du statut." });
        } else {
          await interaction.reply({ content: "Erreur lors de la verification du statut.", ephemeral: true });
        }
      }
    }

    if (interaction.commandName === "soutien") {
      try {
        const targetChannel = interaction.options.getChannel("salon", true);
        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("Role Soutien")
          .setDescription(
            "Boostez le serveur pour obtenir le role **Soutien** et acceder a des avantages reserves.\n\n" +
            "**Avantages**\n" +
            "- Participation aux giveaways exclusifs\n" +
            "- Possibilite d'abonnement offert\n" +
            "- Acces aux salons prives\n" +
            "- Informations en avant-premiere\n\n" +
            "Le role est attribue automatiquement lors du boost et retire si le boost expire."
          )
          .setFooter({ text: "\u00A9 Discreen - Soutien" })
          .setTimestamp();

        const channel = await client?.channels.fetch(targetChannel.id);
        if (channel && channel.isTextBased() && "send" in channel) {
          await (channel as any).send({ embeds: [embed] });
          await interaction.editReply({ content: `Embed Soutien envoye dans <#${targetChannel.id}>` });
          webhookBotGeneric(interaction.user.tag, "soutien", `**Salon** : <#${targetChannel.id}>`);
        } else {
          await interaction.editReply({ content: "Impossible d'envoyer dans ce salon." });
        }
      } catch (err) {
        log(`Error in soutien command: ${err}`, "discord");
        if (interaction.deferred) {
          await interaction.editReply({ content: "Erreur lors de l'envoi de l'embed Soutien." });
        } else {
          await interaction.reply({ content: "Erreur lors de l'envoi de l'embed Soutien.", ephemeral: true });
        }
      }
    }

    if (interaction.commandName === "links") {
      try {
        const targetChannel = interaction.options.getChannel("channel", true);
        const channel = await client.channels.fetch(targetChannel.id);
        if (!channel || !("send" in channel)) {
          await interaction.reply({ content: "Salon invalide.", ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("Liens officiels - Discreen")
          .addFields(
            { name: "Site", value: "https://discreen.site", inline: false },
            { name: "Discord", value: "https://discord.gg/discreen", inline: false },
            { name: "Telegram", value: "Bientot Disponible", inline: false }
          )
          .setFooter({ text: "\u00A9 Discreen" })
          .setTimestamp();

        await (channel as any).send({ embeds: [embed] });
        await interaction.reply({ content: `Liens envoyes dans <#${targetChannel.id}>.`, ephemeral: true });
        webhookBotGeneric(interaction.user.tag, "links", `**Salon** : <#${targetChannel.id}>`);
      } catch (err) {
        log(`Error in links command: ${err}`, "discord");
        if (interaction.deferred) {
          await interaction.editReply({ content: "Erreur lors de l'affichage des liens." });
        } else {
          await interaction.reply({ content: "Erreur lors de l'affichage des liens.", ephemeral: true });
        }
      }
    }

    if (interaction.commandName === "link") {
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
        const CUSTOMER_ROLE_ID = "1469798856937177278";
        const PAID_TIERS = ["vip", "pro", "business", "api"];

        const guild = client.guilds.cache.get(DISCREEN_GUILD_ID);
        if (guild) {
          try {
            const member = await guild.members.fetch(discordId).catch(() => null);
            if (member) {
              if (sub && PAID_TIERS.includes(sub.tier)) {
                if (!member.roles.cache.has(CUSTOMER_ROLE_ID)) {
                  await member.roles.add(CUSTOMER_ROLE_ID);
                  log(`Assigned customer role to ${discordId} (tier: ${sub.tier})`, "discord");
                }
              }
              if (!member.roles.cache.has(SOUTIEN_ROLE_ID)) {
                await member.roles.add(SOUTIEN_ROLE_ID);
              }
            }
          } catch (roleErr) {
            log(`Error assigning roles during link: ${roleErr}`, "discord");
          }
        }

        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("Compte lie avec succes !")
          .setDescription(`Ton compte Discord a ete lie a ton compte Discreen.${sub && PAID_TIERS.includes(sub.tier) ? "\nLe role Client t'a ete attribue." : ""}`)
          .setFooter({ text: "Discreen" })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        log(`Discord account ${discordId} linked to user ${result.userId} via code`, "discord");
      } catch (err) {
        log(`Error in link command: ${err}`, "discord");
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "Une erreur est survenue lors de la liaison.", ephemeral: true });
        }
      }
    }

    if (interaction.commandName === "wantedlist") {
      try {
        await interaction.deferReply({ ephemeral: true });

        const profiles = await storage.getWantedProfiles();

        if (!profiles || profiles.length === 0) {
          await interaction.editReply({ content: "Aucun profil dans l'historique Wanted." });
          return;
        }

        const lines: string[] = [];
        for (const p of profiles) {
          const pseudo = p.pseudo || "N/A";
          const nom = [p.prenom, p.nom].filter(Boolean).join(" ") || "";
          const info = nom ? `${pseudo} (${nom})` : pseudo;
          const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString("fr-FR") : "";
          lines.push(`\`#${p.id}\` ${info}${date ? ` — ${date}` : ""}`);
        }

        const chunks: string[] = [];
        let current = "";
        for (const line of lines) {
          if ((current + "\n" + line).length > 4000) {
            chunks.push(current);
            current = line;
          } else {
            current = current ? current + "\n" + line : line;
          }
        }
        if (current) chunks.push(current);

        const embeds = chunks.map((chunk, i) =>
          new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle(i === 0 ? `Historique Wanted (${profiles.length} profils)` : `Wanted (suite)`)
            .setDescription(chunk)
            .setFooter({ text: "\u00A9 Discreen" })
            .setTimestamp()
        );

        await interaction.editReply({ embeds: embeds.slice(0, 10) });
        webhookBotWantedlist(interaction.user.tag, profiles.length);
      } catch (err) {
        log(`Error in wanted command: ${err}`, "discord");
        if (interaction.deferred) {
          await interaction.editReply({ content: "Erreur lors de la recuperation des profils Wanted." });
        } else {
          await interaction.reply({ content: "Erreur lors de la recuperation des profils Wanted.", ephemeral: true });
        }
      }
    }

    if (interaction.commandName === "wantedpreview") {
      try {
        await interaction.deferReply({ ephemeral: false });

        const profiles = await storage.getWantedProfiles();

        if (!profiles || profiles.length === 0) {
          await interaction.editReply({ content: "Aucun profil dans l'historique Wanted." });
          return;
        }

        const pseudos = profiles
          .map((p) => p.pseudo || "N/A")
          .filter((p) => p !== "N/A");

        if (pseudos.length === 0) {
          await interaction.editReply({ content: "Aucun pseudo trouve dans l'historique Wanted." });
          return;
        }

        const perPage = 10;
        const totalPages = Math.ceil(pseudos.length / perPage);
        const page = 0;
        const pageItems = pseudos.slice(page * perPage, (page + 1) * perPage);

        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle(`Wanted — Liste des pseudos (${pseudos.length})`)
          .setDescription(pageItems.map((p, i) => `\`${page * perPage + i + 1}.\` ${p}`).join("\n"))
          .setFooter({ text: `Page ${page + 1}/${totalPages} • © Discreen` })
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>();
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`wpreview_prev_${interaction.user.id}_0`)
            .setLabel("◀ Precedent")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`wpreview_next_${interaction.user.id}_0`)
            .setLabel("Suivant ▶")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(totalPages <= 1),
          new ButtonBuilder()
            .setCustomId(`wpreview_all_${interaction.user.id}`)
            .setLabel("Tout afficher")
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
      } catch (err) {
        log(`Error in wantedpreview command: ${err}`, "discord");
        if (interaction.deferred) {
          await interaction.editReply({ content: "Erreur lors de la recuperation des profils Wanted." });
        } else {
          await interaction.reply({ content: "Erreur lors de la recuperation des profils Wanted.", ephemeral: true });
        }
      }
    }

    if (interaction.commandName === "wrefresh") {
      try {
        await interaction.deferReply({ ephemeral: true });

        const profiles = await storage.getWantedProfiles();
        const total = profiles?.length || 0;

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const recentProfiles = (profiles || []).filter(p => new Date(p.createdAt) > oneDayAgo);
        const weekProfiles = (profiles || []).filter(p => new Date(p.createdAt) > oneWeekAgo);

        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("Wanted — Actualisation")
          .addFields(
            { name: "Total profils", value: `${total}`, inline: true },
            { name: "Ajouts (24h)", value: `${recentProfiles.length}`, inline: true },
            { name: "Ajouts (7j)", value: `${weekProfiles.length}`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: "© Discreen" });

        if (recentProfiles.length > 0) {
          const recentList = recentProfiles
            .slice(0, 10)
            .map((p, i) => `\`${i + 1}.\` ${p.pseudo || "N/A"}`)
            .join("\n");
          embed.addFields({
            name: `Derniers ajouts (${Math.min(recentProfiles.length, 10)}/${recentProfiles.length})`,
            value: recentList
          });
        }

        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        log(`Error in wrefresh command: ${err}`, "discord");
        if (interaction.deferred) {
          await interaction.editReply({ content: "Erreur lors de l'actualisation Wanted." });
        } else {
          await interaction.reply({ content: "Erreur lors de l'actualisation Wanted.", ephemeral: true });
        }
      }
    }

    if (interaction.commandName === "renew") {
      try {
        await interaction.deferReply({ ephemeral: true });

        const oldChannel = interaction.channel;
        if (!oldChannel || !("guild" in oldChannel) || !oldChannel.guild) {
          await interaction.editReply({ content: "Cette commande ne peut etre utilisee que dans un serveur." });
          return;
        }

        const guild = oldChannel.guild;
        const channelData = oldChannel as any;
        const name = channelData.name;
        const type = channelData.type;
        const topic = channelData.topic || undefined;
        const nsfw = channelData.nsfw || false;
        const rateLimitPerUser = channelData.rateLimitPerUser || 0;
        const parent = channelData.parentId || undefined;
        const position = channelData.position;
        const permissionOverwrites = channelData.permissionOverwrites?.cache?.map((perm: any) => ({
          id: perm.id,
          type: perm.type,
          allow: perm.allow,
          deny: perm.deny,
        })) || [];

        const newChannel = await guild.channels.create({
          name,
          type,
          topic,
          nsfw,
          rateLimitPerUser,
          parent,
          position,
          permissionOverwrites,
        });

        await newChannel.setPosition(position).catch(() => {});

        try {
          await (newChannel as any).send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x10b981)
                .setDescription("Salon recree avec succes.")
                .setFooter({ text: "\u00A9 Discreen" })
            ]
          });
        } catch {}

        await oldChannel.delete().catch(() => {});

        webhookBotGeneric(interaction.user.tag, "renew", `**Salon** : #${name}`);
        log(`Channel #${name} renewed by ${interaction.user.tag}`, "discord");
      } catch (err) {
        log(`Error in renew command: ${err}`, "discord");
        try {
          if (interaction.deferred) {
            await interaction.editReply({ content: "Erreur lors du renouvellement du salon." });
          }
        } catch {}
      }
    }
  });

  handleEmbedInteractions(client);
  handleTicketInteractions(client);

  try {
    await client.login(token);
  } catch (err) {
    log(`Failed to login Discord bot: ${err}`, "discord");
  }
}

function getStarsDisplay(rating: number): string {
  return "\u2605".repeat(rating) + "\u2606".repeat(5 - rating);
}

const embedSessions = new Map<string, string>();

function buildEmbedButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("embed_title").setLabel("Titre").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("embed_description").setLabel("Description").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("embed_color").setLabel("Couleur").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("embed_author").setLabel("Auteur").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("embed_footer").setLabel("Footer").setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("embed_image").setLabel("Image").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("embed_thumbnail").setLabel("Miniature").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("embed_url").setLabel("URL").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("embed_timestamp").setLabel("Timestamp").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("embed_send").setLabel("Envoyer").setStyle(ButtonStyle.Danger),
  );
  return [row1, row2];
}

const COLOR_MAP: Record<string, number> = {
  red: 0xED4245, blue: 0x3498DB, green: 0x2ECC71, yellow: 0xFEE75C,
  purple: 0x9B59B6, orange: 0xE67E22, white: 0xFFFFFF, black: 0x000000,
  pink: 0xEB459E, cyan: 0x1ABC9C,
};

function parseColor(input: string): number | null {
  const lower = input.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  const hex = lower.replace("#", "");
  const parsed = parseInt(hex, 16);
  if (!isNaN(parsed) && (hex.length === 6 || hex.length === 3)) return parsed;
  return null;
}

async function handleWantedPreviewButton(interaction: ButtonInteraction) {
  const customId = interaction.customId;
  if (!customId.startsWith("wpreview_")) return;

  const parts = customId.split("_");
  const direction = parts[1];
  const ownerId = parts[2];

  if (interaction.user.id !== ownerId) {
    await interaction.reply({ content: "Seul l'auteur de la commande peut naviguer.", ephemeral: true });
    return;
  }

  try {
    const profiles = await storage.getWantedProfiles();
    const pseudos = (profiles || [])
      .map((p) => p.pseudo || "N/A")
      .filter((p) => p !== "N/A");

    if (direction === "all") {
      const perChunk = 40;
      const chunks: string[][] = [];
      for (let i = 0; i < pseudos.length; i += perChunk) {
        chunks.push(pseudos.slice(i, i + perChunk));
      }

      const embeds = chunks.slice(0, 10).map((chunk, idx) => {
        const startIdx = idx * perChunk;
        return new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle(idx === 0 ? `Wanted — Liste complete (${pseudos.length} pseudos)` : `Wanted (suite)`)
          .setDescription(chunk.map((p, i) => `\`${startIdx + i + 1}.\` ${p}`).join("\n"))
          .setFooter({ text: "© Discreen" });
      });

      const row = new ActionRowBuilder<ButtonBuilder>();
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`wpreview_pages_${ownerId}_0`)
          .setLabel("Retour pagination")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({ embeds, components: [row] });
      return;
    }

    if (direction === "pages") {
      const currentPage = 0;
      const perPage = 10;
      const totalPages = Math.ceil(pseudos.length / perPage);
      const pageItems = pseudos.slice(0, perPage);

      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle(`Wanted — Liste des pseudos (${pseudos.length})`)
        .setDescription(pageItems.map((p, i) => `\`${i + 1}.\` ${p}`).join("\n"))
        .setFooter({ text: `Page 1/${totalPages} • © Discreen` })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>();
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`wpreview_prev_${ownerId}_0`)
          .setLabel("◀ Precedent")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`wpreview_next_${ownerId}_0`)
          .setLabel("Suivant ▶")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(totalPages <= 1),
        new ButtonBuilder()
          .setCustomId(`wpreview_all_${ownerId}`)
          .setLabel("Tout afficher")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.update({ embeds: [embed], components: [row] });
      return;
    }

    const currentPage = parseInt(parts[3], 10);
    const newPage = direction === "next" ? currentPage + 1 : currentPage - 1;

    const perPage = 10;
    const totalPages = Math.ceil(pseudos.length / perPage);
    const safePage = Math.max(0, Math.min(newPage, totalPages - 1));
    const pageItems = pseudos.slice(safePage * perPage, (safePage + 1) * perPage);

    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle(`Wanted — Liste des pseudos (${pseudos.length})`)
      .setDescription(pageItems.map((p, i) => `\`${safePage * perPage + i + 1}.\` ${p}`).join("\n"))
      .setFooter({ text: `Page ${safePage + 1}/${totalPages} • © Discreen` })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>();
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`wpreview_prev_${ownerId}_${safePage}`)
        .setLabel("◀ Precedent")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safePage <= 0),
      new ButtonBuilder()
        .setCustomId(`wpreview_next_${ownerId}_${safePage}`)
        .setLabel("Suivant ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safePage >= totalPages - 1),
      new ButtonBuilder()
        .setCustomId(`wpreview_all_${ownerId}`)
        .setLabel("Tout afficher")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.update({ embeds: [embed], components: [row] });
  } catch (err) {
    log(`Error in wantedpreview button: ${err}`, "discord");
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Erreur lors de la navigation.", ephemeral: true });
    }
  }
}

function handleEmbedInteractions(client: Client) {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton()) {
      await handleWantedPreviewButton(interaction);
      await handleEmbedButton(interaction);
    }
    if (interaction.isModalSubmit()) {
      await handleEmbedModal(interaction);
    }
    if (interaction.isChannelSelectMenu()) {
      await handleEmbedChannelSelect(interaction);
    }
  });
}

async function handleEmbedChannelSelect(interaction: ChannelSelectMenuInteraction) {
  if (!interaction.customId.startsWith("embed_channel_select_")) return;

  const messageId = interaction.customId.replace("embed_channel_select_", "");
  const ownerId = embedSessions.get(messageId);
  if (!ownerId || ownerId !== interaction.user.id) {
    await interaction.reply({ content: "Seul le createur de cet embed peut l'envoyer.", ephemeral: true });
    return;
  }

  const selectedChannelId = interaction.values[0];
  if (!selectedChannelId) return;

  try {
    const existingEmbed = interaction.message.embeds[0];
    if (!existingEmbed) {
      await interaction.reply({ content: "Embed introuvable.", ephemeral: true });
      return;
    }

    const embed = EmbedBuilder.from(existingEmbed);
    const targetChannel = interaction.guild?.channels.cache.get(selectedChannelId);

    if (targetChannel && targetChannel.isTextBased() && "send" in targetChannel) {
      await (targetChannel as any).send({ embeds: [embed] });
      embedSessions.delete(messageId);
      await interaction.update({
        content: `Embed envoye dans <#${selectedChannelId}>`,
        embeds: [],
        components: [],
      });
    } else {
      await interaction.reply({ content: "Impossible d'envoyer dans ce salon.", ephemeral: true });
    }
  } catch (err) {
    log(`Error sending embed to channel: ${err}`, "discord");
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Une erreur est survenue.", ephemeral: true });
    }
  }
}

async function handleEmbedButton(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith("embed_")) return;

  const messageId = interaction.message.id;
  const ownerId = embedSessions.get(messageId);
  if (!ownerId || ownerId !== interaction.user.id) {
    await interaction.reply({ content: "Seul le createur de cet embed peut le modifier.", ephemeral: true });
    return;
  }

  const action = interaction.customId.replace("embed_", "");

  if (action === "timestamp") {
    const existingEmbed = interaction.message.embeds[0];
    if (!existingEmbed) return;
    const embed = EmbedBuilder.from(existingEmbed);
    if (existingEmbed.timestamp) {
      embed.setTimestamp(null);
    } else {
      embed.setTimestamp();
    }
    await interaction.update({ embeds: [embed], components: buildEmbedButtons() });
    return;
  }

  if (action === "send") {
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId(`embed_channel_select_${messageId}`)
      .setPlaceholder("Choisir le salon ou envoyer l'embed")
      .setChannelTypes(ChannelType.GuildText);

    const selectRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect);
    const cancelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("embed_cancel_send").setLabel("Annuler").setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({ components: [selectRow, cancelRow] });
    return;
  }

  if (action === "cancel_send") {
    await interaction.update({ components: buildEmbedButtons() });
    return;
  }

  const modalFields: Record<string, { label: string; placeholder: string; style: TextInputStyle; required: boolean }> = {
    title: { label: "Titre", placeholder: "Le titre de l'embed", style: TextInputStyle.Short, required: false },
    description: { label: "Description", placeholder: "Le contenu principal de l'embed", style: TextInputStyle.Paragraph, required: false },
    color: { label: "Couleur", placeholder: "#FF0000 ou red, blue, green, purple, etc.", style: TextInputStyle.Short, required: false },
    author: { label: "Auteur", placeholder: "Nom de l'auteur", style: TextInputStyle.Short, required: false },
    footer: { label: "Footer", placeholder: "Texte du footer", style: TextInputStyle.Short, required: false },
    image: { label: "URL de l'image", placeholder: "https://exemple.com/image.png", style: TextInputStyle.Short, required: false },
    thumbnail: { label: "URL de la miniature", placeholder: "https://exemple.com/thumb.png", style: TextInputStyle.Short, required: false },
    url: { label: "URL du titre", placeholder: "https://exemple.com", style: TextInputStyle.Short, required: false },
  };

  const fieldConfig = modalFields[action];
  if (!fieldConfig) return;

  const modal = new ModalBuilder()
    .setCustomId(`embedmodal_${action}_${messageId}`)
    .setTitle(`Modifier - ${fieldConfig.label}`);

  const input = new TextInputBuilder()
    .setCustomId("value")
    .setLabel(fieldConfig.label)
    .setPlaceholder(fieldConfig.placeholder)
    .setStyle(fieldConfig.style)
    .setRequired(fieldConfig.required);

  const existingEmbed = interaction.message.embeds[0];
  if (existingEmbed) {
    let currentValue = "";
    switch (action) {
      case "title": currentValue = existingEmbed.title || ""; break;
      case "description": currentValue = existingEmbed.description || ""; break;
      case "author": currentValue = existingEmbed.author?.name || ""; break;
      case "footer": currentValue = existingEmbed.footer?.text || ""; break;
      case "image": currentValue = existingEmbed.image?.url || ""; break;
      case "thumbnail": currentValue = existingEmbed.thumbnail?.url || ""; break;
      case "url": currentValue = existingEmbed.url || ""; break;
      case "color": currentValue = existingEmbed.hexColor || ""; break;
    }
    if (currentValue) input.setValue(currentValue);
  }

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  await interaction.showModal(modal);
}

async function handleEmbedModal(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith("embedmodal_")) return;

  const parts = interaction.customId.split("_");
  const action = parts[1];
  const messageId = parts.slice(2).join("_");

  const ownerId = embedSessions.get(messageId);
  if (!ownerId || ownerId !== interaction.user.id) {
    await interaction.reply({ content: "Session expiree.", ephemeral: true });
    return;
  }

  const value = interaction.fields.getTextInputValue("value").trim();

  try {
    const message = await interaction.channel?.messages.fetch(messageId);
    if (!message) {
      await interaction.reply({ content: "Message introuvable.", ephemeral: true });
      return;
    }

    const existingEmbed = message.embeds[0];
    if (!existingEmbed) {
      await interaction.reply({ content: "Embed introuvable.", ephemeral: true });
      return;
    }

    const embed = EmbedBuilder.from(existingEmbed);

    switch (action) {
      case "title":
        if (value) embed.setTitle(value); else embed.setTitle(null);
        break;
      case "description":
        if (value) embed.setDescription(value); else embed.setDescription(null);
        break;
      case "color": {
        const color = parseColor(value);
        if (color !== null) embed.setColor(color);
        else if (!value) embed.setColor(0x10b981);
        break;
      }
      case "author":
        if (value) embed.setAuthor({ name: value }); else embed.setAuthor(null);
        break;
      case "footer":
        if (value) embed.setFooter({ text: value }); else embed.setFooter(null);
        break;
      case "image":
        if (value) embed.setImage(value); else embed.setImage(null);
        break;
      case "thumbnail":
        if (value) embed.setThumbnail(value); else embed.setThumbnail(null);
        break;
      case "url":
        if (value) embed.setURL(value); else embed.setURL(null);
        break;
    }

    await interaction.deferUpdate();
    await message.edit({ embeds: [embed], components: buildEmbedButtons() });
  } catch (err) {
    log(`Error in embed modal: ${err}`, "discord");
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Une erreur est survenue.", ephemeral: true });
    }
  }
}

const TICKET_CATEGORY_ID = "1469798963749326898";
const STAFF_ROLE_IDS = ["1469798858421829796", "1469798855099945172"];

const TICKET_TYPES: Record<string, string> = {
  ticket_aide: "aide",
  ticket_suggestion: "suggestion",
  ticket_autre: "autre",
  ticket_db: "demande-db",
  ticket_paiement: "paiement",
};

function handleTicketInteractions(client: Client) {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    if (customId.startsWith("freeze_alert_")) {
      await handleFreezeAlertButton(interaction, customId);
      return;
    }

    if (customId.startsWith("ticket_claim_")) {
      await handleTicketClaim(interaction);
      return;
    }

    if (customId.startsWith("ticket_close_")) {
      await handleTicketClose(interaction);
      return;
    }

    if (!TICKET_TYPES[customId]) return;

    await handleTicketCreate(interaction, customId);
  });
}

async function handleTicketCreate(interaction: ButtonInteraction, customId: string) {
  const ticketType = TICKET_TYPES[customId];
  const guild = interaction.guild;
  if (!guild) return;

  try {
    await interaction.deferReply({ ephemeral: true });

    const category = guild.channels.cache.get(TICKET_CATEGORY_ID);
    if (!category) {
      await interaction.editReply({ content: "La categorie de tickets est introuvable. Contactez un administrateur." });
      return;
    }

    const existingTicket = guild.channels.cache.find((ch) => {
      if (ch.parentId !== TICKET_CATEGORY_ID || !ch.isTextBased()) return false;
      return ch.topic === interaction.user.id;
    });
    if (existingTicket) {
      await interaction.editReply({ content: `Vous avez deja un ticket ouvert: <#${existingTicket.id}>` });
      return;
    }

    const sanitizedName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || interaction.user.id;
    const channelName = `${ticketType}-${sanitizedName}`;

    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
        type: OverwriteType.Role as number,
      },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
        type: OverwriteType.Member as number,
      },
    ];

    for (const roleId of STAFF_ROLE_IDS) {
      permissionOverwrites.push({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
        type: OverwriteType.Role as number,
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: interaction.user.id,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: permissionOverwrites as any,
    });

    const ticketEmbed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle("Support Discreen")
      .setDescription(
        `Bienvenue dans votre ticket, <@${interaction.user.id}> !\n\n` +
        `**Categorie :** ${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)}\n\n` +
        "Un membre du staff va prendre en charge votre demande.\n" +
        "Decrivez votre probleme ou votre demande en detail, et nous vous repondrons dans les plus brefs delais."
      )
      .setFooter({ text: "Discreen Support - Merci de patienter" })
      .setTimestamp();

    const claimRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_claim_${ticketChannel.id}`)
        .setLabel("Prendre en charge")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`ticket_close_${ticketChannel.id}`)
        .setLabel("Fermer le ticket")
        .setStyle(ButtonStyle.Danger),
    );

    const staffMentions = STAFF_ROLE_IDS.map((id) => `<@&${id}>`).join(" ");
    await ticketChannel.send({ content: staffMentions, embeds: [ticketEmbed], components: [claimRow] });

    await interaction.editReply({ content: `Votre ticket a ete cree : <#${ticketChannel.id}>` });
    log(`Ticket created: ${channelName} by ${interaction.user.username}`, "discord");
  } catch (err) {
    log(`Error creating ticket: ${err}`, "discord");
    if (interaction.deferred) {
      await interaction.editReply({ content: "Une erreur est survenue lors de la creation du ticket." });
    }
  }
}

async function handleTicketClaim(interaction: ButtonInteraction) {
  try {
    const member = interaction.guild?.members.cache.get(interaction.user.id) ||
      await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: "Impossible de verifier vos roles.", ephemeral: true });
      return;
    }

    const isStaff = STAFF_ROLE_IDS.some((roleId) => member.roles.cache.has(roleId));
    if (!isStaff) {
      await interaction.reply({ content: "Seul le staff peut prendre en charge un ticket.", ephemeral: true });
      return;
    }

    const existingEmbed = interaction.message.embeds[0];
    if (!existingEmbed) return;

    if (existingEmbed.fields.some((f) => f.name === "Pris en charge par")) {
      await interaction.reply({ content: "Ce ticket est deja pris en charge.", ephemeral: true });
      return;
    }

    const embed = EmbedBuilder.from(existingEmbed)
      .addFields({ name: "Pris en charge par", value: `<@${interaction.user.id}>`, inline: true })
      .setColor(0x3498db);

    const channelId = interaction.customId.replace("ticket_claim_", "");
    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_close_${channelId}`)
        .setLabel("Fermer le ticket")
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.update({ embeds: [embed], components: [closeRow] });
    log(`Ticket claimed by ${interaction.user.username} in ${interaction.channel?.id}`, "discord");
  } catch (err) {
    log(`Error claiming ticket: ${err}`, "discord");
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Une erreur est survenue.", ephemeral: true });
    }
  }
}

async function handleTicketClose(interaction: ButtonInteraction) {
  try {
    const member = interaction.guild?.members.cache.get(interaction.user.id) ||
      await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: "Impossible de verifier vos roles.", ephemeral: true });
      return;
    }

    const isStaff = STAFF_ROLE_IDS.some((roleId) => member.roles.cache.has(roleId));
    if (!isStaff) {
      await interaction.reply({ content: "Seul le staff peut fermer un ticket.", ephemeral: true });
      return;
    }

    await interaction.reply({ content: "Ce ticket sera ferme dans 5 secondes..." });

    setTimeout(async () => {
      try {
        const channel = interaction.channel;
        if (channel && "delete" in channel) {
          await (channel as any).delete("Ticket ferme");
          log(`Ticket closed by ${interaction.user.username}: ${channel.id}`, "discord");
        }
      } catch (err) {
        log(`Error deleting ticket channel: ${err}`, "discord");
      }
    }, 5000);
  } catch (err) {
    log(`Error closing ticket: ${err}`, "discord");
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Une erreur est survenue.", ephemeral: true });
    }
  }
}

async function handleFreezeAlertButton(interaction: ButtonInteraction, customId: string) {
  const userId = customId.replace("freeze_alert_", "");
  if (!userId) {
    await interaction.reply({ content: "ID utilisateur invalide.", ephemeral: true });
    return;
  }

  try {
    const alreadyFrozen = await storage.isFrozen(userId);
    if (alreadyFrozen) {
      await interaction.reply({ content: "Ce compte est deja gele.", ephemeral: true });
      return;
    }

    await storage.setFrozen(userId, true);

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle("\u{2744}\u{FE0F} Compte Gele")
      .setDescription(`Le compte \`${userId}\` a ete gele par <@${interaction.user.id}>.`)
      .setTimestamp();

    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`freeze_done_${userId}`)
        .setLabel("Compte gele")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    await interaction.update({ components: [disabledRow] });
    await interaction.followUp({ embeds: [embed] });

    log(`Account ${userId} frozen via alert button by ${interaction.user.username}`, "discord");
  } catch (err) {
    log(`Error handling freeze alert button: ${err}`, "discord");
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Erreur lors du gel du compte.", ephemeral: true });
    }
  }
}

export async function sendFreezeAlert(userId: string, username: string, uniqueId: number, searchCount: number, limit: number) {
  if (!client) return;

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const match = webhookUrl.match(/\/api\/webhooks\/(\d+)\//);
  if (!match) return;

  try {
    const webhookResp = await fetch(webhookUrl);
    if (!webhookResp.ok) return;
    const webhookData = await webhookResp.json();
    const channelId = webhookData.channel_id;
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId);
    if (!channel || !("send" in channel)) return;

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("\u{26A0}\u{FE0F} Activite Suspecte - Action Requise")
      .setDescription([
        `**Utilisateur** : \`${username}\` (#${uniqueId})`,
        `**Recherches aujourd'hui** : **${searchCount}** / ${limit}`,
        `\nCliquez sur le bouton ci-dessous pour geler ce compte.`,
      ].join("\n"))
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`freeze_alert_${userId}`)
        .setLabel("Geler le compte")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("\u{2744}\u{FE0F}")
    );

    await (channel as any).send({
      content: `<@&1469798855099945172>`,
      embeds: [embed],
      components: [row],
    });
  } catch (err) {
    log(`Error sending freeze alert: ${err}`, "discord");
  }
}

const DISCREEN_GUILD_ID = "1130682847749996564";
const CUSTOMER_ROLE_ID_GLOBAL = "1469798856937177278";
const PAID_TIERS_GLOBAL = ["vip", "pro", "business", "api"];

export async function syncCustomerRole(discordId: string, tier: string): Promise<void> {
  if (!client) return;
  try {
    const guild = client.guilds.cache.get(DISCREEN_GUILD_ID);
    if (!guild) return;
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) return;
    if (PAID_TIERS_GLOBAL.includes(tier)) {
      if (!member.roles.cache.has(CUSTOMER_ROLE_ID_GLOBAL)) {
        await member.roles.add(CUSTOMER_ROLE_ID_GLOBAL);
        log(`Customer role synced (added) for ${discordId} (tier: ${tier})`, "discord");
      }
    } else {
      if (member.roles.cache.has(CUSTOMER_ROLE_ID_GLOBAL)) {
        await member.roles.remove(CUSTOMER_ROLE_ID_GLOBAL);
        log(`Customer role synced (removed) for ${discordId} (tier: ${tier})`, "discord");
      }
    }
  } catch (err) {
    log(`Error syncing customer role for ${discordId}: ${err}`, "discord");
  }
}

export async function checkDiscordMemberStatus(discordId: string): Promise<{ inGuild: boolean; isSupporter: boolean }> {
  if (!client) return { inGuild: false, isSupporter: false };

  try {
    const guild = client.guilds.cache.get(DISCREEN_GUILD_ID);
    if (!guild) return { inGuild: false, isSupporter: false };

    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) return { inGuild: false, isSupporter: false };

    const isSupporter = member.roles.cache.has(SOUTIEN_ROLE_ID);
    return { inGuild: true, isSupporter };
  } catch (err) {
    log(`Error checking discord member status for ${discordId}: ${err}`, "discord");
    return { inGuild: false, isSupporter: false };
  }
}
