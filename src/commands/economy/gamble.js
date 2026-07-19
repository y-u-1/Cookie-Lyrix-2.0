// src/commands/economy/gamble.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCoins, addCoins, removeCoins } = require('../../lib/levelService');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('コインを使ってギャンブルをします / Gamble your coins')
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('掛け金 / Bet amount').setMinValue(100).setMaxValue(1000000).setRequired(true)
    ),
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const currentCoins = await getCoins(interaction.guild.id, interaction.user.id);

    if (currentCoins < BigInt(amount)) {
      const msg = await tGuild(interaction.guild.id, 'gamble.insufficient_funds');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await removeCoins(interaction.guild.id, interaction.user.id, amount);

    const result = Math.floor(Math.random() * 4);
    let msgKey, resultAmount, color;

    switch (result) {
      case 0:
        msgKey = 'gamble.result_75_loss';
        resultAmount = Math.floor(amount * 0.75);
        await removeCoins(interaction.guild.id, interaction.user.id, resultAmount);
        color = 0xED4245;
        break;
      case 1:
        msgKey = 'gamble.result_25_loss';
        resultAmount = Math.floor(amount * 0.25);
        await addCoins(interaction.guild.id, interaction.user.id, amount - resultAmount);
        color = 0xED4245;
        break;
      case 2:
        msgKey = 'gamble.result_50_gain';
        resultAmount = Math.floor(amount * 0.50);
        await addCoins(interaction.guild.id, interaction.user.id, amount + resultAmount);
        color = 0x57F287;
        break;
      case 3:
        msgKey = 'gamble.result_100_gain';
        resultAmount = amount;
        await addCoins(interaction.guild.id, interaction.user.id, amount * 2);
        color = 0x57F287;
        break;
    }

    const msg = await tGuild(interaction.guild.id, msgKey, { amount: resultAmount });
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(msg)
      .setFooter({ text: `掛け金: ${amount} コイン` });

    await interaction.reply({ embeds: [embed] });
  },
};