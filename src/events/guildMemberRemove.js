// src/events/guildMemberRemove.js
const { EmbedBuilder } = require('discord.js');
const { prisma } = require('../lib/database');
const { tGuild } = require('../lib/i18n');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: member.guild.id }
    });

    if (!settings) return;

    // --- メンバーログ (退出) ---
    const logChannelSetting = await prisma.logChannel.findUnique({
      where: { guildId_type: { guildId: member.guild.id, type: 'member' } }
    });
    if (logChannelSetting) {
      const channel = member.guild.channels.cache.get(logChannelSetting.channelId);
      if (channel) {
        const roles = member.roles.cache.map(r => `<@&${r.id}>`).join(', ') || 'None';
        const title = await tGuild(member.guild.id, 'log.title_member_leave');
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setTitle(title)
          .addFields(
            { name: 'User', value: `${member.user.tag} (<@${member.user.id}>)`, inline: false },
            { name: 'User ID', value: member.user.id, inline: false },
            { name: 'Roles', value: roles, inline: false }
          )
          .setTimestamp();
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    // --- 退出メッセージ ---
    if (settings.leaveChannelId) {
      const channel = member.guild.channels.cache.get(settings.leaveChannelId);
      if (channel) {
        const title = await tGuild(member.guild.id, 'leave.title');
        const desc = await tGuild(member.guild.id, 'leave.desc', {
          username: member.user.username,
          membercount: member.guild.memberCount
        });

        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(title)
          .setDescription(desc)
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  },
};