// src/commands/general/affinity.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild, t, getGuildLanguage } = require('../../lib/i18n');
const { getTopAffinity } = require('../../lib/levelService');
const { joinLinesSafely } = require('../../lib/embedUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('affinity')
    .setDescription('ユーザーとの親密度を管理します / Manage affinity')
    .addSubcommand((sub) =>
      sub
        .setName('hug')
        .setDescription('ハグする / Hug a user')
        .addUserOption((opt) => opt.setName('user').setDescription('対象ユーザー / User').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('pat')
        .setDescription('なでなでする / Pat a user')
        .addUserOption((opt) => opt.setName('user').setDescription('対象ユーザー / User').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('leaderboard')
        .setDescription('親密度ランキングを表示 / Show affinity leaderboard')
    )
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('5分ごとに更新される親密度ランキングを設置 / Setup an affinity leaderboard panel')
    ),
  category: '一般 / General',
  async execute(interaction) {
    // panelサブコマンドがchannel.send + DB書き込みの後に応答していたため、
    // 先頭で一律deferしてから各処理を行う。
    await interaction.deferReply();

    const sub = interaction.options.getSubcommand();

    if (sub === 'hug' || sub === 'pat') {
      const target = interaction.options.getUser('user');
      
      if (target.id === interaction.user.id) {
        const msg = await tGuild(interaction.guild.id, 'affinity.self');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.editReply({ embeds: [embed]});
      }

      const points = Math.floor(Math.random() * 10) + 1;
      
      const affinity = await prisma.userAffinity.upsert({
        where: { guildId_userId_targetId: { guildId: interaction.guild.id, userId: interaction.user.id, targetId: target.id } },
        update: { points: { increment: points } },
        create: { guildId: interaction.guild.id, userId: interaction.user.id, targetId: target.id, points: points },
      });

      const msgKey = sub === 'hug' ? 'affinity.hug' : 'affinity.pat';
      const msg = await tGuild(interaction.guild.id, msgKey, { 
        user: interaction.user.toString(), 
        target: target.toString(), 
        points: points, 
        total: affinity.points 
      });
      
      const embed = new EmbedBuilder().setColor(0xEB459E).setDescription(msg);
      await interaction.editReply({ embeds: [embed] });

    } else if (sub === 'leaderboard') {
      const affinities = await getTopAffinity(interaction.guild.id, 10);
      const lang = await getGuildLanguage(interaction.guild.id);
      const lines = affinities.map((a, i) => {
        return t(lang, 'affinity.pair_line', { rank: i + 1, user1: a.userId, user2: a.targetId, points: a.points });
      });

      const title = await tGuild(interaction.guild.id, 'affinity.leaderboard_title');
      const noData = await tGuild(interaction.guild.id, 'affinity.no_data');
      const embed = new EmbedBuilder()
        .setColor(0xEB459E)
        .setTitle(title)
        .setDescription(lines.length ? lines.join('\n') : noData);

      await interaction.editReply({ embeds: [embed] });

    } else if (sub === 'panel') {
      const title = await tGuild(interaction.guild.id, 'affinity.panel_title');
      const desc = await tGuild(interaction.guild.id, 'affinity.panel_desc');
      const topUsersName = await tGuild(interaction.guild.id, 'affinity.top_pairs');
      const noData = await tGuild(interaction.guild.id, 'affinity.no_data');
      
      const affinities = await getTopAffinity(interaction.guild.id, 10);
      const lang = await getGuildLanguage(interaction.guild.id);
      const lines = affinities.map((a, i) => t(lang, 'affinity.pair_line', { rank: i + 1, user1: a.userId, user2: a.targetId, points: a.points }));

      const embed = new EmbedBuilder()
        .setColor(0xEB459E)
        .setTitle(title)
        .setDescription(desc)
        .addFields({ name: topUsersName, value: joinLinesSafely(lines) ?? noData })
        .setFooter({ text: await tGuild(interaction.guild.id, 'level.last_updated') })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('affinity_page_1').setLabel('‹').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('affinity_page_2').setLabel('›').setStyle(ButtonStyle.Secondary)
      );

      const panelMessage = await interaction.channel.send({ embeds: [embed], components: [row] });

      await prisma.leaderboardPanel.upsert({
        where: { guildId_type: { guildId: interaction.guild.id, type: 'AFFINITY' } },
        update: { channelId: interaction.channel.id, messageId: panelMessage.id },
        create: { guildId: interaction.guild.id, type: 'AFFINITY', channelId: interaction.channel.id, messageId: panelMessage.id },
      });

      const successMsg = await tGuild(interaction.guild.id, 'affinity.panel_created');
      const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(successMsg);
      await interaction.editReply({ embeds: [successEmbed]});
    }
  },
};