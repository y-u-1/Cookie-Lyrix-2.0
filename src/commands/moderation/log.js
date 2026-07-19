// src/commands/moderation/log.js
const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log')
    .setDescription('ログチャンネルを設定します / Setup log channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup((group) =>
      group
        .setName('set')
        .setDescription('ログの送信先を設定 / Set log channel')
        .addSubcommand((sub) => sub.setName('moderation').setDescription('モデレーションログ / Moderation log').addChannelOption((opt) => opt.setName('channel').setDescription('送信先 / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand((sub) => sub.setName('ticket').setDescription('チケットログ / Ticket log').addChannelOption((opt) => opt.setName('channel').setDescription('送信先 / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand((sub) => sub.setName('member').setDescription('メンバーログ / Member log').addChannelOption((opt) => opt.setName('channel').setDescription('送信先 / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand((sub) => sub.setName('message').setDescription('メッセージログ / Message log').addChannelOption((opt) => opt.setName('channel').setDescription('送信先 / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand((sub) => sub.setName('voice').setDescription('VCログ / Voice log').addChannelOption((opt) => opt.setName('channel').setDescription('送信先 / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand((sub) => sub.setName('spam').setDescription('スパムログ / Spam log').addChannelOption((opt) => opt.setName('channel').setDescription('送信先 / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand((sub) => sub.setName('channel').setDescription('チャンネルログ / Channel log').addChannelOption((opt) => opt.setName('channel').setDescription('送信先 / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand((sub) => sub.setName('redeem').setDescription('Redeemログ / Redeem log').addChannelOption((opt) => opt.setName('channel').setDescription('送信先 / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true))) // 追加
    )
    .addSubcommandGroup((group) =>
      group
        .setName('disable')
        .setDescription('ログを無効化 / Disable log')
        .addSubcommand((sub) => sub.setName('moderation').setDescription('モデレーションログ / Moderation log'))
        .addSubcommand((sub) => sub.setName('ticket').setDescription('チケットログ / Ticket log'))
        .addSubcommand((sub) => sub.setName('member').setDescription('メンバーログ / Member log'))
        .addSubcommand((sub) => sub.setName('message').setDescription('メッセージログ / Message log'))
        .addSubcommand((sub) => sub.setName('voice').setDescription('VCログ / Voice log'))
        .addSubcommand((sub) => sub.setName('spam').setDescription('スパムログ / Spam log'))
        .addSubcommand((sub) => sub.setName('channel').setDescription('チャンネルログ / Channel log'))
        .addSubcommand((sub) => sub.setName('redeem').setDescription('Redeemログ / Redeem log')) // 追加
    ),
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    if (group === 'set') {
      const channel = interaction.options.getChannel('channel');
      await prisma.logChannel.upsert({
        where: { guildId_type: { guildId: interaction.guild.id, type: sub } },
        update: { channelId: channel.id },
        create: { guildId: interaction.guild.id, type: sub, channelId: channel.id },
      });

      const typeText = await tGuild(interaction.guild.id, `log.type_${sub}`);
      const msg = await tGuild(interaction.guild.id, 'log.setup_success', { type: typeText, channel: channel.toString() });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (group === 'disable') {
      await prisma.logChannel.deleteMany({
        where: { guildId: interaction.guild.id, type: sub },
      });

      const typeText = await tGuild(interaction.guild.id, `log.type_${sub}`);
      const msg = await tGuild(interaction.guild.id, 'log.setup_disabled', { type: typeText });
      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};