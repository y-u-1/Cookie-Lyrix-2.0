// src/commands/economy/economyInteractions.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getTopUsersByCoins } = require('../../lib/levelService');
const { tGuild } = require('../../lib/i18n');
const { joinLinesSafely } = require('../../lib/embedUtils');

const PAGE_SIZE = 20; // 20人に変更

async function handlePage(interaction) {
  const page = parseInt(interaction.customId.split('_')[2]);
  const offset = (page - 1) * PAGE_SIZE;

  const title = await tGuild(interaction.guild.id, 'economy.coin_panel_title');
  const desc = await tGuild(interaction.guild.id, 'economy.coin_panel_desc');
  const topUsersName = await tGuild(interaction.guild.id, 'level.top_users');
  const noData = await tGuild(interaction.guild.id, 'level.no_data');
  const pageText = await tGuild(interaction.guild.id, 'level.page', { page: page });
  const coinsName = await tGuild(interaction.guild.id, 'economy.coin_name'); // 言語を取得
  
  const topUsers = await getTopUsersByCoins(interaction.guild.id, PAGE_SIZE, offset); 
  
  const lines = topUsers.map((u, i) => {
    const rank = offset + i + 1;
    return `**${rank}.** <@${u.userId}> - **${Number(u.coins)} ${coinsName}**`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle(title)
    .setDescription(desc)
    .addFields({ name: `${topUsersName} (${pageText})`, value: joinLinesSafely(lines) ?? noData })
    .setFooter({ text: await tGuild(interaction.guild.id, 'level.last_updated') })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`coin_page_${page - 1}`).setLabel('‹').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
    new ButtonBuilder().setCustomId(`coin_page_${page + 1}`).setLabel('›').setStyle(ButtonStyle.Secondary).setDisabled(topUsers.length < PAGE_SIZE)
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

async function route(interaction) {
  if (interaction.customId.startsWith('coin_page_')) return handlePage(interaction);
  return null;
}

module.exports = { route };