// src/commands/moderation/channel-reset.js
const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');
const logger = require('../../lib/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channel-reset')
    .setDescription('このチャンネルを初期化（クローン作成後、元チャンネルを削除）します / Reset this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    if (!interaction.appPermissions.has(PermissionFlagsBits.ManageChannels)) {
      const msg = await tGuild(interaction.guild.id, 'channelreset.error_perms');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const oldChannel = interaction.channel;
    const msg = await tGuild(interaction.guild.id, 'channelreset.started');
    const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
    
    await interaction.reply({ embeds: [embed] });

    try {
      // チャンネルを複製 (権限設定を正確に引き継ぐ)
      const newChannel = await oldChannel.clone({
        name: oldChannel.name,
        topic: oldChannel.topic,
        nsfw: oldChannel.nsfw,
        parent: oldChannel.parentId,
        position: oldChannel.position,
        permissionOverwrites: oldChannel.permissionOverwrites.cache.map(o => ({
          id: o.id,
          allow: o.allow,
          deny: o.deny,
          type: o.type
        })),
        reason: `Channel reset by ${interaction.user.tag}`,
        type: ChannelType.GuildText,
      });

      // ログ送信
      const logChannelSetting = await prisma.logChannel.findUnique({
        where: { guildId_type: { guildId: interaction.guild.id, type: 'moderation' } }
      });

      if (logChannelSetting) {
        const channel = interaction.guild.channels.cache.get(logChannelSetting.channelId);
        if (channel) {
          const logMsg = await tGuild(interaction.guild.id, 'channelreset.log', { user: interaction.user.toString(), old_channel: oldChannel.name });
          const logEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(logMsg)
            .setTimestamp();
          await channel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }

      // 元のチャンネルを削除
      await oldChannel.delete(`Channel reset by ${interaction.user.tag}`).catch(() => {});
    } catch (err) {
      logger.error('Channel reset error:', err);
    }
  },
};