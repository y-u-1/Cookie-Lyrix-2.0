// src/commands/games/dice.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('サイコロを振ります / Roll a dice')
    .addIntegerOption((opt) =>
      opt.setName('sides').setDescription('面の数(デフォルト6) / Number of sides (default 6)').setMinValue(2).setMaxValue(100).setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt.setName('guess').setDescription('出目を予想(的中で(面の数-1)倍) / Guess the result (correct guess pays (sides-1)x)').setMinValue(1).setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt.setName('bet').setDescription('掛け金(guessと同時に指定) / Bet amount (must be used together with guess)').setMinValue(100).setMaxValue(1000000).setRequired(false)
    ),
  category: 'ゲーム / Games',
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const sides = interaction.options.getInteger('sides') ?? 6;
    const guess = interaction.options.getInteger('guess');
    const bet = interaction.options.getInteger('bet');

    // guessとbetは必ずセットで指定する
    if ((guess !== null && bet === null) || (guess === null && bet !== null)) {
      const msg = await tGuild(guildId, 'games.dice_need_both');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (guess !== null && guess > sides) {
      const msg = await tGuild(guildId, 'games.dice_guess_out_of_range', { sides });
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const result = Math.floor(Math.random() * sides) + 1;
    const isBetting = guess !== null && bet !== null;
    const won = isBetting && guess === result;

    if (isBetting) {
      // 的中なら(面の数-1)倍のプラス、外れなら掛け金を失う
      const delta = won ? bet * (sides - 1) : -bet;

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

    const msg = await tGuild(guildId, 'games.dice_title', {
      user: interaction.user.toString(),
      sides,
      result,
    });

    const embed = new EmbedBuilder().setColor(isBetting ? (won ? 0x57F287 : 0xED4245) : 0x5865F2).setDescription(msg);

    if (isBetting) {
      const resultLine = won
        ? await tGuild(guildId, 'games.dice_win', { amount: bet * (sides - 1) })
        : await tGuild(guildId, 'games.dice_lose', { amount: bet });
      embed.addFields({ name: '\u200b', value: resultLine });
      const footerText = await tGuild(guildId, 'gamble.bet_footer', { amount: bet });
      embed.setFooter({ text: footerText });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
