// src/commands/giveaway/giveawayService.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('../../lib/database');
const { t, tGuild } = require('../../lib/i18n');
const logger = require('../../lib/logger');

const DEFAULT_COLOR = 0x5865F2;
const DEFAULT_END_COLOR = 0xED4245;
const PAGE_SIZE = 10;

function parseDuration(input) {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(String(input).trim());
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const ms = value * multipliers[unit];
  if (!ms || ms < 10000 || ms > 2592000000) return null;
  return ms;
}

function parseHexColor(input) {
  if (!input) return null;
  const hex = String(input).trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return parseInt(hex, 16);
}

function pickWeightedWinners(entries, count) {
  if (!entries.length) return [];
  const keyed = entries.map((e) => ({
    userId: e.userId,
    key: Math.pow(Math.random(), 1 / Math.max(e.weight, 0.01)),
  }));
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, Math.min(count, keyed.length)).map((e) => e.userId);
}

function randomShortId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

async function generateUniqueShortId() {
  for (let i = 0; i < 10; i++) {
    const id = randomShortId();
    if (!(await prisma.giveaway.findUnique({ where: { shortId: id } }))) return id;
  }
  throw new Error('Failed to generate unique shortId');
}

// 修正: 元のパネル（参加ボタンがあるメッセージ）のフォーマット
function buildGiveawayEmbed(giveaway, { ended = false, winnerIds = [] } = {}, lang = 'ja') {
  const unix = Math.floor(new Date(giveaway.endsAt).getTime() / 1000);

  if (ended) {
    const winnerText = winnerIds.length ? winnerIds.map((id) => `<@${id}>`).join(', ') : t(lang, 'giveaway.ended_no_winners');
    const lines = [
      `### ${giveaway.prize}`,
      `Winner: ${winnerText}`,
      `**Hosted by:** <@${giveaway.hostId}>`,
      `**Reroll Command:** \`/giveaway reroll id:${giveaway.shortId}\``,
      `\n> Ended: <t:${unix}:R>`
    ];
    const embed = new EmbedBuilder().setColor(giveaway.endColor ?? DEFAULT_END_COLOR).setDescription(lines.join('\n'));
    if (giveaway.imageUrl) embed.setImage(giveaway.imageUrl);
    if (giveaway.thumbnailUrl) embed.setThumbnail(giveaway.thumbnailUrl);
    return embed;
  }

  const lines = [
    `### ${giveaway.prize}`,
    `Click the button below to enter!`,
    ``,
    `**Winners:** ${giveaway.winnerCount}`,
    `**Ends:** <t:${unix}:R>`,
    `**Hosted by:** <@${giveaway.hostId}>`
  ];
  if (giveaway.requiredRoleId) lines.push(`**Required Role:** <@&${giveaway.requiredRoleId}>`);
  if (giveaway.requiredLevel) lines.push(`**Required Level:** ${giveaway.requiredLevel}`);
  lines.push(``, `> ID: ${giveaway.shortId}`);

  const embed = new EmbedBuilder().setColor(giveaway.color ?? DEFAULT_COLOR).setDescription(lines.join('\n'));
  if (giveaway.imageUrl) embed.setImage(giveaway.imageUrl);
  if (giveaway.thumbnailUrl) embed.setThumbnail(giveaway.thumbnailUrl);
  return embed;
}

function buildActionRow({ enterDisabled = false, count = 0 } = {}, lang = 'ja') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setStyle(ButtonStyle.Primary)
      .setLabel(`${t(lang, 'giveaway.enter.button')} (${count})`)
      .setDisabled(enterDisabled),
    new ButtonBuilder()
      .setCustomId('giveaway_participants')
      .setStyle(ButtonStyle.Secondary)
      .setLabel(t(lang, 'giveaway.participants.button'))
  );
}

async function entryCount(giveawayId) {
  return prisma.giveawayEntry.count({ where: { giveawayId } });
}

async function createGiveaway({ guild, channel, host, prize, winnerCount, durationMs, imageUrl, thumbnailUrl, color, endColor, requiredRoleId, bypassRoleId, winnersRoleId, requiredLevel, winnersDmMessage, coinPrize, creationMessage }) {
  const endsAt = new Date(Date.now() + durationMs);
  const shortId = await generateUniqueShortId();

  const giveaway = await prisma.giveaway.create({
    data: {
      guildId: guild.id,
      channelId: channel.id,
      prize,
      winnerCount,
      hostId: host.id,
      endsAt,
      shortId,
      imageUrl, thumbnailUrl, color, endColor, requiredRoleId, bypassRoleId, winnersRoleId, requiredLevel, winnersDmMessage, coinPrize
    },
  });

  const settings = await prisma.guildSettings.findUnique({ where: { guildId: guild.id } });
  const lang = settings?.language || 'ja';

  const embed = buildGiveawayEmbed(giveaway, {}, lang);
  const row = buildActionRow({ count: 0 }, lang);
  const message = await channel.send({ embeds: [embed], components: [row] });
  await prisma.giveaway.update({ where: { id: giveaway.id }, data: { messageId: message.id } });

  if (creationMessage) await channel.send(creationMessage).catch(() => {});
  return { giveaway, message };
}

