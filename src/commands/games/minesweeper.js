// src/commands/games/minesweeper.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { DIFFICULTIES, createGame, buildBoardComponents, buildGameEmbed, registerGame } = require('./minesweeperService');
const { prisma } = require('../../lib/database');
const { tGuild, getGuildLanguage } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('minesweeper')
    .setDescription('マインスイーパーで遊びます / Play a game of Minesweeper')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('新しいゲームを開始します / Start a new Minesweeper game')
        .addStringOption((opt) =>
          opt
            .setName('difficulty')
            .setDescription('難易度 / Difficulty')
            .addChoices(
              { name: DIFFICULTIES.easy.label, value: 'easy' },
              { name: DIFFICULTIES.medium.label, value: 'medium' },
              { name: DIFFICULTIES.hard.label, value: 'hard' },
            )
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName('bet').setDescription('掛け金(勝利:+50%、敗北:-10%) / Coins to bet (win: +50%, lose: -10%)').setMinValue(1).setRequired(false),
        ),
    ),
  category: 'ゲーム / Games',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'start') return handleStart(interaction);
  },
};

async function handleStart(interaction) {
  const difficulty = interaction.options.getString('difficulty');
  const bet = interaction.options.getInteger('bet') ?? 0;

  if (bet > 0) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    // レコードが無い(＝初回)ユーザーでも判定できるよう先に存在を保証する。
    await prisma.userActivity.upsert({
      where: { guildId_userId: { guildId, userId } },
      update: {},
      create: { guildId, userId, coins: 3000n },
    });

    // 以前は残高チェックのみで、実際には掛け金を一切引き落としていなかった
    // (勝てば無リスクでボーナスがもらえてしまう不具合)。
    // ここで実際に賭け金をエスクロー(引き落とし)し、決着時に払い戻す方式に変更。
    const escrow = await prisma.userActivity.updateMany({
      where: { guildId, userId, coins: { gte: BigInt(bet) } },
      data: { coins: { decrement: BigInt(bet) } },
    });

    if (escrow.count === 0) {
      const msg = await tGuild(guildId, 'gamble.insufficient_funds');
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xb89cff).setDescription(msg)],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  const preset = DIFFICULTIES[difficulty];
  const state = createGame(preset.rows, preset.cols, preset.mines, bet);

  const lang = await getGuildLanguage(interaction.guildId);
  const embed = buildGameEmbed(state, interaction.user.id, 0, lang);
  const rows = buildBoardComponents(state);

  const message = await interaction.reply({ embeds: [embed], components: rows }).then(() => interaction.fetchReply());
  registerGame(message.id, state, interaction.user.id);
}
