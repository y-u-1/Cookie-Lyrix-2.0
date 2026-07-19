// src/commands/general/affinityInteractions.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getTopAffinity } = require('../../lib/levelService');
const { tGuild } = require('../../lib/i18n');

async function handlePage(interaction) {
  const page = parseInt(interaction.customId.split('_')[2]);
  const offset = (page - 1) * 30;

  const title = await tGuild(interaction.guild.id, 'affinity.panel_title');
  const desc = await tGuild(interaction.guild.id, 'affinity.panel_desc');
  const topUsersName = await tGuild(interaction.guild.id, 'affinity.top_pairs');
  const noData = await tGuild(interaction.guild.id, 'affinity.no_data');
  const lastUpdated = await tGuild(interaction.guild.id, 'level.last_updated');

  const affinities = await getTopAffinity(interaction.guild.id, 30, offset);
  const lines = affinities.map((a, i) => `**${offset + i + 1}.** <@${a.userId}> と <@${a.targetId}> - **${a.points} ポイント**`);

  const embed = new EmbedBuilder()
    .setColor(0xEB459E)
    .setTitle(title)
    .setDescription(desc)
    .addFields({ name: topUsersName, value: lines.length ? lines.join('\n') : noData })
    .setFooter({ text: lastUpdated })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`affinity_page_${page - 1}`).setLabel('‹').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
    new ButtonBuilder().setCustomId(`affinity_page_${page + 1}`).setLabel('›').setStyle(ButtonStyle.Secondary).setDisabled(affinities.length < 30)
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

async function route(interaction) {
  if (interaction.customId.startsWith('affinity_page_')) return handlePage(interaction);
  return null;
}

module.exports = { route };
