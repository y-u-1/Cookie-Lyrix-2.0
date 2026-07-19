// src/events/messageDelete.js
const { EmbedBuilder } = require('discord.js');
const { prisma } = require('../lib/database');
const { tGuild } = require('../lib/i18n');

module.exports = {
  name: 'messageDelete',
  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    const logChannelSetting = await prisma.logChannel.findUnique({
      where: { guildId_type: { guildId: message.guild.id, type: 'message' } }
    });
    if (!logChannelSetting) return;

    const channel = message.guild.channels.cache.get(logChannelSetting.channelId);
    if (!channel) return;

    const title = await tGuild(message.guild.id, 'log.title_message_delete');
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setAuthor({ name: message.author?.tag || 'Unknown', iconURL: message.author?.displayAvatarURL() })
      .setTitle(title)
      .addFields(
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: false },
        { name: 'Message ID', value: message.id, inline: false },
        { name: 'Content', value: message.content || '*No content*', inline: false }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  },
};