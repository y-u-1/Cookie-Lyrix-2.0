// src/commands/moderation/spam-filter.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spam-filter')
    .setDescription('スパムフィルターの設定を行います / Configure spam filter')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('スパム判定の閾値を設定 / Set threshold')
        .addIntegerOption((opt) => 
          opt.setName('threshold').setDescription('何回連投でスパムと判定するか / Threshold').setMinValue(3).setMaxValue(20).setRequired(true))
        .addIntegerOption((opt) => 
          opt.setName('window_sec').setDescription('何秒以内か / Window in seconds').setMinValue(1).setMaxValue(60).setRequired(true))
    ),
  category: 'モデレーション / Moderation',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    
    if (sub === 'set') {
      const threshold = interaction.options.getInteger('threshold');
      const windowSec = interaction.options.getInteger('window_sec');

      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { floodThreshold: threshold, floodWindowSec: windowSec },
        create: { guildId: interaction.guild.id, floodThreshold: threshold, floodWindowSec: windowSec },
      });

      const msg = await tGuild(interaction.guild.id, 'spam.set_success', { threshold, window_sec: windowSec });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};