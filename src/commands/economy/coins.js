// src/commands/economy/coins.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { getCoins, addCoins, removeCoins } = require('../../lib/levelService');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coins')
    .setDescription('コインを確認・管理します / Check or manage coins')
    .addSubcommand((sub) =>
      sub
        .setName('check')
        .setDescription('所持コインを確認 / Check coins')
        .addStringOption((opt) => opt.setName('user').setDescription('対象ユーザー または x (全員) / User or x (all)').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('コインを付与 (管理者のみ) / Add coins (Admin only)')
        .addStringOption((opt) => opt.setName('user').setDescription('対象ユーザー または x (全員) / User or x (all)').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('数量 / Amount').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('コインを剥奪 (管理者のみ) / Remove coins (Admin only)')
        .addStringOption((opt) => opt.setName('user').setDescription('対象ユーザー または x (全員) / User or x (all)').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('数量 / Amount').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('clear')
        .setDescription('コインを全削除 (管理者のみ) / Clear coins (Admin only)')
        .addStringOption((opt) => opt.setName('user').setDescription('対象ユーザー または x (全員) / User or x (all)').setRequired(true))
    ),
  category: 'エコノミー / Economy',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userInput = interaction.options.getString('user');
    const isAll = userInput?.toLowerCase() === 'x';

    if (sub === 'check') {
      if (isAll) {
        const msg = '### エラー\n全員のコインを一括で確認することはできません。';
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const user = await interaction.client.users.fetch(userInput).catch(() => null);
      if (!user) {
        const msg = '### エラー\n有効なユーザーを指定してください。';
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const coins = await getCoins(interaction.guild.id, user.id);
      let msg;
      if (user.id === interaction.user.id) {
        msg = await tGuild(interaction.guild.id, 'economy.coins_self', { coins: Number(coins) });
      } else {
        msg = await tGuild(interaction.guild.id, 'economy.coins_other', { user: user.toString(), coins: Number(coins) });
      }
      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'add' || sub === 'remove') {
      const amount = interaction.options.getInteger('amount');

      if (isAll) {
        // 全員対象
        const targetAmount = sub === 'remove' ? -amount : amount;
        await prisma.userActivity.updateMany({
          where: { guildId: interaction.guild.id },
          data: { coins: { increment: BigInt(targetAmount) } }
        });

        const msgKey = sub === 'add' ? 'economy.coins_added_all' : 'economy.coins_removed_all';
        const msg = await tGuild(interaction.guild.id, msgKey, { amount });
        const embed = new EmbedBuilder().setColor(sub === 'add' ? 0x57F287 : 0xED4245).setDescription(msg);
        await interaction.reply({ embeds: [embed] });
      } else {
        // 個人対象
        const user = await interaction.client.users.fetch(userInput).catch(() => null);
        if (!user) {
          const msg = '### エラー\n有効なユーザーを指定してください。';
          const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'add') {
          await addCoins(interaction.guild.id, user.id, amount);
          const msg = await tGuild(interaction.guild.id, 'economy.coins_added', { user: user.toString(), amount });
          const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
          await interaction.reply({ embeds: [embed] });
        } else {
          await removeCoins(interaction.guild.id, user.id, amount);
          const msg = await tGuild(interaction.guild.id, 'economy.coins_removed', { user: user.toString(), amount });
          const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
          await interaction.reply({ embeds: [embed] });
        }
      }

    } else if (sub === 'clear') {
      if (isAll) {
        // 全員のコインを0にする
        await prisma.userActivity.updateMany({
          where: { guildId: interaction.guild.id },
          data: { coins: 0n }
        });
        const msg = await tGuild(interaction.guild.id, 'economy.coins_cleared_all');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        await interaction.reply({ embeds: [embed] });
      } else {
        // 個人のコインを0にする
        const user = await interaction.client.users.fetch(userInput).catch(() => null);
        if (!user) {
          const msg = '### エラー\n有効なユーザーを指定してください。';
          const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await prisma.userActivity.updateMany({
          where: { guildId: interaction.guild.id, userId: user.id },
          data: { coins: 0n }
        });
        
        const msg = await tGuild(interaction.guild.id, 'economy.coins_cleared', { user: user.toString() });
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        await interaction.reply({ embeds: [embed] });
      }
    }
  },
};