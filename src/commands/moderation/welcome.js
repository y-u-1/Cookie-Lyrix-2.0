// src/commands/moderation/welcome.js
const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('参加・退出メッセージを設定します / Setup welcome and leave messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('set-welcome')
        .setDescription('参加メッセージの送信先を設定 / Set welcome channel')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('送信先チャンネル / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('set-leave')
        .setDescription('退出メッセージの送信先を設定 / Set leave channel')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('送信先チャンネル / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel');

    if (sub === 'set-welcome') {
      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { welcomeChannelId: channel.id },
        create: { guildId: interaction.guild.id, welcomeChannelId: channel.id },
      });

      const msg = await tGuild(interaction.guild.id, 'welcome.setup_success', { channel: channel.toString() });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'set-leave') {
      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { leaveChannelId: channel.id },
        create: { guildId: interaction.guild.id, leaveChannelId: channel.id },
      });

      const msg = await tGuild(interaction.guild.id, 'leave.setup_success', { channel: channel.toString() });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};