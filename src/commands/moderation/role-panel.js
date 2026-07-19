// src/commands/moderation/role-panel.js
const { SlashCommandBuilder, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-panel')
    .setDescription('ロール付与パネルを設置します / Setup a role panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((opt) => opt.setName('title').setDescription('パネルのタイトル / Panel title').setRequired(true))
    .addChannelOption((opt) => opt.setName('channel').setDescription('パネルを設置するチャンネル / Channel').addChannelTypes(ChannelType.GuildText).setRequired(false)),
  async execute(interaction) {
    // チャンネルへのメッセージ投稿・DB書き込みの後に応答していたため、
    // 3秒のインタラクション期限に間に合わないことがあった。先にdeferする。
    await interaction.deferReply({ ephemeral: true });

    const title = interaction.options.getString('title');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    const desc = await tGuild(interaction.guild.id, 'role.panel_desc');
    const addButtonLabel = await tGuild(interaction.guild.id, 'role_panel.add_button_label');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(title)
      .setDescription(desc);

    // 仮のボタンを設置（後で編集できるように、まずはパネルだけ作る）
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('role_panel_add')
        .setLabel(addButtonLabel)
        .setStyle(ButtonStyle.Primary)
    );

    const panelMessage = await channel.send({ embeds: [embed], components: [row] });

    await prisma.rolePanel.create({
      data: {
        guildId: interaction.guild.id,
        channelId: channel.id,
        messageId: panelMessage.id,
        title: title,
        description: desc,
      }
    });

    const successMsg = await tGuild(interaction.guild.id, 'role.panel_created');
    const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(successMsg);
    await interaction.editReply({ embeds: [successEmbed] });
  },
};