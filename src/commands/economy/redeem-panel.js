// src/commands/economy/redeem-panel.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('redeem-panel')
    .setDescription('ギフトコード引き換えパネルを設置します / Setup a redeem panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    await interaction.deferReply();

    const title = await tGuild(interaction.guild.id, 'redeem.panel_title');
    const desc = await tGuild(interaction.guild.id, 'redeem.panel_desc');
    const buttonLabel = await tGuild(interaction.guild.id, 'redeem.button_label');

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(title)
      .setDescription(desc)
      .setFooter({ text: 'Cookie Lyrix 2.0' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('redeem_open_modal')
          .setLabel(buttonLabel)
          .setStyle(ButtonStyle.Success)
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};