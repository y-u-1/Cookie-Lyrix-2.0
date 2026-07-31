// src/commands/level/level.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const { prisma } = require('../../lib/database');
const { getRank, getTopUsers, addXp } = require('../../lib/levelService');
const { applyLevelRoles } = require('../../lib/levelRoleService');
const { renderRankCard } = require('../../lib/canvasRenderer');
const { tGuild } = require('../../lib/i18n');
const { joinLinesSafely } = require('../../lib/embedUtils');

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
        const msg = await tGuild(interaction.guild.id, 'level.rank_bulk_error');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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

      const PAGE_SIZE = 20;
      const topUsers = await getTopUsers(interaction.guild.id, PAGE_SIZE);
      const lines = topUsers.map((u, i) => `**${i + 1}.** <@${u.userId}> - **LV. ${u.level}** (${Number(u.xp)} XP)`);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setDescription(desc)
        .addFields({ name: topUsersName, value: joinLinesSafely(lines) ?? noData })
        .setFooter({ text: await tGuild(interaction.guild.id, 'level.last_updated') })
        .setTimestamp();

      // データがPAGE_SIZE未満(=次のページが存在しない)場合は「›」ボタンを無効化する。
      // 以前はここが常に有効のままで、20人未満のサーバーで「次へ」を押すと
      // 空っぽのページが表示されてしまうバグがあった(ページ送り後の判定は
      // levelInteractions.jsで正しく行われていたため、初期表示だけが不整合だった)。
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('level_page_1').setLabel('‹').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('level_page_2').setLabel('›').setStyle(ButtonStyle.Secondary).setDisabled(topUsers.length < PAGE_SIZE)
      );

      // 既に別のチャンネルにパネルが存在する場合、DB上は新しい方に上書きされるだけで
      // 古いメッセージは残り続け、二度と更新されない「幽霊パネル」になってしまっていた。
      // 可能であれば古いメッセージを削除してから、新しいパネルを作成する。
      const existingPanel = await prisma.leaderboardPanel.findUnique({
        where: { guildId_type: { guildId: interaction.guild.id, type: 'XP' } },
      });
      if (existingPanel) {
        const oldChannel = await interaction.guild.channels.fetch(existingPanel.channelId).catch(() => null);
        if (oldChannel) {
          const oldMessage = await oldChannel.messages.fetch(existingPanel.messageId).catch(() => null);
          if (oldMessage) await oldMessage.delete().catch(() => {});
        }
      }

      const panelMessage = await interaction.channel.send({ embeds: [embed], components: [row] });

      await prisma.leaderboardPanel.upsert({
        where: { guildId_type: { guildId: interaction.guild.id, type: 'XP' } },
        update: { channelId: interaction.channel.id, messageId: panelMessage.id },
        create: { guildId: interaction.guild.id, type: 'XP', channelId: interaction.channel.id, messageId: panelMessage.id },
      });

      const successMsg = await tGuild(interaction.guild.id, 'level.panel_created');
      const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(successMsg);
      await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });

    } else if (sub === 'addxp') {
      const userInput = interaction.options.getString('user');
      const amount = interaction.options.getInteger('amount');
      const isAll = userInput?.toLowerCase() === 'x';

      if (isAll) {
        await prisma.userActivity.updateMany({
          where: { guildId: interaction.guild.id },
          data: { xp: { increment: BigInt(amount) } }
        });
        const msg = await tGuild(interaction.guild.id, 'level.addxp_success_all', { amount });
        const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
        await interaction.reply({ embeds: [embed] });
      } else {
        const user = await interaction.client.users.fetch(userInput).catch(() => null);
        if (!user) {
          const msg = await tGuild(interaction.guild.id, 'error.invalid_user');
          const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
          return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const result = await addXp(interaction.guild.id, user.id, amount);
        let description = await tGuild(interaction.guild.id, 'level.addxp_success_user', { user: user.toString(), amount });

        if (result.leveledUp) {
          const member = await interaction.guild.members.fetch(user.id).catch(() => null);
          const grantedRoleIds = member ? await applyLevelRoles(member, result.newLevel).catch(() => []) : [];
          if (grantedRoleIds.length > 0) {
            const roleLine = await tGuild(interaction.guild.id, 'level.levelup_role', { roles: grantedRoleIds.map((id) => `<@&${id}>`).join(', ') });
            description += `\n${roleLine}`;
          }
        }

        const embed = new EmbedBuilder().setColor(0x57F287).setDescription(description);
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
        const msg = await tGuild(interaction.guild.id, 'level.reset_success_all');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        await interaction.reply({ embeds: [embed] });
      } else {
        const user = await interaction.client.users.fetch(userInput).catch(() => null);
        if (!user) {
          const msg = await tGuild(interaction.guild.id, 'error.invalid_user');
          const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
          return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        await prisma.userActivity.updateMany({
          where: { guildId: interaction.guild.id, userId: user.id },
          data: { xp: 0n, level: 0 }
        });
        
        const msg = await tGuild(interaction.guild.id, 'level.reset_success_user', { user: user.toString() });
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        await interaction.reply({ embeds: [embed] });
      }
    }
  },
};