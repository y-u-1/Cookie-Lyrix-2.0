// src/commands/general/help.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Botのコマンド一覧を表示します / Show command list'),
  category: '一般 / General',
  async execute(interaction) {
    const commands = interaction.client.commands;
    
    const categories = new Map();
    for (const command of commands.values()) {
      const category = command.category || 'その他 / Other';
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
      let value = cmds.join(' | ');
      if (value.length > 1020) value = value.slice(0, 1020) + '…';
      embed.addFields({ name: category, value, inline: false });
    }

    embed.setFooter({ text: 'Cookie Lyrix 2.0' });
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};