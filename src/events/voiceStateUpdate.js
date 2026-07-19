// src/events/voiceStateUpdate.js
const { EmbedBuilder } = require('discord.js');
const { prisma } = require('../lib/database');
const { tGuild } = require('../lib/i18n');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: newState.guild.id },
    });

    if (settings && settings.tempVcChannelId && settings.tempVcCategoryId) {
      // --- Temp VC作成 ---
      if (newState.channelId && newState.channelId === settings.tempVcChannelId) {
        const channelName = await tGuild(newState.guild.id, 'tempvc.channel_name', { user: newState.member.user.username });
        const newChannel = await newState.guild.channels.create({
          name: channelName,
          type: 2, // GuildVoice
          parent: settings.tempVcCategoryId,
        });
        await newState.member.voice.setChannel(newChannel).catch(() => {});
      }

      // --- Temp VC削除 ---
      if (oldState.channelId && oldState.channelId !== settings.tempVcChannelId && oldState.channel?.parentId === settings.tempVcCategoryId) {
        if (oldState.channel.members.size === 0) {
          await oldState.channel.delete().catch(() => {});
        }
      }
    }

    // --- VCログ ---
    const logChannelSetting = await prisma.logChannel.findUnique({
      where: { guildId_type: { guildId: newState.guild.id, type: 'voice' } }
    });
    if (logChannelSetting) {
      const channel = newState.guild.channels.cache.get(logChannelSetting.channelId);
      if (channel) {
        let embed;
        if (!oldState.channelId && newState.channelId) {
          // 参加
          const title = await tGuild(newState.guild.id, 'log.title_voice_join');
          embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
            .setTitle(title)
            .addFields({ name: 'Channel', value: `<#${newState.channelId}>` })
            .setTimestamp();
        } else if (oldState.channelId && !newState.channelId) {
          // 退出
          const title = await tGuild(newState.guild.id, 'log.title_voice_leave');
          embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
            .setTitle(title)
            .addFields({ name: 'Channel', value: `<#${oldState.channelId}>` })
            .setTimestamp();
        } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
          // 移動
          const title = await tGuild(newState.guild.id, 'log.title_voice_move');
          embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
            .setTitle(title)
            .addFields(
              { name: 'From', value: `<#${oldState.channelId}>`, inline: false },
              { name: 'To', value: `<#${newState.channelId}>`, inline: false }
            )
            .setTimestamp();
        }

        if (embed) {
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }
  },
};