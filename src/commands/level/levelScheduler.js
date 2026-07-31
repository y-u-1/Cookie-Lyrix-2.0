// src/commands/level/levelScheduler.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('../../lib/database');
const { getTopUsers, getTopUsersByCoins, getTopAffinity } = require('../../lib/levelService');
const { tGuild } = require('../../lib/i18n');
const { joinLinesSafely } = require('../../lib/embedUtils');
const logger = require('../../lib/logger');

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const PAGE_SIZE = 20; // 1ページ20人に変更
// 親密度パネルは1行に2人分のメンションが入るため、level/coinと同じ20件だと
// Discordの埋め込みフィールド上限(1024文字)を超えやすい。
// affinityInteractions.jsのページングもPAGE_SIZE=10で実装されているため、
// ここが20のままだと「次へ」ボタンを押した際のオフセット計算がズレて、
// 表示が飛んだり重複したりするバグがあった。ページングと同じ値に揃える。
const AFFINITY_PAGE_SIZE = 10;

async function updatePanel(client, panel) {
  const channel = await client.channels.fetch(panel.channelId).catch(() => null);
  if (!channel) return;

  const message = await channel.messages.fetch(panel.messageId).catch(() => null);
  if (!message) return;

  let title, desc, lines, fieldName, color, pagePrefix, hasNextPage;
  const noData = await tGuild(panel.guildId, 'level.no_data');
  const lastUpdated = await tGuild(panel.guildId, 'level.last_updated');

  if (panel.type === 'COIN') {
    title = await tGuild(panel.guildId, 'economy.coin_panel_title');
    desc = await tGuild(panel.guildId, 'economy.coin_panel_desc');
    fieldName = await tGuild(panel.guildId, 'level.top_users');
    const topUsers = await getTopUsersByCoins(panel.guildId, PAGE_SIZE);
    // 「コイン」表記を削除し、数字のみに変更
    lines = topUsers.map((u, i) => `**${i + 1}.** <@${u.userId}> - **${Number(u.coins)}**`);
    color = 0xFEE75C;
    pagePrefix = 'coin';
    hasNextPage = topUsers.length >= PAGE_SIZE;
  } else if (panel.type === 'AFFINITY') {
    title = await tGuild(panel.guildId, 'affinity.panel_title');
    desc = await tGuild(panel.guildId, 'affinity.panel_desc');
    fieldName = await tGuild(panel.guildId, 'affinity.top_pairs');
    const pointsName = await tGuild(panel.guildId, 'affinity.points_name');
    const topAffinities = await getTopAffinity(panel.guildId, AFFINITY_PAGE_SIZE);
    lines = topAffinities.map((a, i) => `**${i + 1}.** <@${a.userId}> & <@${a.targetId}> - **${a.points} ${pointsName}**`);
    color = 0xEB459E;
    pagePrefix = 'affinity';
    hasNextPage = topAffinities.length >= AFFINITY_PAGE_SIZE;
  } else {
    title = await tGuild(panel.guildId, 'level.panel_title');
    desc = await tGuild(panel.guildId, 'level.panel_desc');
    fieldName = await tGuild(panel.guildId, 'level.top_users');
    const xpName = await tGuild(panel.guildId, 'level.xp_name');
    const topUsers = await getTopUsers(panel.guildId, PAGE_SIZE);
    lines = topUsers.map((u, i) => `**${i + 1}.** <@${u.userId}> - **LV. ${u.level}** (${Number(u.xp)} ${xpName})`);
    color = 0x5865F2;
    pagePrefix = 'level';
    hasNextPage = topUsers.length >= PAGE_SIZE;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(desc)
    .addFields({ name: fieldName, value: joinLinesSafely(lines) ?? noData })
    .setFooter({ text: lastUpdated })
    .setTimestamp();

  // データがPAGE_SIZE未満(=次のページが存在しない)場合は「›」ボタンを無効化する。
  // 以前は自動更新のたびに常に有効なボタンで上書きされてしまい、
  // 一度ページ送りで正しく無効化されても5分後には元に戻ってしまうバグがあった。
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${pagePrefix}_page_1`).setLabel('‹').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`${pagePrefix}_page_2`).setLabel('›').setStyle(ButtonStyle.Secondary).setDisabled(!hasNextPage)
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