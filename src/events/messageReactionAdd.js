// src/events/messageReactionAdd.js
const { EmbedBuilder } = require('discord.js');
const { prisma } = require('../lib/database');
const { tGuild } = require('../lib/i18n');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user) {
    if (reaction.partial) await reaction.fetch().catch(() => {});
    if (reaction.message.partial) await reaction.message.fetch().catch(() => {});
    
    if (!reaction.message.guild) return;

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: reaction.message.guild.id },
    });

    if (!settings || !settings.starboardChannelId) return;

    // ⭐ または 🌟 のみ反応
    if (reaction.emoji.name !== '⭐' && reaction.emoji.name !== '🌟') return;

    const stars = reaction.count;
    if (stars < settings.starboardThreshold) return;

    // 既にスターボードに送信されているか確認
    let starboardMsg = await prisma.starboardMessage.findUnique({
      where: { messageId: reaction.message.id },
    });

    const starboardChannel = reaction.message.guild.channels.cache.get(settings.starboardChannelId);
    if (!starboardChannel) return;

    const title = await tGuild(reaction.message.guild.id, 'starboard.title');
    const footerText = await tGuild(reaction.message.guild.id, 'starboard.footer', { stars: stars, channel: reaction.message.channel.name });

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(title)
      .setAuthor({ name: reaction.message.author.tag, iconURL: reaction.message.author.displayAvatarURL() })
      .setDescription(reaction.message.content || '*No content*')
      .addFields(
        { name: 'Source', value: `[Jump to Message](${reaction.message.url})` }
      )
      .setFooter({ text: footerText })
      .setTimestamp(reaction.message.createdAt);

    if (reaction.message.attachments.size > 0) {
      embed.setImage(reaction.message.attachments.first().url);
    }

    if (starboardMsg) {
      // 既存メッセージを更新
      const msg = await starboardChannel.messages.fetch(starboardMsg.starboardMsgId).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed] });
      }
    } else {
      // 新規メッセージを送信
      const msg = await starboardChannel.send({ embeds: [embed] });
      await prisma.starboardMessage.create({
        data: {
          guildId: reaction.message.guild.id,
          channelId: reaction.message.channel.id,
          messageId: reaction.message.id,
          starboardMsgId: msg.id,
          stars: stars,
        }
      });
    }
  },
};