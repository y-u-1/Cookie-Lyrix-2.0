// src/commands/moderation/role-panel.js
const { SlashCommandBuilder, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');
const { buildPanelRows } = require('./roleInteractions');

const MAX_INLINE_ROLES = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-panel')
    .setDescription('ロール付与パネルを設置します / Setup a role panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((opt) => opt.setName('title').setDescription('パネルのタイトル / Panel title').setRequired(true))
    .addChannelOption((opt) => opt.setName('channel').setDescription('パネルを設置するチャンネル / Channel').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addRoleOption((opt) => opt.setName('role1').setDescription('付与するロール 1 / Role 1 to grant').setRequired(false))
    .addStringOption((opt) => opt.setName('label1').setDescription('ロール1のボタン表示名 (省略時はロール名) / Button label for role 1').setRequired(false))
    .addRoleOption((opt) => opt.setName('role2').setDescription('付与するロール 2 / Role 2 to grant').setRequired(false))
    .addStringOption((opt) => opt.setName('label2').setDescription('ロール2のボタン表示名 (省略時はロール名) / Button label for role 2').setRequired(false))
    .addRoleOption((opt) => opt.setName('role3').setDescription('付与するロール 3 / Role 3 to grant').setRequired(false))
    .addStringOption((opt) => opt.setName('label3').setDescription('ロール3のボタン表示名 (省略時はロール名) / Button label for role 3').setRequired(false))
    .addRoleOption((opt) => opt.setName('role4').setDescription('付与するロール 4 / Role 4 to grant').setRequired(false))
    .addStringOption((opt) => opt.setName('label4').setDescription('ロール4のボタン表示名 (省略時はロール名) / Button label for role 4').setRequired(false))
    .addRoleOption((opt) => opt.setName('role5').setDescription('付与するロール 5 / Role 5 to grant').setRequired(false))
    .addStringOption((opt) => opt.setName('label5').setDescription('ロール5のボタン表示名 (省略時はロール名) / Button label for role 5').setRequired(false)),
  category: 'モデレーション / Moderation',
  async execute(interaction) {
    // チャンネルへのメッセージ投稿・DB書き込みの後に応答していたため、
    // 3秒のインタラクション期限に間に合わないことがあった。先にdeferする。
    await interaction.deferReply({ ephemeral: true });

    const title = interaction.options.getString('title');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    // コマンド入力中に指定されたロール(role1〜role5)を収集する。
    // ラベル省略時はロール名をそのまま表示名として使う。
    const inlineRoles = [];
    for (let i = 1; i <= MAX_INLINE_ROLES; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (!role) continue;
      const label = interaction.options.getString(`label${i}`) || role.name;
      inlineRoles.push({ role, label: label.slice(0, 80) });
    }

    const desc = await tGuild(interaction.guild.id, 'role.panel_desc');
    const addButtonLabel = await tGuild(interaction.guild.id, 'role_panel.add_button_label');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(title)
      .setDescription(desc);

    // まずは管理者用の「ロールを追加」ボタンのみでパネルを送信する
    // (メッセージIDが確定してからDBにアイテムを保存する必要があるため)
    const placeholderRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('role_panel_add')
        .setLabel(addButtonLabel)
        .setStyle(ButtonStyle.Primary)
    );

    const panelMessage = await channel.send({ embeds: [embed], components: [placeholderRow] });

    const panel = await prisma.rolePanel.create({
      data: {
        guildId: interaction.guild.id,
        channelId: channel.id,
        messageId: panelMessage.id,
        title: title,
        description: desc,
      }
    });

    // コマンド入力時に指定されたロールをまとめてDBに保存する
    if (inlineRoles.length > 0) {
      await prisma.rolePanelItem.createMany({
        data: inlineRoles.map(({ role, label }) => ({
          panelId: panel.id,
          roleId: role.id,
          label,
          style: 2, // Secondary
        })),
      });

      const items = await prisma.rolePanelItem.findMany({ where: { panelId: panel.id } });
      const rows = buildPanelRows(items, addButtonLabel);
      await panelMessage.edit({ components: rows });
    }

    const successMsg = await tGuild(interaction.guild.id, 'role.panel_created');
    const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(successMsg);
    await interaction.editReply({ embeds: [successEmbed] });
  },
};