// src/commands/economy/gamble.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('コインを使ってギャンブルをします / Gamble your coins')
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('掛け金 / Bet amount').setMinValue(100).setMaxValue(1000000).setRequired(true)
    ),
  category: 'エコノミー / Economy',
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const amount = interaction.options.getInteger('amount');

    const result = Math.floor(Math.random() * 4);
    let msgKey, resultAmount, color, delta;

    switch (result) {
      case 0: // -75%
        msgKey = 'gamble.result_75_loss';
        resultAmount = Math.floor(amount * 0.75);
        delta = -resultAmount;
        color = 0xED4245;
        break;
      case 1: // -25%
        msgKey = 'gamble.result_25_loss';
        resultAmount = Math.floor(amount * 0.25);
        delta = -resultAmount;
        color = 0xED4245;
        break;
      case 2: // +50%
        msgKey = 'gamble.result_50_gain';
        resultAmount = Math.floor(amount * 0.50);
        delta = resultAmount;
        color = 0x57F287;
        break;
      case 3: // +100%
        msgKey = 'gamble.result_100_gain';
        resultAmount = amount;
        delta = resultAmount;
        color = 0x57F287;
        break;
    }

    // レコードが無い(＝初回)ユーザーだと updateMany が0件ヒットで
    // 「残高不足」と誤判定されてしまうため、先にレコードの存在を保証する。
    await prisma.userActivity.upsert({
      where: { guildId_userId: { guildId, userId } },
      update: {},
      create: { guildId, userId, coins: 3000n },
    });

    // 残高チェックと増減を1つのクエリで原子的に行う(BigInt対応)。
    // 「確認→引き落とし」を別々に行うと、同時に複数回実行された場合に
    // 所持金以上を賭けられてしまう競合状態が発生する。
    const update = await prisma.userActivity.updateMany({
      where: { guildId, userId, coins: { gte: BigInt(amount) } },
      data: { coins: { increment: BigInt(delta) } },
    });

    if (update.count === 0) {
      const msg = await tGuild(guildId, 'gamble.insufficient_funds');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const msg = await tGuild(guildId, msgKey, { amount: resultAmount });
    const footerText = await tGuild(guildId, 'gamble.bet_footer', { amount });
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(msg)
      .setFooter({ text: footerText });

    await interaction.reply({ embeds: [embed] });
  },
};