// src/commands/moderation/roleInteractions.js
// 2026-07-29 仕様変更: パネル1つにつきロールは1つだけ。
// 「ロールを追加」ボタン・カスタムラベル入力モーダルは廃止し、
// パネル作成後に変更したい場合は新しいパネルを作り直す運用とする。
const { EmbedBuilder, MessageFlags } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

// ロールの付与/解除トグル
async function handleRoleToggle(interaction) {
  // 先にACKする。ロールの付与/削除はDiscord APIへの実際の通信が発生し、
  // 混雑時などに3秒を超えることがあるため、確認前に必ず応答しておく。
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
  if (interaction.isButton() && interaction.customId.startsWith('role_toggle_')) {
    return handleRoleToggle(interaction);
  }
  return null;
}

module.exports = { route };
