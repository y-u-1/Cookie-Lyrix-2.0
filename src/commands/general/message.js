// src/commands/general/message.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('message')
    .setDescription('カスタム埋め込みメッセージを送信します / Send a custom embed message')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((opt) => opt.setName('title').setDescription('タイトル / Title').setRequired(true))
    .addStringOption((opt) => opt.setName('description').setDescription('説明 / Description').setRequired(false))
    .addStringOption((opt) => opt.setName('color').setDescription('Hexカラー / Hex color').setRequired(false)),
  category: '一般 / General',
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const title = interaction.options.getString('title');
    const desc = interaction.options.getString('description') ?? '';
    const colorInput = interaction.options.getString('color') ?? '#5865F2';

    const hex = colorInput.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      const errMsg = await tGuild(interaction.guild.id, 'message.invalid_color');
      return interaction.editReply({ content: errMsg });
    }

    const embed = new EmbedBuilder()
      .setColor(parseInt(hex, 16))
      .setTitle(title)
      .setDescription(desc);

    await interaction.channel.send({ embeds: [embed] });

    const msg = await tGuild(interaction.guild.id, 'message.sent');
    const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
    await interaction.editReply({ embeds: [successEmbed] });
  },
};