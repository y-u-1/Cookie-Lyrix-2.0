// src/commands/moderation/earthquake.js
const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('earthquake')
    .setDescription('地震通知を設定します / Setup earthquake notifications')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('通知チャンネルと最小震度を設定 / Set notification channel and minimum scale')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('送信先チャンネル / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('min_scale').setDescription('通知する最小震度 / Minimum scale').setMinValue(1).setMaxValue(7).setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('地震通知を無効化 / Disable earthquake notifications')
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const minScale = interaction.options.getInteger('min_scale') ?? 4;

      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { earthquakeChannelId: channel.id, earthquakeMinScale: minScale },
        create: { guildId: interaction.guild.id, earthquakeChannelId: channel.id, earthquakeMinScale: minScale },
      });

      const msg = await tGuild(interaction.guild.id, 'earthquake.setup_success', { channel: channel.toString(), min_scale: minScale });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'disable') {
      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { earthquakeChannelId: null },
        create: { guildId: interaction.guild.id, earthquakeChannelId: null },
      });

      const msg = await tGuild(interaction.guild.id, 'earthquake.disabled');
      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};