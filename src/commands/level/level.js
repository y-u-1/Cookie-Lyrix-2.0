// src/commands/level/level.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { getRank, getTopUsers } = require('../../lib/levelService');
const { renderRankCard } = require('../../lib/canvasRenderer');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('レベリング機能 / Leveling system')
    .addSubcommand((sub) =>
      sub
        .setName('rank')
        .setDescription('あなたのランクカードを表示 / Show your rank card')
        .addUserOption((opt) => opt.setName('user').setDescription('対象ユーザー / User').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('5分ごとに更新されるリーダーボードを設置 / Setup a leaderboard panel')
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'rank') {
      const user = interaction.options.getUser('user') ?? interaction.user;
      await interaction.deferReply();

      const rankData = await getRank(interaction.guild.id, user.id);
      if (!rankData) {
        const msg = await tGuild(interaction.guild.id, 'level.no_xp');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.editReply({ embeds: [embed] });
      }

      const imageBuffer = await renderRankCard(user, rankData);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'rank-card.png' });

      // テキストは一切なしで画像のみを送信
      await interaction.editReply({ files: [attachment] });

    } else if (sub === 'panel') {
      const title = await tGuild(interaction.guild.id, 'level.panel_title');
      const desc = await tGuild(interaction.guild.id, 'level.panel_desc');
      const topUsersName = await tGuild(interaction.guild.id, 'level.top_users');
      const noData = await tGuild(interaction.guild.id, 'level.no_data');
      
      const topUsers = await getTopUsers(interaction.guild.id, 30);
      const lines = topUsers.map((u, i) => {
        return `**${i + 1}.** <@${u.userId}> - **LV. ${u.level}** (${u.xp} XP)`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setDescription(desc)
        .addFields({ name: topUsersName, value: lines.length ? lines.join('\n') : noData })
        .setFooter({ text: await tGuild(interaction.guild.id, 'level.last_updated') })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('level_page_1').setLabel('‹').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('level_page_2').setLabel('›').setStyle(ButtonStyle.Secondary)
      );

      const panelMessage = await interaction.channel.send({ embeds: [embed], components: [row] });

      await prisma.leaderboardPanel.upsert({
        where: { guildId_type: { guildId: interaction.guild.id, type: 'XP' } },
        update: { channelId: interaction.channel.id, messageId: panelMessage.id },
        create: { guildId: interaction.guild.id, type: 'XP', channelId: interaction.channel.id, messageId: panelMessage.id },
      });

      const successMsg = await tGuild(interaction.guild.id, 'level.panel_created');
      const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(successMsg);
      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }
  },
};