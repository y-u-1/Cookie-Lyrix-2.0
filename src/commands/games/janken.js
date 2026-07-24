// src/commands/games/janken.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
    ),
  category: 'ゲーム / Games',
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const playerChoice = interaction.options.getString('choice');
    const botChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];

    const playerLabel = await tGuild(guildId, `games.janken_${playerChoice}`);
    const botLabel = await tGuild(guildId, `games.janken_${botChoice}`);

    let resultKey, color;
    if (playerChoice === botChoice) {
      resultKey = 'games.janken_draw';
      color = 0xFEE75C;
    } else if (BEATS[playerChoice] === botChoice) {
      resultKey = 'games.janken_win';
      color = 0x57F287;
    } else {
      resultKey = 'games.janken_lose';
      color = 0xED4245;
    }

    const msg = await tGuild(guildId, resultKey, { player: playerLabel, bot: botLabel });
    const embed = new EmbedBuilder().setColor(color).setDescription(msg);

    await interaction.reply({ embeds: [embed] });
  },
};
