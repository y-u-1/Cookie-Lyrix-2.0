// src/commands/games/minesweeperInteractions.js
const { EmbedBuilder } = require('discord.js');
const { getGame, revealCell, buildBoardComponents, buildGameEmbed, deleteGame } = require('./minesweeperService');
const { addCoins, removeCoins } = require('../../lib/levelService');
const { tGuild, getGuildLanguage } = require('../../lib/i18n');

async function handleCellClick(interaction) {
  const game = getGame(interaction.message.id);
  if (!game) {
    const msg = await tGuild(interaction.guildId, 'minesweeper.expired');
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xb89cff).setDescription(msg)],
      ephemeral: true,
    });
  }
  if (interaction.user.id !== game.ownerId) {
    const msg = await tGuild(interaction.guildId, 'minesweeper.not_your_game');
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xb89cff).setDescription(msg)],
      ephemeral: true,
    });
  }

  const index = parseInt(interaction.customId.split('_')[1], 10);
  revealCell(game.state, index);

  let coinChange = 0;
  if (game.state.status === 'WON') {
    coinChange = game.state.mines.size * 20;
    if (game.state.bet > 0) coinChange += Math.round(game.state.bet * 0.5);
    // 勝利時はプラスなのでaddCoinsで加算
    await addCoins(interaction.guildId, game.ownerId, coinChange).catch(() => {});
  } else if (game.state.status === 'LOST' && game.state.bet > 0) {
    coinChange = -Math.ceil(game.state.bet * 0.1);
    // 敗北時の減点はremoveCoinsを使い、残高が足りない場合でもマイナスにならないようにする
    await removeCoins(interaction.guildId, game.ownerId, Math.abs(coinChange)).catch(() => {});
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
