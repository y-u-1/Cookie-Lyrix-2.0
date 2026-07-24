// src/events/messageCreate.js
const { EmbedBuilder } = require('discord.js');
const { prisma } = require('../lib/database');
const { addXp, addCoins } = require('../lib/levelService');
const { tGuild, t } = require('../lib/i18n');
const logger = require('../lib/logger');

const spamMap = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: message.guild.id },
      include: { logChannels: true }
    });

    const ngWords = await prisma.ngWord.findMany({ where: { guildId: message.guild.id } });
    const logSettings = settings?.logChannels || [];
    const getLogChannelId = (type) => logSettings.find(l => l.type === type)?.channelId;
    const lang = settings?.language || 'ja';

    // --- メッセージログ ---
    const msgLogId = getLogChannelId('message');
    if (msgLogId) {
      const channel = message.guild.channels.cache.get(msgLogId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
          .setTitle(t(lang, 'log.title_message_send'))
          .addFields(
            { name: 'Channel', value: `<#${message.channel.id}>`, inline: false },
            { name: 'Message ID', value: message.id, inline: false },
            { name: 'Content', value: message.content || '*No content*', inline: false }
          )
          .setTimestamp();
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    // --- スパム検知 ---
    const now = Date.now();
    const userKey = `${message.guild.id}-${message.author.id}`;
    if (!spamMap.has(userKey)) spamMap.set(userKey, []);
    const timestamps = spamMap.get(userKey);
    timestamps.push(now);

    const threshold = settings?.floodThreshold || 5;
    const windowMs = (settings?.floodWindowSec || 5) * 1000;

    while (timestamps.length > 0 && now - timestamps[0] > windowMs) timestamps.shift();

    if (timestamps.length >= threshold) {
      spamMap.set(userKey, []);
      if (message.deletable) {
        const messages = await message.channel.messages.fetch({ limit: 10 });
        const userMessages = messages.filter(m => m.author.id === message.author.id && (now - m.createdTimestamp) <= windowMs);
        await message.channel.bulkDelete(userMessages, true).catch(() => {});
      }

      const warnMsg = await t(lang, 'spam.warning');
      const warnEmbed = new EmbedBuilder().setColor(0xED4245).setDescription(warnMsg);
      const sentMsg = await message.channel.send({ content: `<@${message.author.id}>`, embeds: [warnEmbed] });
      setTimeout(() => sentMsg.delete().catch(() => {}), 5000);

      const spamLogId = getLogChannelId('spam');
      if (spamLogId) {
        const channel = message.guild.channels.cache.get(spamLogId);
        if (channel) {
          const logDesc = await t(lang, 'spam.deleted_log');
          const logEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setDescription(logDesc)
            .addFields({ name: 'Channel', value: `<#${message.channel.id}>` })
            .setTimestamp();
          await channel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }
      return;
    }

    // --- NGワード検知 ---
    if (ngWords.length > 0) {
      const content = message.content.toLowerCase();
      const isNg = ngWords.some(w => content.includes(w.word.toLowerCase()));
      if (isNg && message.deletable) {
        await message.delete().catch(() => {});
        const modLogId = getLogChannelId('moderation');
        if (modLogId) {
          const channel = message.guild.channels.cache.get(modLogId);
          if (channel) {
            const logDesc = await t(lang, 'ngword.deleted_log');
            const logEmbed = new EmbedBuilder()
              .setColor(0xED4245)
              .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
              .setDescription(logDesc)
              .addFields(
                { name: 'Channel', value: `<#${message.channel.id}>` },
                { name: 'Content', value: message.content.length > 1024 ? message.content.substring(0, 1021) + '...' : message.content }
              )
              .setTimestamp();
            await channel.send({ embeds: [logEmbed] }).catch(() => {});
          }
        }
        return;
      }
    }

    // --- XP & Coin 付与 ---
    const xpAmount = Math.floor(Math.random() * 15) + 10;
    const coinAmount = Math.floor(Math.random() * 5) + 1;
    
    const result = await addXp(message.guild.id, message.author.id, xpAmount);
    await addCoins(message.guild.id, message.author.id, coinAmount);

    if (result.leveledUp) {
      const levelUpBonus = result.newLevel * 100;
      await addCoins(message.guild.id, message.author.id, levelUpBonus);
      
      const title = await t(lang, 'level.levelup_title');
      const desc = await t(lang, 'level.levelup_desc', { level: result.newLevel });
      const bonusLine = await t(lang, 'level.levelup_bonus', { coins: levelUpBonus });
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(title)
        .setDescription(`${desc}\n${bonusLine}`)
        .setThumbnail(message.author.displayAvatarURL());
      
      message.channel.send({ embeds: [embed] }).catch(() => {});
    }
  },
};