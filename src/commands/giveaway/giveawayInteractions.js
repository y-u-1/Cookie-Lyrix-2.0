// src/commands/giveaway/giveawayInteractions.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('../../lib/database');
const { t, tGuild, getGuildLanguage } = require('../../lib/i18n');
const { buildActionRow, buildParticipantsPage, entryCount, checkEntryRate, checkAccountAge } = require('./giveawayService');

const DEFAULT_COLOR = 0x5865F2;
const ERROR_COLOR = 0xED4245;

async function handleEnter(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const lang = await getGuildLanguage(interaction.guildId);

  const giveaway = await prisma.giveaway.findUnique({ where: { messageId: interaction.message.id } });
  if (!giveaway || giveaway.status !== 'ACTIVE' || giveaway.endsAt <= new Date()) {
    const msg = t(lang, 'giveaway.enter.ended');
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription(msg)] });
  }

  const rateCheck = checkEntryRate(interaction.user.id);
  if (!rateCheck.allowed) {
    const msg = t(lang, 'giveaway.enter.rate_limit');
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription(msg)] });
  }

  const ageCheck = await checkAccountAge(interaction.user, giveaway.guildId);
  if (!ageCheck.allowed) {
    const msg = t(lang, 'giveaway.enter.account_too_new', { min_age: ageCheck.minAgeDays, account_age: ageCheck.accountAgeDays });
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription(msg)] });
  }

  const member = interaction.member;
  const hasBypass = giveaway.bypassRoleId && member?.roles?.cache?.has(giveaway.bypassRoleId);

  if (giveaway.requiredRoleId && !hasBypass) {
    const hasRequired = member?.roles?.cache?.has(giveaway.requiredRoleId);
    if (!hasRequired) {
      const msg = t(lang, 'giveaway.enter.missing_role', { role: `<@&${giveaway.requiredRoleId}>` });
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription(msg)] });
    }
  }

  const existing = await prisma.giveawayEntry.findUnique({
    where: { giveawayId_userId: { giveawayId: giveaway.id, userId: interaction.user.id } },
  });
  
  if (existing) {
    const leaveButtonLabel = t(lang, 'giveaway.leave.button');
    const message = t(lang, 'giveaway.enter.already_entered_with_leave');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`giveaway_leave:${giveaway.id}`).setLabel(leaveButtonLabel).setStyle(ButtonStyle.Danger)
    );
    return interaction.editReply({ content: message, components: [row] });
  }

  await prisma.giveawayEntry.create({ data: { giveawayId: giveaway.id, userId: interaction.user.id } });
  const count = await entryCount(giveaway.id);
  const row = buildActionRow({ count }, lang);
  await interaction.message.edit({ components: [row] }).catch(() => {});

  const msg = t(lang, 'giveaway.enter.confirmed', { prize: giveaway.prize });
  return interaction.editReply({ embeds: [new EmbedBuilder().setColor(DEFAULT_COLOR).setDescription(msg)] });
}

async function handleLeave(interaction) {
  await interaction.deferUpdate();
  const lang = await getGuildLanguage(interaction.guildId);

  const [, giveawayId] = interaction.customId.split(':');
  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
  if (!giveaway || giveaway.status !== 'ACTIVE') {
    return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription('This giveaway is no longer active.')], ephemeral: true });
  }

  const existing = await prisma.giveawayEntry.findUnique({
    where: { giveawayId_userId: { giveawayId: giveaway.id, userId: interaction.user.id } },
  });
  
  if (!existing) {
    return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription('You are not entered in this giveaway.')], ephemeral: true });
  }

  await prisma.giveawayEntry.delete({ where: { id: existing.id } });
  const count = await entryCount(giveaway.id);
  const row = buildActionRow({ count }, lang);
  
  const channel = interaction.client.channels.cache.get(giveaway.channelId);
  if (channel) {
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (message) await message.edit({ components: [row] }).catch(() => {});
  }

  const msg = t(lang, 'giveaway.leave.success');
  return interaction.editReply({
    content: null,
    embeds: [new EmbedBuilder().setColor(DEFAULT_COLOR).setDescription(msg)],
    components: [],
  });
}

async function handleParticipantsOpen(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const lang = await getGuildLanguage(interaction.guildId);

  const giveaway = await prisma.giveaway.findUnique({ where: { messageId: interaction.message.id } });
  if (!giveaway) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription('Giveaway not found.')] });
  if (interaction.user.id !== giveaway.hostId) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription('Only the host can view participants.')] });

  const { embed, row } = await buildParticipantsPage(giveaway.id, 0, lang);
  return interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleParticipantsPage(interaction) {
  await interaction.deferUpdate();
  const lang = await getGuildLanguage(interaction.guildId);

  const [, giveawayId, pageStr] = interaction.customId.split(':');
  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
  if (!giveaway || interaction.user.id !== giveaway.hostId) {
    return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription('Only the host can view participants.')], ephemeral: true }).catch(() => {});
  }

  const { embed, row } = await buildParticipantsPage(giveawayId, parseInt(pageStr, 10) || 0, lang);
  return interaction.editReply({ embeds: [embed], components: [row] }).catch(() => {});
}

async function route(interaction) {
  if (interaction.customId === 'giveaway_enter') return handleEnter(interaction);
  if (interaction.customId.startsWith('giveaway_leave:')) return handleLeave(interaction);
  if (interaction.customId === 'giveaway_participants') return handleParticipantsOpen(interaction);
  if (interaction.customId.startsWith('giveaway_participants_page:')) return handleParticipantsPage(interaction);
  return null;
}

module.exports = { route };