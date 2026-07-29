// src/commands/moderation/role-panel.js
// 2026-07-29 仕様変更: パネル1つにつきロールは1つだけ。
// パネルの構成要素は「タイトル」「ロール」「付与ボタン」の3つのみ。
// カスタムラベル・複数ロール・後からの追加ボタンは廃止。
const { SlashCommandBuilder, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-panel')
    .setDescription('ロール付与パネルを設置します / Setup a role panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((opt) => opt.setName('title').setDescription('パネルのタイトル / Panel title').setRequired(true))
    .addRoleOption((opt) => opt.setName('role').setDescription('付与するロール / Role to grant').setRequired(true))
    .addChannelOption((opt) => opt.setName('channel').setDescription('パネルを設置するチャンネル / Channel').addChannelTypes(ChannelType.GuildText).setRequired(false)),
  category: 'モデレーション / Moderation',
  async execute(interaction) {
    // チャンネルへのメッセージ投稿・DB書き込みの後に応答していたため、
    // 3秒のインタラクション期限に間に合わないことがあった。先にdeferする。
    await interaction.deferReply({ ephemeral: true });

    const title = interaction.options.getString('title');
    const role = interaction.options.getRole('role');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    const roleLabel = await tGuild(interaction.guild.id, 'role_panel.role_field');
    let grantButtonLabel = await tGuild(interaction.guild.id, 'role_panel.grant_button_label', { role: role.name });
    if (grantButtonLabel.length > 80) grantButtonLabel = grantButtonLabel.slice(0, 79) + '…';

    // パネルの構成要素はタイトル・ロール・付与ボタンのみ。
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(title)
      .addFields({ name: roleLabel, value: role.toString() });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('role_toggle_pending') // メッセージ送信後、実際のitem IDに差し替える
        .setLabel(grantButtonLabel)
        .setStyle(ButtonStyle.Secondary)
    );

    const panelMessage = await channel.send({ embeds: [embed], components: [row] });

    const panel = await prisma.rolePanel.create({
      data: {
        guildId: interaction.guild.id,
        channelId: channel.id,
        messageId: panelMessage.id,
        title: title,
        description: '',
      }
    });

    const item = await prisma.rolePanelItem.create({
      data: {
        panelId: panel.id,
        roleId: role.id,
        label: role.name,
        style: 2, // Secondary
      }
    });

    // ボタンのcustomIdを実際のitem IDに差し替える
    const finalRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`role_toggle_${item.id}`)
        .setLabel(grantButtonLabel)
        .setStyle(ButtonStyle.Secondary)
    );
    await panelMessage.edit({ components: [finalRow] });

    const successMsg = await tGuild(interaction.guild.id, 'role.panel_created');
    const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(successMsg);
    await interaction.editReply({ embeds: [successEmbed] });
  },
};
