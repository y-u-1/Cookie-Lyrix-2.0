// src/commands/general/ping.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botの応答速度を確認します / Check bot latency'),
  async execute(interaction) {
    const guildSettings = await prisma.guildSettings.findUnique({
      where: { guildId: interaction.guild.id }
    });
    const lang = guildSettings?.language || 'ja';

    const wsPing = interaction.client.ws.ping;
    const sent = await interaction.reply({
      content: '...',
      fetchReply: true
    });
    const apiPing = sent.createdTimestamp - interaction.createdTimestamp;

    let statusText = tGuild(interaction.guild.id, 'status_good');
    let color = 0x57F287;

    if (apiPing > 200) {
      statusText = tGuild(interaction.guild.id, 'status_bad');
      color = 0xED4245;
    } else if (apiPing > 100) {
      statusText = tGuild(interaction.guild.id, 'status_warn');
      color = 0xFEE75C;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(tGuild(interaction.guild.id, 'ping_title'))
      .setDescription(
        tGuild(interaction.guild.id, 'ping_desc') +
        tGuild(interaction.guild.id, 'ping_status', { status: statusText, ws: wsPing, api: apiPing })
      )
      .setFooter({ text: 'Cookie Lyrix 2.0' })
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};