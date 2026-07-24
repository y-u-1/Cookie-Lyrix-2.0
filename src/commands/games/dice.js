// src/commands/games/dice.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('サイコロを振ります / Roll a dice')
    .addIntegerOption((opt) =>
      opt.setName('sides').setDescription('面の数(デフォルト6) / Number of sides (default 6)').setMinValue(2).setMaxValue(100).setRequired(false)
    ),
  category: 'ゲーム / Games',
  async execute(interaction) {
    const sides = interaction.options.getInteger('sides') ?? 6;
    const result = Math.floor(Math.random() * sides) + 1;

    const msg = await tGuild(interaction.guild.id, 'games.dice_title', {
      user: interaction.user.toString(),
      sides,
      result,
    });
    const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);

    await interaction.reply({ embeds: [embed] });
  },
};
