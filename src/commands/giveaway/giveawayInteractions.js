// src/commands/giveaway/giveawayInteractions.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');
const { buildActionRow, buildParticipantsPage, entryCount, checkEntryRate, checkAccountAge } = require('./giveawayService');

const DEFAULT_COLOR = 0x5865F2;
const ERROR_COLOR = 0xED4245;

async function handleEnter(interaction) {
  // 最初に必ずACKする。この後DBへの複数回の問い合わせや
  // Discordメッセージの編集が続くため、先に応答しないと
  // 3秒のインタラクション期限を超えて失敗することがあった。
  await interaction.deferReply({ ephemeral: true });

  const giveaway = await prisma.giveaway.findUnique({ where: { messageId: interaction.message.id } });
  if (!giveaway || giveaway.status !== 'ACTIVE' || giveaway.endsAt <= new Date()) {
    const msg = await tGuild(giveaway?.guildId || interaction.guildId, 'giveaway.enter.ended');
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription(msg)] });
  }

  const rateCheck = checkEntryRate(interaction.user.id);
  if (!rateCheck.allowed) {
    const msg = await tGuild(interaction.guildId, 'giveaway.enter.rate_limit');
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription(msg)] });
  }

  const ageCheck = await checkAccountAge(interaction.user, giveaway.guildId);
  if (!ageCheck.allowed) {
    const msg = await tGuild(interaction.guildId, 'giveaway.enter.account_too_new', { min_age: ageCheck.minAgeDays, account_age: ageCheck.accountAgeDays });
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription(msg)] });
  }

  const member = interaction.member;
  const hasBypass = giveaway.bypassRoleId && member?.roles?.cache?.has(giveaway.bypassRoleId);

  if (giveaway.requiredRoleId && !hasBypass) {
    const hasRequired = member?.roles?.cache?.has(giveaway.requiredRoleId);
    if (!hasRequired) {
      const msg = await tGuild(interaction.guildId, 'giveaway.enter.missing_role', { role: `<@&${giveaway.requiredRoleId}>` });
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription(msg)] });
    }
  }

  // TODO: レベリング機能実装後にレベル制限をチェックする
  // if (giveaway.requiredLevel && !hasBypass) { ... }

  const existing = await prisma.giveawayEntry.findUnique({
    where: { giveawayId_userId: { giveawayId: giveaway.id, userId: interaction.user.id } },
  });
  
  if (existing) {
    const leaveButtonLabel = await tGuild(interaction.guildId, 'giveaway.leave.button');
    const message = await tGuild(interaction.guildId, 'giveaway.enter.already_entered_with_leave');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`giveaway_leave:${giveaway.id}`).setLabel(leaveButtonLabel).setStyle(ButtonStyle.Danger)
    );
    return interaction.editReply({ content: message, components: [row] });
  }

  await prisma.giveawayEntry.create({ data: { giveawayId: giveaway.id, userId: interaction.user.id } });
  const count = await entryCount(giveaway.id);
  const row = buildActionRow({ count });
  await interaction.message.edit({ components: [row] }).catch(() => {});

  const msg = await tGuild(interaction.guildId, 'giveaway.enter.confirmed', { prize: giveaway.prize });
  return interaction.editReply({ embeds: [new EmbedBuilder().setColor(DEFAULT_COLOR).setDescription(msg)] });
}

async function handleLeave(interaction) {
  // 最初に必ずACKする(以降DBへの複数回の問い合わせとメッセージ編集が続くため)。
  await interaction.deferUpdate();

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
  const row = buildActionRow({ count });
  
  const channel = interaction.client.channels.cache.get(giveaway.channelId);
  if (channel) {
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (message) await message.edit({ components: [row] }).catch(() => {});
  }

  const msg = await tGuild(interaction.guildId, 'giveaway.leave.success');
  return interaction.editReply({
    content: null,
    embeds: [new EmbedBuilder().setColor(DEFAULT_COLOR).setDescription(msg)],
    components: [],
  });
}

async function handleParticipantsOpen(interaction) {
  const giveaway = await prisma.giveaway.findUnique({ where: { messageId: interaction.message.id } });
  if (!giveaway) return interaction.reply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription('Giveaway not found.')], ephemeral: true });
  if (interaction.user.id !== giveaway.hostId) return interaction.reply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription('Only the host can view participants.')], ephemeral: true });

  const { embed, row } = await buildParticipantsPage(giveaway.id, 0);
  return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleParticipantsPage(interaction) {
  const [, giveawayId, pageStr] = interaction.customId.split(':');
  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
  if (!giveaway || interaction.user.id !== giveaway.hostId) return interaction.reply({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setDescription('Only the host can view participants.')], ephemeral: true });

  const { embed, row } = await buildParticipantsPage(giveawayId, parseInt(pageStr, 10) || 0);
  return interaction.update({ embeds: [embed], components: [row] }).catch(() => {});
}

async function route(interaction) {
  if (interaction.customId === 'giveaway_enter') return handleEnter(interaction);
  if (interaction.customId.startsWith('giveaway_leave:')) return handleLeave(interaction);
  if (interaction.customId === 'giveaway_participants') return handleParticipantsOpen(interaction);
  if (interaction.customId.startsWith('giveaway_participants_page:')) return handleParticipantsPage(interaction);
  return null;
}

module.exports = { route };