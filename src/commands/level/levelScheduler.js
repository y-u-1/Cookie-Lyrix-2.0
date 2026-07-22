// src/commands/level/levelScheduler.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('../../lib/database');
const { getTopUsers, getTopUsersByCoins, getTopAffinity } = require('../../lib/levelService');
const { tGuild } = require('../../lib/i18n');
const { joinLinesSafely } = require('../../lib/embedUtils');
const logger = require('../../lib/logger');

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const PAGE_SIZE = 10; // 1024文字制限に収まるよう、1ページあたりの表示件数を抑える(各ページ送りボタンの件数と合わせる)

async function updatePanel(client, panel) {
  const channel = await client.channels.fetch(panel.channelId).catch(() => null);
  if (!channel) return;

  const message = await channel.messages.fetch(panel.messageId).catch(() => null);
  if (!message) return;

  let title, desc, lines, fieldName, color, pagePrefix;
  const noData = await tGuild(panel.guildId, 'level.no_data');
  const lastUpdated = await tGuild(panel.guildId, 'level.last_updated');

  if (panel.type === 'COIN') {
    title = await tGuild(panel.guildId, 'economy.coin_panel_title');
    desc = await tGuild(panel.guildId, 'economy.coin_panel_desc');
    fieldName = await tGuild(panel.guildId, 'level.top_users');
    const coinsName = await tGuild(panel.guildId, 'economy.coin_name');
    const topUsers = await getTopUsersByCoins(panel.guildId, PAGE_SIZE);
    lines = topUsers.map((u, i) => `**${i + 1}.** <@${u.userId}> - **${Number(u.coins)} ${coinsName}**`);
    color = 0xFEE75C;
    pagePrefix = 'coin';
  } else if (panel.type === 'AFFINITY') {
    title = await tGuild(panel.guildId, 'affinity.panel_title');
    desc = await tGuild(panel.guildId, 'affinity.panel_desc');
    fieldName = await tGuild(panel.guildId, 'affinity.top_pairs');
    const pointsName = await tGuild(panel.guildId, 'affinity.points_name');
    const topAffinities = await getTopAffinity(panel.guildId, PAGE_SIZE);
    lines = topAffinities.map((a, i) => `**${i + 1}.** <@${a.userId}> & <@${a.targetId}> - **${a.points} ${pointsName}**`);
    color = 0xEB459E;
    pagePrefix = 'affinity';
  } else {
    title = await tGuild(panel.guildId, 'level.panel_title');
    desc = await tGuild(panel.guildId, 'level.panel_desc');
    fieldName = await tGuild(panel.guildId, 'level.top_users');
    const xpName = await tGuild(panel.guildId, 'level.xp_name');
    const topUsers = await getTopUsers(panel.guildId, PAGE_SIZE);
    lines = topUsers.map((u, i) => `**${i + 1}.** <@${u.userId}> - **LV. ${u.level}** (${Number(u.xp)} ${xpName})`);
    color = 0x5865F2;
    pagePrefix = 'level';
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(desc)
    .addFields({ name: fieldName, value: joinLinesSafely(lines) ?? noData })
    .setFooter({ text: lastUpdated })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${pagePrefix}_page_1`).setLabel('‹').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`${pagePrefix}_page_2`).setLabel('›').setStyle(ButtonStyle.Secondary)
  );

  await message.edit({ embeds: [embed], components: [row] }).catch(() => {});
}

function startLevelScheduler(client) {
  setInterval(async () => {
    try {
      const panels = await prisma.leaderboardPanel.findMany();
      for (const panel of panels) {
        await updatePanel(client, panel).catch((err) => {
          logger.error(`Leaderboard update error (${panel.id}):`, err);
        });
      }
    } catch (err) {
      logger.error('Level scheduler error:', err);
    }
  }, CHECK_INTERVAL_MS);

  logger.success('Stats scheduler started.');
}

module.exports = { startLevelScheduler };