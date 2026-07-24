// src/commands/economy/coins.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('../../lib/database');
const { getCoins, addCoins, removeCoins, getTopUsersByCoins } = require('../../lib/levelService');
const { tGuild } = require('../../lib/i18n');
const { joinLinesSafely } = require('../../lib/embedUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coins')
    .setDescription('コインを確認・管理します / Check or manage coins')
    .addSubcommand((sub) =>
      sub
        .setName('check')
        .setDescription('所持コインを確認 / Check coins')
        .addUserOption((opt) => opt.setName('user').setDescription('対象ユーザー / User').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('コインを付与 (管理者のみ) / Add coins (Admin only)')
        .addUserOption((opt) => opt.setName('user').setDescription('対象ユーザー / User').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('数量 / Amount').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('コインを剥奪 (管理者のみ) / Remove coins (Admin only)')
        .addUserOption((opt) => opt.setName('user').setDescription('対象ユーザー / User').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('数量 / Amount').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('leaderboard')
        .setDescription('コインランキングを表示 / Show coin leaderboard')
    )
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('5分ごとに更新されるコインランキングを設置 / Setup a coin leaderboard panel')
    ),
  category: 'エコノミー / Economy',
  async execute(interaction) {
    // panelサブコマンドがchannel.send + DB書き込みの後に応答していたため、
    // 先頭で一律deferしてから各処理を行う。
    await interaction.deferReply({ ephemeral: false });

    const sub = interaction.options.getSubcommand();

    if (sub === 'check') {
      const user = interaction.options.getUser('user') ?? interaction.user;
      const coins = await getCoins(interaction.guild.id, user.id);
      
      let msg;
      if (user.id === interaction.user.id) {
        msg = await tGuild(interaction.guild.id, 'economy.coins_self', { coins: coins });
      } else {
        msg = await tGuild(interaction.guild.id, 'economy.coins_other', { user: user.toString(), coins: coins });
      }
      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
      await interaction.editReply({ embeds: [embed] });

    } else if (sub === 'add') {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      await addCoins(interaction.guild.id, user.id, amount);
      
      const msg = await tGuild(interaction.guild.id, 'economy.coins_added', { user: user.toString(), amount: amount });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.editReply({ embeds: [embed] });

    } else if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      await removeCoins(interaction.guild.id, user.id, amount);
      
      const msg = await tGuild(interaction.guild.id, 'economy.coins_removed', { user: user.toString(), amount: amount });
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      await interaction.editReply({ embeds: [embed] });

    } else if (sub === 'leaderboard') {
      const topUsers = await getTopUsersByCoins(interaction.guild.id, 30);
      const lines = topUsers.map((u, i) => `**${i + 1}.** <@${u.userId}> - **${u.coins} コイン**`);
      
      const title = await tGuild(interaction.guild.id, 'economy.coin_panel_title');
      const noData = await tGuild(interaction.guild.id, 'level.no_data');
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setDescription(lines.length ? lines.join('\n') : noData)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } else if (sub === 'panel') {
      const title = await tGuild(interaction.guild.id, 'economy.coin_panel_title');
      const desc = await tGuild(interaction.guild.id, 'economy.coin_panel_desc');
      const topUsersName = await tGuild(interaction.guild.id, 'level.top_users');
      const noData = await tGuild(interaction.guild.id, 'level.no_data');
      
      const topUsers = await getTopUsersByCoins(interaction.guild.id, 10);
      const lines = topUsers.map((u, i) => `**${i + 1}.** <@${u.userId}> - **${u.coins} コイン**`);

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(title)
        .setDescription(desc)
        .addFields({ name: topUsersName, value: joinLinesSafely(lines) ?? noData })
        .setFooter({ text: await tGuild(interaction.guild.id, 'level.last_updated') })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('coin_page_1').setLabel('‹').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('coin_page_2').setLabel('›').setStyle(ButtonStyle.Secondary)
      );

      const panelMessage = await interaction.channel.send({ embeds: [embed], components: [row] });

      await prisma.leaderboardPanel.upsert({
        where: { guildId_type: { guildId: interaction.guild.id, type: 'COIN' } },
        update: { channelId: interaction.channel.id, messageId: panelMessage.id },
        create: { guildId: interaction.guild.id, type: 'COIN', channelId: interaction.channel.id, messageId: panelMessage.id },
      });

      const successMsg = await tGuild(interaction.guild.id, 'economy.coin_panel_created');
      const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(successMsg);
      await interaction.editReply({ embeds: [successEmbed] });
    }
  },
};