async function refreshActivePanel(client, giveawayId) {
  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
  if (!giveaway || giveaway.status !== 'ACTIVE') return;

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel || !giveaway.messageId) return;
  const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) return;

  const settings = await prisma.guildSettings.findUnique({ where: { guildId: giveaway.guildId } });
  const lang = settings?.language || 'ja';

  const count = await entryCount(giveaway.id);
  const embed = buildGiveawayEmbed(giveaway, {}, lang);
  const row = buildActionRow({ count }, lang);
  await message.edit({ embeds: [embed], components: [row] }).catch(() => {});
}

async function endGiveaway(client, giveawayId) {
  const result = await prisma.giveaway.updateMany({
    where: { id: giveawayId, status: 'ACTIVE' },
    data: { status: 'ENDED' }
  });

  if (result.count === 0) return { error: 'not_active' };

  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId }, include: { entries: true } });
  if (!giveaway) return { error: 'not_found' };

  const winnerIds = pickWeightedWinners(giveaway.entries, giveaway.winnerCount);
  await prisma.giveaway.update({ where: { id: giveaway.id }, data: { winnerIds: winnerIds.join(',') } });
  await announceResult(client, giveaway, winnerIds, { isReroll: false });

  return { ok: true, winnerIds };
}

async function rerollGiveaway(client, giveawayId) {
  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId }, include: { entries: true } });
  if (!giveaway) return { error: 'not_found' };
  if (giveaway.status !== 'ENDED') return { error: 'not_ended' };

  const winnerIds = pickWeightedWinners(giveaway.entries, giveaway.winnerCount);
  await prisma.giveaway.update({ where: { id: giveaway.id }, data: { winnerIds: winnerIds.join(',') } });
  await announceResult(client, giveaway, winnerIds, { isReroll: true });

  return { ok: true, winnerIds };
}

// 修正: announceResultで、元のパネルを更新した後に、新しいパネルを送信する
async function announceResult(client, giveaway, winnerIds, { isReroll }) {
  const settings = await prisma.guildSettings.findUnique({ where: { guildId: giveaway.guildId } });
  const lang = settings?.language || 'ja';
  
  // 1. 元のパネル（参加ボタンがあるメッセージ）を終了状態に更新
  const originalEmbed = buildGiveawayEmbed(giveaway, { ended: true, winnerIds }, lang);
  const count = await entryCount(giveaway.id);
  const disabledRow = buildActionRow({ enterDisabled: true, count }, lang);

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel) return;

  if (giveaway.messageId) {
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (message) await message.edit({ embeds: [originalEmbed], components: [disabledRow] }).catch(() => {});
  }

  // 2. 当選者へのロール付与、コイン付与、DM送信
  if (winnerIds.length) {
    if (giveaway.winnersRoleId && channel.guild) {
      for (const userId of winnerIds) {
        const member = await channel.guild.members.fetch(userId).catch(() => null);
        if (member) await member.roles.add(giveaway.winnersRoleId).catch(() => {});
      }
    }
    if (giveaway.coinPrize) {
      const { addCoins } = require('../../lib/levelService');
      for (const userId of winnerIds) {
        await addCoins(giveaway.guildId, userId, Number(giveaway.coinPrize)).catch(() => {});
      }
    }
    if (giveaway.winnersDmMessage) {
      const dmText = giveaway.winnersDmMessage.replace(/\{prize\}/g, giveaway.prize);
      for (const userId of winnerIds) {
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) await user.send(dmText).catch(() => {});
      }
    }

    // 3. 新しい当選者発表パネルを送信
    const mentions = winnerIds.map((id) => `<@${id}>`).join(', ');
    const rerollCmd = `/giveaway reroll id:${giveaway.shortId}`;
    const winnerDesc = `${mentions} won the giveaway of **${giveaway.prize}**!\n  • Reroll Command: ${rerollCmd}`;
    
    const winnerEmbed = new EmbedBuilder()
      .setColor(giveaway.endColor ?? DEFAULT_END_COLOR)
      .setTitle(t(lang, isReroll ? 'giveaway.rerolled_title' : 'giveaway.ended_title'))
      .setDescription(winnerDesc)
      .setTimestamp();

    await channel.send({ content: mentions, embeds: [winnerEmbed] }).catch(() => {});
  }
}

async function setWeight(guildId, shortId, userId, multiplier) {
  const giveaway = await prisma.giveaway.findFirst({ where: { guildId, shortId } });
  if (!giveaway) return { error: 'not_found' };

  const entry = await prisma.giveawayEntry.findUnique({ where: { giveawayId_userId: { giveawayId: giveaway.id, userId } } });
  if (!entry) return { error: 'not_entered' };

  await prisma.giveawayEntry.update({ where: { id: entry.id }, data: { weight: multiplier } });
  return { ok: true };
}

