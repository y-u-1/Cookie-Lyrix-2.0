// src/commands/level/levelInteractions.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getTopUsers } = require('../../lib/levelService');
const { tGuild } = require('../../lib/i18n');
const { joinLinesSafely } = require('../../lib/embedUtils');

const PAGE_SIZE = 20; // 20人に変更

async function handlePage(interaction) {
  const page = parseInt(interaction.customId.split('_')[2]);
  const offset = (page - 1) * PAGE_SIZE;

  const title = await tGuild(interaction.guild.id, 'level.panel_title');
  const desc = await tGuild(interaction.guild.id, 'level.panel_desc');
  const topUsersName = await tGuild(interaction.guild.id, 'level.top_users');
  const noData = await tGuild(interaction.guild.id, 'level.no_data');
  const pageText = await tGuild(interaction.guild.id, 'level.page', { page: page });
  const xpName = await tGuild(interaction.guild.id, 'level.xp_name');
  
  const topUsers = await getTopUsers(interaction.guild.id, PAGE_SIZE, offset); 
  
  const lines = topUsers.map((u, i) => {
    const rank = offset + i + 1;
    return `**${rank}.** <@${u.userId}> - **LV. ${u.level}** (${Number(u.xp)} ${xpName})`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(title)
    .setDescription(desc)
    .addFields({ name: `${topUsersName} (${pageText})`, value: joinLinesSafely(lines) ?? noData })
    .setFooter({ text: await tGuild(interaction.guild.id, 'level.last_updated') })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`level_page_${page - 1}`).setLabel('‹').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
    new ButtonBuilder().setCustomId(`level_page_${page + 1}`).setLabel('›').setStyle(ButtonStyle.Secondary).setDisabled(topUsers.length < PAGE_SIZE)
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

async function route(interaction) {
  if (interaction.customId.startsWith('level_page_')) return handlePage(interaction);
  return null;
}

module.exports = { route };