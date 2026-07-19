// src/commands/general/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Botのコマンド一覧を表示します / Show command list'),
  async execute(interaction) {
    const commands = interaction.client.commands;
    
    const categories = new Map();
    for (const command of commands.values()) {
      const category = command.category || 'Other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category).push(`\`/${command.data.name}\``);
    }

    const title = await tGuild(interaction.guild.id, 'help_title');
    const desc = await tGuild(interaction.guild.id, 'help_desc');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(title)
      .setDescription(desc)
      .setTimestamp();

    for (const [category, cmds] of categories) {
      embed.addFields({ name: category, value: cmds.join(' | '), inline: false });
    }

    embed.setFooter({ text: 'Cookie Lyrix 2.0' });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};