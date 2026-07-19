// src/events/messageUpdate.js
const { EmbedBuilder } = require('discord.js');
const { prisma } = require('../lib/database');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage) {
    // nullチェックを強化
    if (!oldMessage || !newMessage) return;
    if (!oldMessage.guild || !newMessage.guild) return;
    if (!oldMessage.author || !newMessage.author) return;
    if (oldMessage.author.bot) return;
    
    if (oldMessage.content === newMessage.content) return;

    const logChannelSetting = await prisma.logChannel.findUnique({
      where: { guildId_type: { guildId: oldMessage.guild.id, type: 'message' } }
    });
    if (!logChannelSetting) return;

    const channel = oldMessage.guild.channels.cache.get(logChannelSetting.channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL() })
      .setTitle('メッセージ編集')
      .addFields(
        { name: 'Channel', value: `<#${oldMessage.channel.id}>`, inline: false },
        { name: 'Before', value: oldMessage.content || '*No content*', inline: false },
        { name: 'After', value: newMessage.content || '*No content*', inline: false },
        { name: 'Message ID', value: oldMessage.id, inline: false }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  },
};