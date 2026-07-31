// src/commands/moderation/antiraid.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('荒らし対策を設定します / Configure antiraid')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('荒らし対策を有効化 / Enable antiraid')
        .addIntegerOption((opt) => opt.setName('threshold').setDescription('参加人数の閾値 / Join threshold').setMinValue(2).setRequired(false))
        .addIntegerOption((opt) => opt.setName('window_sec').setDescription('期間(秒) / Window in seconds').setMinValue(1).setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('荒らし対策を無効化 / Disable antiraid')
    ),
  category: 'モデレーション / Moderation',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'enable') {
      const threshold = interaction.options.getInteger('threshold') ?? 8;
      const windowSec = interaction.options.getInteger('window_sec') ?? 10;

      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { antiraidEnabled: true, antiraidJoinThreshold: threshold, antiraidJoinWindowSec: windowSec },
        create: { guildId: interaction.guild.id, antiraidEnabled: true, antiraidJoinThreshold: threshold, antiraidJoinWindowSec: windowSec },
      });

      const msg = await tGuild(interaction.guild.id, 'antiraid.enabled');
      const detail = await tGuild(interaction.guild.id, 'antiraid.enabled_detail', { threshold, windowSec });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(`${msg}\n${detail}`);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (sub === 'disable') {
      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { antiraidEnabled: false },
        create: { guildId: interaction.guild.id, antiraidEnabled: false },
      });

      const msg = await tGuild(interaction.guild.id, 'antiraid.disabled');
      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};