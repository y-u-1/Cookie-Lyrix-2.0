// src/commands/games/minesweeperService.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../lib/i18n');

const DIFFICULTIES = {
  easy: { rows: 4, cols: 4, mines: 3, label: 'Easy (4x4, 3 mines)' },
  medium: { rows: 5, cols: 5, mines: 5, label: 'Medium (5x5, 5 mines)' },
  hard: { rows: 5, cols: 5, mines: 8, label: 'Hard (5x5, 8 mines)' },
};

// messageId -> { state, ownerId }。Bot再起動で消える前提の簡易インメモリ管理（カジュアルゲームのため許容）。
const games = new Map();

function neighbors(index, rows, cols) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) result.push(r * cols + c);
    }
  }
  return result;
}

function countAdjacentMines(index, rows, cols, mines) {
  return neighbors(index, rows, cols).filter((n) => mines.has(n)).length;
}

function createGame(rows, cols, mineCount, bet = 0) {
  const total = rows * cols;
  const mines = new Set();
  while (mines.size < mineCount) {
    mines.add(Math.floor(Math.random() * total));
  }
  return { rows, cols, mines, revealed: new Set(), status: 'PLAYING', clickedMine: null, bet };
}

function floodReveal(state, index) {
  if (state.revealed.has(index) || state.mines.has(index)) return;
  state.revealed.add(index);
  if (countAdjacentMines(index, state.rows, state.cols, state.mines) === 0) {
    for (const n of neighbors(index, state.rows, state.cols)) {
      if (!state.revealed.has(n) && !state.mines.has(n)) floodReveal(state, n);
    }
  }
}

function revealCell(state, index) {
  if (state.status !== 'PLAYING' || state.revealed.has(index)) return;

  if (state.mines.has(index)) {
    state.status = 'LOST';
    state.clickedMine = index;
    state.revealed.add(index);
    return;
  }

  floodReveal(state, index);
  const totalSafe = state.rows * state.cols - state.mines.size;
  if (state.revealed.size >= totalSafe) state.status = 'WON';
}

function buildCellButton(state, index) {
  const isMine = state.mines.has(index);
  const isRevealed = state.revealed.has(index);
  const gameOver = state.status !== 'PLAYING';
  const btn = new ButtonBuilder().setCustomId(`mine_${index}`);

  if (gameOver && isMine) {
    const wasClicked = index === state.clickedMine;
    return btn
      .setLabel(wasClicked ? 'X' : 'M')
      .setStyle(wasClicked ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(true);
  }

  if (isRevealed) {
    const count = countAdjacentMines(index, state.rows, state.cols, state.mines);
    btn.setLabel(count > 0 ? String(count) : '\u25A0'); // ■ (開いた安全マス)
    return btn.setStyle(ButtonStyle.Success).setDisabled(true);
  }

  return btn.setLabel('\u25A1').setStyle(ButtonStyle.Secondary).setDisabled(gameOver); // □ (未開封マス)
}

function buildBoardComponents(state) {
  const rows = [];
  for (let r = 0; r < state.rows; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < state.cols; c++) {
      row.addComponents(buildCellButton(state, r * state.cols + c));
    }
    rows.push(row);
  }
  return rows;
}

function buildGameEmbed(state, ownerId, coinChange = 0, lang = 'ja') {
  const remaining = state.rows * state.cols - state.mines.size - state.revealed.size;
  const player = `<@${ownerId}>`;
  let desc;
  let color = 0xb89cff;

  if (state.status === 'WON') {
    desc = t(lang, 'minesweeper.win', { player, reward: coinChange });
    color = 0x57f287;
  } else if (state.status === 'LOST') {
    const lossLine = coinChange ? t(lang, 'minesweeper.lose_line', { amount: Math.abs(coinChange) }) : '';
    desc = t(lang, 'minesweeper.lose', { player, lossLine });
    color = 0xed4245;
  } else {
    const betLine = state.bet > 0 ? t(lang, 'minesweeper.bet_line', { amount: state.bet }) : '';
    desc = t(lang, 'minesweeper.playing', { remaining, player, betLine });
  }

  return new EmbedBuilder().setColor(color).setDescription(desc);
}

function registerGame(messageId, state, ownerId) {
  games.set(messageId, { state, ownerId });
}

function getGame(messageId) {
  return games.get(messageId);
}

function deleteGame(messageId) {
  games.delete(messageId);
}

module.exports = {
  DIFFICULTIES,
  createGame,
  revealCell,
  buildBoardComponents,
  buildGameEmbed,
  registerGame,
  getGame,
  deleteGame,
};
