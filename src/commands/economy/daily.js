// src/commands/economy/daily.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('デイリーボーナスを受け取ります / Claim your daily bonus'),
  category: 'エコノミー / Economy',
  async execute(interaction) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // レコードが無い(＝初回)ユーザーでも受け取れるよう、先にupsertで作成しておく。
    // create時はlastDailyAtを設定せず、続く条件付きupdateManyで初回受け取り分を処理する。
    await prisma.userActivity.upsert({
      where: { guildId_userId: { guildId: interaction.guild.id, userId: interaction.user.id } },
      update: {},
      create: { guildId: interaction.guild.id, userId: interaction.user.id, coins: 3000n },
    });

    // 条件付き更新: 前回の受け取りが24時間前より古い場合のみ成功
    const result = await prisma.userActivity.updateMany({
      where: {
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        OR: [
          { lastDailyAt: null },
          { lastDailyAt: { lt: oneDayAgo } }
        ]
      },
      data: {
        coins: { increment: 2500n },
        lastDailyAt: now
      }
    });

    if (result.count === 0) {
      // 更新されなかった＝まだ受け取れない
      const activity = await prisma.userActivity.findUnique({
        where: { guildId_userId: { guildId: interaction.guild.id, userId: interaction.user.id } }
      });
      const nextClaim = new Date(new Date(activity.lastDailyAt).getTime() + 24 * 60 * 60 * 1000);
      const msg = await tGuild(interaction.guild.id, 'economy.daily_cooldown', { timestamp: Math.floor(nextClaim.getTime() / 1000) });
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // 成功
    const activity = await prisma.userActivity.findUnique({
      where: { guildId_userId: { guildId: interaction.guild.id, userId: interaction.user.id } }
    });
    
    const msg = await tGuild(interaction.guild.id, 'economy.daily_success', { coins: activity.coins });
    const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
    await interaction.reply({ embeds: [embed] });
  },
};