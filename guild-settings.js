const fs = require("node:fs");
const path = require("node:path");
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const CONFIG_PATH = path.join(__dirname, "config.json");
const CHANNELS = {
  welcomeChannelId: "Boas-vindas",
  goodbyeChannelId: "Saída de membros",
  memberLogChannelId: "Logs de membros",
  messageLogChannelId: "Logs de mensagens",
  moderationLogChannelId: "Logs de moderação",
  serverLogChannelId: "Logs do servidor",
  ticketLogChannelId: "Logs de tickets",
  announcementChannelId: "Anúncios",
  suggestionChannelId: "Sugestões"
};
const DEFAULTS = {
  welcomeEnabled: true,
  goodbyeEnabled: true,
  welcomeMessage: "👋 Bem-vindo(a) {user} ao **{server}**! Você é o membro **#{memberCount}**.",
  goodbyeMessage: "👋 **{username}** saiu do servidor **{server}**.",
  welcomeImageUrl: "",
  goodbyeImageUrl: ""
};

function readConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    parsed.guilds = parsed.guilds || {};
    return parsed;
  } catch {
    return { guilds: {}, historyLimit: 20 };
  }
}
function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
function getSettings(guildId) {
  const root = readConfig();
  root.guilds[guildId] = root.guilds[guildId] || {};
  const settings = { ...DEFAULTS, ...(root.guilds[guildId].serverSettings || {}) };
  return settings;
}
function updateSettings(guildId, updater) {
  const root = readConfig();
  root.guilds[guildId] = root.guilds[guildId] || {};
  root.guilds[guildId].serverSettings = { ...DEFAULTS, ...(root.guilds[guildId].serverSettings || {}) };
  updater(root.guilds[guildId].serverSettings);
  saveConfig(root);
  return root.guilds[guildId].serverSettings;
}
function render(template, member) {
  return String(template || "")
    .replaceAll("{user}", "<@" + member.id + ">")
    .replaceAll("{username}", member.user.username)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{memberCount}", String(member.guild.memberCount))
    .replaceAll("{id}", member.id);
}
function safeText(value, max = 1800) {
  return String(value || "").slice(0, max);
}
async function sendLog(guild, key, embed) {
  try {
    const settings = getSettings(guild.id);
    const channelId = settings[key];
    if (!channelId) return;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased() || !channel.send) return;
    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch (error) {
    console.warn("[GUILD SETTINGS] Falha ao enviar log:", error?.message || error);
  }
}
function makeEmbed(title, description, color = 0x5865F2) {
  return new EmbedBuilder().setColor(color).setTitle(title).setDescription(safeText(description, 3900)).setTimestamp();
}
function panel(guild) {
  const s = getSettings(guild.id);
  const lines = Object.entries(CHANNELS).map(([key, label]) => {
    const channel = s[key] ? "<#" + s[key] + ">" : "`Não configurado`";
    return "**" + label + ":** " + channel;
  });
  return {
    embeds: [new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("⚙️ CONFIGURAÇÃO DO SERVIDOR")
      .setDescription("Configure os canais e mensagens do servidor. As alterações são salvas no config.json.\n\n" + lines.join("\n"))
      .addFields(
        { name: "Variáveis da mensagem", value: "`{user}` menção • `{username}` nome • `{server}` servidor • `{memberCount}` total de membros • `{id}` ID" },
        { name: "Mensagem de boas-vindas", value: safeText(s.welcomeMessage, 900) },
        { name: "Mensagem de saída", value: safeText(s.goodbyeMessage, 900) }
      )
      .setFooter({ text: "ASTRAL BOT • Configuração por servidor" })],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId("guildcfg:category").setPlaceholder("Escolha qual canal configurar").addOptions(
          Object.entries(CHANNELS).map(([value, label]) => ({ label, value, description: "Definir canal de " + label.toLowerCase() }))
        )
      ),
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId("guildcfg:channel").setPlaceholder("Selecione o canal para a categoria escolhida").setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("guildcfg:edit_welcome").setLabel("Editar boas-vindas").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("guildcfg:edit_goodbye").setLabel("Editar saída").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("guildcfg:test_welcome").setLabel("Testar boas-vindas").setStyle(ButtonStyle.Success)
      )
    ]
  };
}
const selectedCategory = new Map();
const commands = [
  new SlashCommandBuilder()
    .setName("config-servidor")
    .setDescription("Configura boas-vindas, logs e canais padrão do servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
];
async function handleInteraction(interaction) {
  if (interaction.isChatInputCommand() && interaction.commandName === "config-servidor") {
    if (!interaction.guild) {
      await interaction.reply({ content: "Use este comando dentro de um servidor.", ephemeral: true });
      return true;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: "Você precisa da permissão Gerenciar Servidor.", ephemeral: true });
      return true;
    }
    await interaction.reply({ ...panel(interaction.guild), ephemeral: true });
    return true;
  }
  if (!interaction.customId?.startsWith("guildcfg:")) return false;
  if (!interaction.guild || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: "Você precisa da permissão Gerenciar Servidor.", ephemeral: true }).catch(() => {});
    return true;
  }
  const id = interaction.customId;
  if (interaction.isStringSelectMenu() && id === "guildcfg:category") {
    selectedCategory.set(interaction.guildId + ":" + interaction.user.id, interaction.values[0]);
    await interaction.update(panel(interaction.guild));
    return true;
  }
  if (interaction.isChannelSelectMenu() && id === "guildcfg:channel") {
    const key = selectedCategory.get(interaction.guildId + ":" + interaction.user.id);
    if (!key || !Object.hasOwn(CHANNELS, key)) {
      await interaction.reply({ content: "Primeiro escolha a categoria no seletor de cima.", ephemeral: true });
      return true;
    }
    const channelId = interaction.values[0];
    updateSettings(interaction.guildId, s => { s[key] = channelId; });
    await interaction.update(panel(interaction.guild));
    return true;
  }
  if (interaction.isButton() && (id === "guildcfg:edit_welcome" || id === "guildcfg:edit_goodbye")) {
    const welcome = id.endsWith("edit_welcome");
    const s = getSettings(interaction.guildId);
    const modal = new ModalBuilder()
      .setCustomId(welcome ? "guildcfg:modal_welcome" : "guildcfg:modal_goodbye")
      .setTitle(welcome ? "Editar boas-vindas" : "Editar mensagem de saída")
      .addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("message").setLabel("Mensagem (use as variáveis listadas)").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1800).setValue(welcome ? s.welcomeMessage : s.goodbyeMessage)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("image").setLabel("URL HTTPS da imagem (opcional)").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(500).setValue(welcome ? s.welcomeImageUrl : s.goodbyeImageUrl))
      );
    await interaction.showModal(modal);
    return true;
  }
  if (interaction.isModalSubmit() && (id === "guildcfg:modal_welcome" || id === "guildcfg:modal_goodbye")) {
    const welcome = id.endsWith("modal_welcome");
    const message = interaction.fields.getTextInputValue("message");
    const image = interaction.fields.getTextInputValue("image").trim();
    if (image && !/^https:\/\//i.test(image)) {
      await interaction.reply({ content: "A imagem precisa usar um endereço HTTPS.", ephemeral: true });
      return true;
    }
    updateSettings(interaction.guildId, s => {
      if (welcome) { s.welcomeMessage = message; s.welcomeImageUrl = image; }
      else { s.goodbyeMessage = message; s.goodbyeImageUrl = image; }
    });
    await interaction.reply({ content: "Configuração salva! Abra /config-servidor para conferir.", ephemeral: true });
    return true;
  }
  if (interaction.isButton() && id === "guildcfg:test_welcome") {
    const s = getSettings(interaction.guildId);
    const channel = s.welcomeChannelId ? await interaction.guild.channels.fetch(s.welcomeChannelId).catch(() => null) : null;
    if (!channel?.isTextBased?.() || !channel.send) {
      await interaction.reply({ content: "Configure primeiro um canal de boas-vindas válido.", ephemeral: true });
      return true;
    }
    const preview = s.welcomeMessage
      .replaceAll("{user}", "<@" + interaction.user.id + ">")
      .replaceAll("{username}", interaction.user.username)
      .replaceAll("{server}", interaction.guild.name)
      .replaceAll("{memberCount}", String(interaction.guild.memberCount))
      .replaceAll("{id}", interaction.user.id);
    const embed = new EmbedBuilder().setColor(0x57F287).setDescription(safeText(preview, 3900));
    if (s.welcomeImageUrl) embed.setImage(s.welcomeImageUrl);
    await channel.send({ embeds: [embed], allowedMentions: { parse: [], users: [interaction.user.id] } });
    await interaction.reply({ content: "Prévia enviada para " + channel.toString() + ".", ephemeral: true });
    return true;
  }
  return false;
}
function register(client) {
  client.on("guildMemberAdd", async member => {
    const s = getSettings(member.guild.id);
    if (s.welcomeEnabled && s.welcomeChannelId) {
      const channel = await member.guild.channels.fetch(s.welcomeChannelId).catch(() => null);
      if (channel?.isTextBased?.() && channel.send) {
        const embed = new EmbedBuilder().setColor(0x57F287).setDescription(safeText(render(s.welcomeMessage, member), 3900)).setThumbnail(member.user.displayAvatarURL({ size: 256 }));
        if (s.welcomeImageUrl) embed.setImage(s.welcomeImageUrl);
        await channel.send({ embeds: [embed], allowedMentions: { parse: [], users: [member.id] } }).catch(error => console.warn("[WELCOME] Falha:", error?.message || error));
      }
    }
    await sendLog(member.guild, "memberLogChannelId", makeEmbed("Membro entrou", member.user.tag + " (" + member.id + ")", 0x57F287));
  });
  client.on("guildMemberRemove", async member => {
    const s = getSettings(member.guild.id);
    if (s.goodbyeEnabled && s.goodbyeChannelId) {
      const channel = await member.guild.channels.fetch(s.goodbyeChannelId).catch(() => null);
      if (channel?.isTextBased?.() && channel.send) {
        const text = s.goodbyeMessage.replaceAll("{user}", "<@" + member.id + ">").replaceAll("{username}", member.user.username).replaceAll("{server}", member.guild.name).replaceAll("{memberCount}", String(member.guild.memberCount)).replaceAll("{id}", member.id);
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(safeText(text, 3900)).setThumbnail(member.user.displayAvatarURL({ size: 256 }));
        if (s.goodbyeImageUrl) embed.setImage(s.goodbyeImageUrl);
        await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(error => console.warn("[GOODBYE] Falha:", error?.message || error));
      }
    }
    await sendLog(member.guild, "memberLogChannelId", makeEmbed("Membro saiu", member.user.tag + " (" + member.id + ")", 0xED4245));
  });
  client.on("messageDelete", async message => {
    if (!message.guild || message.author?.bot) return;
    const detail = "Canal: <#" + message.channelId + ">\nAutor: " + (message.author ? message.author.tag + " (" + message.author.id + ")" : "desconhecido") + "\nConteúdo: " + (message.content ? safeText(message.content, 2500) : "(sem conteúdo em cache)");
    await sendLog(message.guild, "messageLogChannelId", makeEmbed("Mensagem apagada", detail, 0xED4245));
  });
  client.on("messageUpdate", async (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    const detail = "Canal: <#" + newMessage.channelId + ">\nAutor: " + (newMessage.author?.tag || "desconhecido") + "\nAntes: " + safeText(oldMessage.content || "(não estava em cache)", 1400) + "\nDepois: " + safeText(newMessage.content || "(vazio)", 1400);
    await sendLog(newMessage.guild, "messageLogChannelId", makeEmbed("Mensagem editada", detail, 0xFEE75C));
  });
  client.on("channelCreate", channel => {
    if (channel.guild) sendLog(channel.guild, "serverLogChannelId", makeEmbed("Canal criado", channel.name + " (" + channel.id + ")", 0x57F287));
  });
  client.on("channelDelete", channel => {
    if (channel.guild) sendLog(channel.guild, "serverLogChannelId", makeEmbed("Canal excluído", channel.name + " (" + channel.id + ")", 0xED4245));
  });
  client.on("roleCreate", role => sendLog(role.guild, "serverLogChannelId", makeEmbed("Cargo criado", role.name + " (" + role.id + ")", 0x57F287)));
  client.on("roleDelete", role => sendLog(role.guild, "serverLogChannelId", makeEmbed("Cargo excluído", role.name + " (" + role.id + ")", 0xED4245)));
  client.on("guildBanAdd", ban => sendLog(ban.guild, "moderationLogChannelId", makeEmbed("Membro banido", ban.user.tag + " (" + ban.user.id + ")", 0xED4245)));
  client.on("guildBanRemove", ban => sendLog(ban.guild, "moderationLogChannelId", makeEmbed("Banimento removido", ban.user.tag + " (" + ban.user.id + ")", 0x57F287)));
}
module.exports = { commands, handleInteraction, register };
