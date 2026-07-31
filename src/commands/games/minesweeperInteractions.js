// src/commands/games/minesweeperInteractions.js
const { EmbedBuilder, MessageFlags } = require('discord.js');
const { getGame, revealCell, buildBoardComponents, buildGameEmbed, deleteGame } = require('./minesweeperService');
const { addCoins } = require('../../lib/levelService');
const { tGuild, getGuildLanguage } = require('../../lib/i18n');

async function handleCellClick(interaction) {
  const game = getGame(interaction.message.id);
  if (!game) {
    const msg = await tGuild(interaction.guildId, 'minesweeper.expired');
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xb89cff).setDescription(msg)],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (interaction.user.id !== game.ownerId) {
    const msg = await tGuild(interaction.guildId, 'minesweeper.not_your_game');
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xb89cff).setDescription(msg)],
      flags: MessageFlags.Ephemeral,
    });
  }

  const index = parseInt(interaction.customId.split('_')[1], 10);
  revealCell(game.state, index);

  // 注: 開始時(minesweeper.js)で掛け金は既にエスクロー(引き落とし)済みのため、
  // ここでは払い戻し分を計算してaddCoinsする。
  let coinChange = 0;
  if (game.state.status === 'WON') {
    coinChange = game.state.mines.size * 20;
    if (game.state.bet > 0) coinChange += Math.round(game.state.bet * 0.5);
    // 勝利: エスクロー済みの掛け金を全額払い戻し + 報酬を加算
    const payout = game.state.bet + coinChange;
    await addCoins(interaction.guildId, game.ownerId, payout).catch(() => {});
  } else if (game.state.status === 'LOST' && game.state.bet > 0) {
    const penalty = Math.ceil(game.state.bet * 0.1);
    coinChange = -penalty;
    // 敗北: 掛け金の90%を払い戻す(10%のみ没収。差額はエスクロー時に既に引き落とし済み)
    const refund = game.state.bet - penalty;
    if (refund > 0) await addCoins(interaction.guildId, game.ownerId, refund).catch(() => {});
  }

  const lang = await getGuildLanguage(interaction.guildId);
  const embed = buildGameEmbed(game.state, game.ownerId, coinChange, lang);
  const rows = buildBoardComponents(game.state);
  await interaction.update({ embeds: [embed], components: rows });

  if (game.state.status !== 'PLAYING') deleteGame(interaction.message.id);
}

async function route(interaction) {
  if (interaction.customId.startsWith('mine_')) return handleCellClick(interaction);
  return null;
}

module.exports = { route };
