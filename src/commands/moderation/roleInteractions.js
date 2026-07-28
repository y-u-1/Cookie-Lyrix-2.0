// src/commands/moderation/roleInteractions.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

// パネルアイテム一覧からボタン行(ActionRow)を組み立てる。
// 5個ごとに行を分け、最後に管理者用の「ロールを追加」ボタン行を付ける。
function buildPanelRows(items, addButtonLabel) {
  const rows = [];
  let currentRow = new ActionRowBuilder();

  for (let i = 0; i < items.length; i++) {
    if (i > 0 && i % 5 === 0) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`role_toggle_${items[i].id}`)
        .setLabel(items[i].label)
        .setStyle(ButtonStyle[items[i].style === 1 ? 'Primary' : items[i].style === 3 ? 'Success' : 'Secondary'])
    );
  }
  if (items.length > 0) rows.push(currentRow);

  const adminRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('role_panel_add')
      .setLabel(addButtonLabel)
      .setStyle(ButtonStyle.Primary)
  );
  rows.push(adminRow);

  return rows;
}

// 「ロールを追加」ボタン -> モーダルを開く
async function handleAddRole(interaction) {
  if (!interaction.memberPermissions.has('ManageRoles')) {
    const msg = await tGuild(interaction.guild.id, 'role_panel.no_permission');
    return interaction.reply({ content: msg, ephemeral: true });
  }

  const modalTitle = await tGuild(interaction.guild.id, 'role_panel.modal_title');
  const roleIdLabel = await tGuild(interaction.guild.id, 'role_panel.field_role_id');
  const labelFieldLabel = await tGuild(interaction.guild.id, 'role_panel.field_label');

  const modal = new ModalBuilder()
    .setCustomId('role_panel_modal')
    .setTitle(modalTitle);

  const roleIdInput = new TextInputBuilder()
    .setCustomId('role_id')
    .setLabel(roleIdLabel)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const labelInput = new TextInputBuilder()
    .setCustomId('label')
    .setLabel(labelFieldLabel)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(roleIdInput), new ActionRowBuilder().addComponents(labelInput));

  await interaction.showModal(modal);
}

// モーダル送信 -> パネルにボタンを追加
async function handleModalSubmit(interaction) {
  if (interaction.customId !== 'role_panel_modal') return;

  // 先にACKする(この後DB操作とメッセージ編集が続くため)。
  await interaction.deferReply({ ephemeral: true });

  const roleId = interaction.fields.getTextInputValue('role_id');
  const label = interaction.fields.getTextInputValue('label');

  const panel = await prisma.rolePanel.findFirst({
    where: { channelId: interaction.channel.id },
    orderBy: { createdAt: 'desc' }
  });

  if (!panel) {
    const msg = await tGuild(interaction.guild.id, 'role_panel.not_found');
    return interaction.editReply({ content: msg });
  }

  // DBにロールを保存
  await prisma.rolePanelItem.create({
    data: {
      panelId: panel.id,
      roleId: roleId,
      label: label,
      style: 2, // Secondary
    }
  });

  // パネルのメッセージを更新してボタンを追加
  const channel = interaction.channel;
  const message = await channel.messages.fetch(panel.messageId);
  
  const items = await prisma.rolePanelItem.findMany({ where: { panelId: panel.id } });
  const addButtonLabel = await tGuild(interaction.guild.id, 'role_panel.add_button_label');
  const rows = buildPanelRows(items, addButtonLabel);

  await message.edit({ components: rows });
  
  const successMsg = await tGuild(interaction.guild.id, 'role_panel.item_added');
  await interaction.editReply({ content: successMsg });
}

// ロールの付与/解除トグル
async function handleRoleToggle(interaction) {
  // 先にACKする。ロールの付与/削除はDiscord APIへの実際の通信が発生し、
  // 混雑時などに3秒を超えることがあるため、確認前に必ず応答しておく。
  await interaction.deferReply({ ephemeral: true });

  const itemId = interaction.customId.replace('role_toggle_', '');
  const item = await prisma.rolePanelItem.findUnique({ where: { id: itemId } });
  
  if (!item) {
    const msg = await tGuild(interaction.guild.id, 'role_panel.item_not_found');
    return interaction.editReply({ content: msg });
  }

  const member = interaction.member;
  const hasRole = member.roles.cache.has(item.roleId);

  if (hasRole) {
    await member.roles.remove(item.roleId).catch(() => {});
    const msg = await tGuild(interaction.guild.id, 'role.removed', { role: `<@&${item.roleId}>` });
    const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
    await interaction.editReply({ embeds: [embed] });
  } else {
    await member.roles.add(item.roleId).catch(() => {});
    const msg = await tGuild(interaction.guild.id, 'role.added', { role: `<@&${item.roleId}>` });
    const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
    await interaction.editReply({ embeds: [embed] });
  }
}

async function route(interaction) {
  if (interaction.isButton()) {
    if (interaction.customId === 'role_panel_add') return handleAddRole(interaction);
    if (interaction.customId.startsWith('role_toggle_')) return handleRoleToggle(interaction);
  }
  
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'role_panel_modal') return handleModalSubmit(interaction);
  }
  
  return null;
}

module.exports = { route, buildPanelRows };