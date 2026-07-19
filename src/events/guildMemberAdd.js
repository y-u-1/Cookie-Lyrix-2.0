// src/events/guildMemberAdd.js
const { EmbedBuilder } = require('discord.js');
const { prisma } = require('../lib/database');
const { tGuild } = require('../lib/i18n');
const logger = require('../lib/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: member.guild.id }
    });

    if (!settings) return;

    // --- メンバーログ (参加) ---
    const logChannelSetting = await prisma.logChannel.findUnique({
      where: { guildId_type: { guildId: member.guild.id, type: 'member' } }
    });
    if (logChannelSetting) {
      const channel = member.guild.channels.cache.get(logChannelSetting.channelId);
      if (channel) {
        const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
        const title = await tGuild(member.guild.id, 'log.title_member_join');
        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setTitle(title)
          .addFields(
            { name: 'User', value: `${member.user.tag} (<@${member.user.id}>)`, inline: false },
            { name: 'User ID', value: member.user.id, inline: false },
            { name: 'Account Age', value: `${accountAge} days`, inline: false }
          )
          .setTimestamp();
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    // --- 荒らし対策 ---
    if (settings.antiraidEnabled) {
      const now = new Date();
      const windowMs = settings.antiraidJoinWindowSec * 1000;
      
      await prisma.antiRaidTracker.deleteMany({
        where: { joinedAt: { lt: new Date(now.getTime() - windowMs) } }
      });

      await prisma.antiRaidTracker.create({
        data: { guildId: member.guild.id }
      });

      const count = await prisma.antiRaidTracker.count({
        where: { guildId: member.guild.id }
      });

      if (count >= settings.antiraidJoinThreshold) {
        if (settings.antiraidAction === 'kick') {
          await member.kick('Antiraid protection triggered.').catch(() => {});
        } else if (settings.antiraidAction === 'timeout') {
          await member.timeout(60 * 60 * 1000, 'Antiraid protection triggered.').catch(() => {});
        }
        
        const modLogSetting = await prisma.logChannel.findUnique({
          where: { guildId_type: { guildId: member.guild.id, type: 'moderation' } }
        });
        if (modLogSetting) {
          const channel = member.guild.channels.cache.get(modLogSetting.channelId);
          if (channel) {
            const msg = await tGuild(member.guild.id, 'antiraid.alert', { action: settings.antiraidAction });
            const embed = new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription(msg)
              .setTimestamp();
            await channel.send({ embeds: [embed] }).catch(() => {});
          }
        }
      }
    }

    // --- 自動ロール付与 ---
    if (settings.autoRoleId) {
      const role = member.guild.roles.cache.get(settings.autoRoleId);
      if (role) {
        await member.roles.add(role).catch(() => {});
      }
    }

    // --- ウェルカムメッセージ ---
    if (settings.welcomeChannelId) {
      const channel = member.guild.channels.cache.get(settings.welcomeChannelId);
      if (channel) {
        const title = await tGuild(member.guild.id, 'welcome.title');
        const desc = await tGuild(member.guild.id, 'welcome.desc', {
          server: member.guild.name,
          user: member.toString(),
          membercount: member.guild.memberCount
        });

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(title)
          .setDescription(desc)
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  },
};