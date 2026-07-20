// src/commands/games/slot.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

// レア度に応じて出現率に重みをつける(💎は最もレア)
const SYMBOLS = [
  { symbol: '🍒', weight: 30 },
  { symbol: '🍋', weight: 25 },
  { symbol: '🍇', weight: 20 },
  { symbol: '🔔', weight: 15 },
  { symbol: '⭐', weight: 8 },
  { symbol: '💎', weight: 2 },
];
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

function spinReel() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const s of SYMBOLS) {
    if (roll < s.weight) return s.symbol;
    roll -= s.weight;
  }
  return SYMBOLS[0].symbol;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slot')
    .setDescription('スロットで遊びます / Play the slot machine')
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('掛け金 / Bet amount').setMinValue(100).setMaxValue(1000000).setRequired(true)
    ),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const amount = interaction.options.getInteger('amount');

    const reels = [spinReel(), spinReel(), spinReel()];
    const symbolsText = `【 ${reels.join(' | ')} 】`;

    let multiplier, resultKey;
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      multiplier = reels[0] === '💎' ? 20 : 5;
      resultKey = reels[0] === '💎' ? 'games.slot_jackpot' : 'games.slot_win';
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      multiplier = 2;
      resultKey = 'games.slot_win';
    } else {
      multiplier = 0;
      resultKey = 'games.slot_lose';
    }

    // delta: 負けなら賭け金がそのまま減り、勝ちなら(倍率-1)倍のプラスになる
    const delta = multiplier === 0 ? -amount : amount * (multiplier - 1);

    // 残高チェックと増減を1つの原子的クエリで行う(同時実行での過剰な賭けを防止)。
    const update = await prisma.userActivity.updateMany({
      where: { guildId, userId, coins: { gte: BigInt(amount) } },
      data: { coins: { increment: BigInt(delta) } },
    });

    if (update.count === 0) {
      const msg = await tGuild(guildId, 'games.slot_insufficient_funds');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const winnings = multiplier === 0 ? amount : amount * multiplier;
    const msg = await tGuild(guildId, resultKey, {
      symbols: symbolsText,
      multiplier,
      amount: winnings,
    });

    const color = multiplier === 0 ? 0xED4245 : multiplier >= 20 ? 0xFEE75C : 0x57F287;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(msg)
      .setFooter({ text: `掛け金: ${amount} コイン` });

    await interaction.reply({ embeds: [embed] });
  },
};
