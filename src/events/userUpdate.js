// src/events/userUpdate.js
const { EmbedBuilder } = require('discord.js');
const { prisma } = require('../lib/database');
const { tGuild } = require('../lib/i18n');

module.exports = {
  name: 'userUpdate',
  async execute(oldUser, newUser) {
    // アバターに変更がなければ何もしない(ユーザー名変更など他の更新もこのイベントで発火するため)
    if (oldUser.avatar === newUser.avatar) return;

    // userUpdateはDiscord全体で1回だけ発火するグローバルイベントなので、
    // このユーザーと同じサーバーにいる場合のみ、そのサーバーのメンバーログに通知する。
    for (const guild of newUser.client.guilds.cache.values()) {
      const member = guild.members.cache.get(newUser.id);
      if (!member) continue;

      const logChannelSetting = await prisma.logChannel.findUnique({
        where: { guildId_type: { guildId: guild.id, type: 'member' } }
      });
      if (!logChannelSetting) continue;

      const channel = guild.channels.cache.get(logChannelSetting.channelId);
      if (!channel) continue;

      const title = await tGuild(guild.id, 'log.title_avatar_changed');
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: newUser.tag, iconURL: newUser.displayAvatarURL() })
        .setTitle(title)
        .addFields({ name: 'User', value: `<@${newUser.id}>`, inline: false })
        .setThumbnail(newUser.displayAvatarURL({ size: 256 }))
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  },
};
