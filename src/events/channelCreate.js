// src/events/channelCreate.js
const { EmbedBuilder } = require('discord.js');
const { prisma } = require('../lib/database');
const { tGuild } = require('../lib/i18n');

module.exports = {
  name: 'channelCreate',
  async execute(channel) {
    if (!channel.guild) return;

    const logChannelSetting = await prisma.logChannel.findUnique({
      where: { guildId_type: { guildId: channel.guild.id, type: 'channel' } }
    });
    if (!logChannelSetting) return;

    const logChannel = channel.guild.channels.cache.get(logChannelSetting.channelId);
    if (!logChannel) return;

    const title = await tGuild(channel.guild.id, 'log.title_channel_create');
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(title)
      .addFields(
        { name: 'Name', value: `#${channel.name} (${channel.id})`, inline: false },
        { name: 'Type', value: channel.type.toString(), inline: false },
        { name: 'Category', value: channel.parent ? channel.parent.name : 'None', inline: false }
      )
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};