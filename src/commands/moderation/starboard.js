// src/commands/moderation/starboard.js
const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('スターボードを設定します / Setup Starboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('スターボードの送信先を設定 / Set starboard channel')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('送信先チャンネル / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addIntegerOption((opt) => opt.setName('threshold').setDescription('必要スター数 / Threshold').setMinValue(1).setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('スターボードを無効化 / Disable starboard')
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const threshold = interaction.options.getInteger('threshold') ?? 5;

      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { starboardChannelId: channel.id, starboardThreshold: threshold },
        create: { guildId: interaction.guild.id, starboardChannelId: channel.id, starboardThreshold: threshold },
      });

      const msg = await tGuild(interaction.guild.id, 'starboard.setup_success', { channel: channel.toString(), threshold: threshold });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'disable') {
      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { starboardChannelId: null },
        create: { guildId: interaction.guild.id, starboardChannelId: null },
      });

      const msg = await tGuild(interaction.guild.id, 'starboard.disabled');
      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};