// src/events/guildMemberUpdate.js
const { EmbedBuilder } = require('discord.js');
const { prisma } = require('../lib/database');
const { tGuild } = require('../lib/i18n');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    // ニックネーム変更・ロール付与/剥奪をメンバーログ(channelCreate等と同じ 'member' タイプ)に記録する
    const logChannelSetting = await prisma.logChannel.findUnique({
      where: { guildId_type: { guildId: newMember.guild.id, type: 'member' } }
    });
    if (!logChannelSetting) return;

    const channel = newMember.guild.channels.cache.get(logChannelSetting.channelId);
    if (!channel) return;

    // --- ニックネーム変更 ---
    if (oldMember.nickname !== newMember.nickname) {
      const title = await tGuild(newMember.guild.id, 'log.title_nickname_changed');
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setTitle(title)
        .addFields(
          { name: 'User', value: `<@${newMember.id}>`, inline: false },
          { name: 'Before', value: oldMember.nickname || '(none)', inline: true },
          { name: 'After', value: newMember.nickname || '(none)', inline: true }
        )
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => {});
    }

    // --- ロールの付与/剥奪 ---
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const addedRoles = newRoles.filter((r) => !oldRoles.has(r.id));
    const removedRoles = oldRoles.filter((r) => !newRoles.has(r.id));

    if (addedRoles.size > 0) {
      const title = await tGuild(newMember.guild.id, 'log.title_role_added');
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setTitle(title)
        .addFields(
          { name: 'User', value: `<@${newMember.id}>`, inline: false },
          { name: 'Role(s)', value: addedRoles.map((r) => `<@&${r.id}>`).join(', '), inline: false }
        )
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => {});
    }

    if (removedRoles.size > 0) {
      const title = await tGuild(newMember.guild.id, 'log.title_role_removed');
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
        .setTitle(title)
        .addFields(
          { name: 'User', value: `<@${newMember.id}>`, inline: false },
          { name: 'Role(s)', value: removedRoles.map((r) => `<@&${r.id}>`).join(', '), inline: false }
        )
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  },
};
