// src/events/channelDelete.js
const { EmbedBuilder } = require('discord.js');
const { prisma } = require('../lib/database');
const { tGuild } = require('../lib/i18n');

module.exports = {
  name: 'channelDelete',
  async execute(channel) {
    if (!channel.guild) return;

    const logChannelSetting = await prisma.logChannel.findUnique({
      where: { guildId_type: { guildId: channel.guild.id, type: 'channel' } }
    });
    if (!logChannelSetting) return;

    const logChannel = channel.guild.channels.cache.get(logChannelSetting.channelId);
    if (!logChannel) return;

    const title = await tGuild(channel.guild.id, 'log.title_channel_delete');
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(title)
      .addFields(
        { name: 'Name', value: `#${channel.name} (${channel.id})`, inline: false },
        { name: 'Type', value: channel.type.toString(), inline: false }
      )
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};