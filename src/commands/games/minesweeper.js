// src/commands/games/minesweeper.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('minesweeper')
    .setDescription('マインスイーパーを遊びます / Play Minesweeper'),
  async execute(interaction) {
    const title = await tGuild(interaction.guild.id, 'games.minesweeper_title');
    
    const grid = [];
    const bombs = 5;
    const size = 5;
    const positions = new Set();
    
    while (positions.size < bombs) {
      positions.add(Math.floor(Math.random() * (size * size)));
    }

    for (let i = 0; i < size * size; i++) {
      if (positions.has(i)) {
        grid.push('||💥||');
      } else {
        let count = 0;
        const row = Math.floor(i / size);
        const col = i % size;
        
        for (let r = -1; r <= 1; r++) {
          for (let c = -1; c <= 1; c++) {
            const nr = row + r;
            const nc = col + c;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              if (positions.has(nr * size + nc)) count++;
            }
          }
        }
        grid.push(`||${count}||`);
      }
    }

    let boardStr = '';
    for (let i = 0; i < size; i++) {
      boardStr += grid.slice(i * size, (i + 1) * size).join('') + '\n';
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(title)
      .setDescription(boardStr);

    await interaction.reply({ embeds: [embed] });
  },
};