async function buildParticipantsPage(giveawayId, page, lang = 'ja') {
  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
  const total = await entryCount(giveawayId);
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const safePage = Math.min(Math.max(0, page), maxPage);

  const entries = await prisma.giveawayEntry.findMany({
    where: { giveawayId },
    orderBy: { enteredAt: 'asc' },
    skip: safePage * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const totalPages = Math.max(1, maxPage + 1);
  const lines = entries.map((e, i) => `${safePage * PAGE_SIZE + i + 1}. <@${e.userId}>`);
  const desc = [
    `### ${t(lang, 'giveaway.participants.title')} (Page ${safePage + 1}/${totalPages})`,
    `Giveaway for **${giveaway?.prize ?? 'this giveaway'}**`,
    ``,
    lines.length ? lines.join('\n') : '*No participants yet.*',
    ``,
    `**Total Participants:** ${total}`
  ].join('\n');

  const embed = new EmbedBuilder().setColor(DEFAULT_COLOR).setDescription(desc);
  const prevPage = Math.max(0, safePage - 1);
  const nextPage = Math.min(maxPage, safePage + 1);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`giveaway_participants_page:${giveawayId}:${prevPage}:prev`).setLabel('‹').setStyle(ButtonStyle.Secondary).setDisabled(safePage <= 0),
    new ButtonBuilder().setCustomId(`giveaway_participants_page:${giveawayId}:${nextPage}:next`).setLabel('›').setStyle(ButtonStyle.Secondary).setDisabled(safePage >= maxPage)
  );
  return { embed, row };
}

async function saveTemplate(guildId, name, options) {
  return prisma.giveawayTemplate.upsert({
    where: { guildId_name: { guildId, name } },
    update: { ...options },
    create: { guildId, name, ...options },
  });
}

async function listTemplates(guildId) {
  return prisma.giveawayTemplate.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' } });
}

async function getTemplate(guildId, name) {
  return prisma.giveawayTemplate.findUnique({ where: { guildId_name: { guildId, name } } });
}

async function deleteTemplate(guildId, name) {
  const template = await prisma.giveawayTemplate.findUnique({ where: { guildId_name: { guildId, name } } });
  if (!template) return { error: 'not_found' };
  await prisma.giveawayTemplate.delete({ where: { id: template.id } });
  return { ok: true };
}

module.exports = {
  parseDuration, parseHexColor, pickWeightedWinners, createGiveaway, endGiveaway, rerollGiveaway,
  deleteGiveaway, fixGiveaway, refreshActivePanel, setWeight, entryCount, buildParticipantsPage,
  buildGiveawayEmbed, buildActionRow, saveTemplate, listTemplates, getTemplate, deleteTemplate,
  checkEntryRate, checkAccountAge
};

async function deleteGiveaway(client, giveawayId) {
  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
  if (!giveaway) return { error: 'not_found' };

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (channel && giveaway.messageId) {
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (message) await message.delete().catch(() => {});
  }
  await prisma.giveaway.delete({ where: { id: giveaway.id } });
  return { ok: true };
}

async function fixGiveaway(client, giveawayId) {
  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
  if (!giveaway) return { error: 'not_found' };

  if (giveaway.status === 'ACTIVE' && giveaway.endsAt <= new Date()) {
    const result = await endGiveaway(client, giveaway.id);
    return { ok: true, action: 'ended', winnerIds: result.winnerIds };
  }

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel) return { error: 'channel_missing' };

  let needsRepost = true;
  if (giveaway.messageId) {
    const existing = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (existing) needsRepost = false;
  }

  if (needsRepost) {
    const settings = await prisma.guildSettings.findUnique({ where: { guildId: giveaway.guildId } });
    const lang = settings?.language || 'ja';
    const count = await entryCount(giveaway.id);
    const ended = giveaway.status === 'ENDED';
    const winnerIds = ended && giveaway.winnerIds ? giveaway.winnerIds.split(',').filter(Boolean) : [];
    const embed = buildGiveawayEmbed(giveaway, { ended, winnerIds }, lang);
    const row = buildActionRow({ enterDisabled: ended, count }, lang);
    const message = await channel.send({ embeds: [embed], components: [row] });
    await prisma.giveaway.update({ where: { id: giveaway.id }, data: { messageId: message.id } });
    return { ok: true, action: 'reposted' };
  }
  return { ok: true, action: 'none' };
}

const entryRateMap = new Map();
const RATE_LIMIT_WINDOW = 7000;
const RATE_LIMIT_MAX = 5;

function checkEntryRate(userId) {
  const now = Date.now();
  let data = entryRateMap.get(userId);
  if (!data) {
    data = { lastEntries: [] };
    entryRateMap.set(userId, data);
  }
  data.lastEntries = data.lastEntries.filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (data.lastEntries.length >= RATE_LIMIT_MAX) return { allowed: false };
  data.lastEntries.push(now);
  return { allowed: true };
}

async function checkAccountAge(user, guildId) {
  const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
  const minAgeDays = 7;
  const minAgeMs = minAgeDays * 24 * 60 * 60 * 1000;
  const accountAge = Date.now() - user.createdTimestamp;

  if (accountAge < minAgeMs) {
    return {
      allowed: false,
      minAgeDays,
      accountAgeDays: Math.floor(accountAge / (24 * 60 * 60 * 1000)),
    };
  }
  return { allowed: true };
}