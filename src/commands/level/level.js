// src/commands/level/level.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { getRank, getTopUsers, addXp } = require('../../lib/levelService');
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
        .addStringOption((opt) => opt.setName('user').setDescription('対象ユーザー / User').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('5分ごとに更新されるリーダーボードを設置 / Setup a leaderboard panel')
    )
    .addSubcommand((sub) =>
      sub
        .setName('addxp')
        .setDescription('XPを付与 (管理者のみ) / Add XP (Admin only)')
        .addStringOption((opt) => opt.setName('user').setDescription('対象ユーザー または x (全員) / User or x (all)').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('数量 / Amount').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('レベルとXPをリセット (管理者のみ) / Reset level and XP (Admin only)')
        .addStringOption((opt) => opt.setName('user').setDescription('対象ユーザー または x (全員) / User or x (all)').setRequired(true))
    ),
  category: 'レベリング / Leveling',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'rank') {
      const userInput = interaction.options.getString('user');
      if (userInput?.toLowerCase() === 'x') {
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription('### エラー\n全員のランクカードを一括で表示することはできません。');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const user = await interaction.client.users.fetch(userInput).catch(() => null) ?? interaction.user;
      await interaction.deferReply();

      const rankData = await getRank(interaction.guild.id, user.id);
      if (!rankData) {
        const msg = await tGuild(interaction.guild.id, 'level.no_xp');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.editReply({ embeds: [embed] });
      }

      const imageBuffer = await renderRankCard(user, rankData);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'rank-card.png' });

      await interaction.editReply({ files: [attachment] });

    } else if (sub === 'panel') {
      const title = await tGuild(interaction.guild.id, 'level.panel_title');
      const desc = await tGuild(interaction.guild.id, 'level.panel_desc');
      const topUsersName = await tGuild(interaction.guild.id, 'level.top_users');
      const noData = await tGuild(interaction.guild.id, 'level.no_data');
      
      const topUsers = await getTopUsers(interaction.guild.id, 20);
      const lines = topUsers.map((u, i) => `**${i + 1}.** <@${u.userId}> - **LV. ${u.level}** (${Number(u.xp)} XP)`);

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

    } else if (sub === 'addxp') {
      const userInput = interaction.options.getString('user');
      const amount = interaction.options.getInteger('amount');
      const isAll = userInput?.toLowerCase() === 'x';

      if (isAll) {
        await prisma.userActivity.updateMany({
          where: { guildId: interaction.guild.id },
          data: { xp: { increment: BigInt(amount) } }
        });
        const msg = `### XP付与完了\n全員に ${amount} XP を付与しました。`;
        const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
        await interaction.reply({ embeds: [embed] });
      } else {
        const user = await interaction.client.users.fetch(userInput).catch(() => null);
        if (!user) {
          const embed = new EmbedBuilder().setColor(0xED4245).setDescription('### エラー\n有効なユーザーを指定してください。');
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await addXp(interaction.guild.id, user.id, amount);
        const msg = `### XP付与完了\n${user.toString()} に ${amount} XP を付与しました。`;
        const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
        await interaction.reply({ embeds: [embed] });
      }

    } else if (sub === 'reset') {
      const userInput = interaction.options.getString('user');
      const isAll = userInput?.toLowerCase() === 'x';

      if (isAll) {
        await prisma.userActivity.updateMany({
          where: { guildId: interaction.guild.id },
          data: { xp: 0n, level: 0 }
        });
        const msg = `### リセット完了\n全員のレベルとXPをリセットしました。`;
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        await interaction.reply({ embeds: [embed] });
      } else {
        const user = await interaction.client.users.fetch(userInput).catch(() => null);
        if (!user) {
          const embed = new EmbedBuilder().setColor(0xED4245).setDescription('### エラー\n有効なユーザーを指定してください。');
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await prisma.userActivity.updateMany({
          where: { guildId: interaction.guild.id, userId: user.id },
          data: { xp: 0n, level: 0 }
        });
        
        const msg = `### リセット完了\n${user.toString()} のレベルとXPをリセットしました。`;
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        await interaction.reply({ embeds: [embed] });
      }
    }
  },
};