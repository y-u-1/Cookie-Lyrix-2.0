// src/commands/games/janken.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

const CHOICES = ['rock', 'scissors', 'paper'];
// rock beats scissors, scissors beats paper, paper beats rock
const BEATS = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('janken')
    .setDescription('じゃんけんで遊びます / Play rock-paper-scissors')
    .addStringOption((opt) =>
      opt
        .setName('choice')
        .setDescription('選択 / Your choice')
        .setRequired(true)
        .addChoices(
          { name: 'グー / Rock', value: 'rock' },
          { name: 'チョキ / Scissors', value: 'scissors' },
          { name: 'パー / Paper', value: 'paper' }
        )
    )
    .addIntegerOption((opt) =>
      opt.setName('bet').setDescription('掛け金(勝ち:+同額、負け:-同額、あいこ:変化なし) / Bet (win: +amount, lose: -amount, draw: no change)').setMinValue(100).setMaxValue(1000000).setRequired(false)
    ),
  category: 'ゲーム / Games',
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const playerChoice = interaction.options.getString('choice');
    const bet = interaction.options.getInteger('bet') ?? 0;
    const botChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];

    const playerLabel = await tGuild(guildId, `games.janken_${playerChoice}`);
    const botLabel = await tGuild(guildId, `games.janken_${botChoice}`);

    let resultKey, color, delta;
    if (playerChoice === botChoice) {
      resultKey = 'games.janken_draw';
      color = 0xFEE75C;
      delta = 0;
    } else if (BEATS[playerChoice] === botChoice) {
      resultKey = 'games.janken_win';
      color = 0x57F287;
      delta = bet;
    } else {
      resultKey = 'games.janken_lose';
      color = 0xED4245;
      delta = -bet;
    }

    if (bet > 0 && delta !== 0) {
      // レコードが無い(＝初回)ユーザーだと updateMany が0件ヒットで
      // 「残高不足」と誤判定されてしまうため、先にレコードの存在を保証する。
      await prisma.userActivity.upsert({
        where: { guildId_userId: { guildId, userId } },
        update: {},
        create: { guildId, userId, coins: 3000n },
      });

      // 残高チェックと増減を1つの原子的クエリで行う(同時実行での過剰な賭けを防止)。
      const update = await prisma.userActivity.updateMany({
        where: { guildId, userId, coins: { gte: BigInt(bet) } },
        data: { coins: { increment: BigInt(delta) } },
      });

      if (update.count === 0) {
        const msg = await tGuild(guildId, 'gamble.insufficient_funds');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    const msg = await tGuild(guildId, resultKey, { player: playerLabel, bot: botLabel });
    const embed = new EmbedBuilder().setColor(color).setDescription(msg);

    if (bet > 0) {
      const footerText = await tGuild(guildId, 'gamble.bet_footer', { amount: bet });
      embed.setFooter({ text: footerText });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
