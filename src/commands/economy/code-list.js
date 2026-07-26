// src/commands/economy/code-list.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { t, getGuildLanguage } = require('../../lib/i18n');

const PAGE_SIZE = 20;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('code-list')
    .setDescription('有効なギフトコード一覧を表示します / List active gift codes')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  category: 'エコノミー / Economy',
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await sendCodeListPage(interaction, 0);
  },
};

async function sendCodeListPage(interaction, page) {
  // 「uses < maxUses」は同一行の別カラム同士の比較になるため、Prismaの
  // fieldReference機能(previewFeatures未有効)を使わずJS側でフィルタする。
  const allCodes = await prisma.redeemCode.findMany({
    where: { guildId: interaction.guild.id },
    orderBy: { createdAt: 'desc' },
  });
  const codesAll = allCodes.filter((c) => c.maxUses === 0 || c.uses < c.maxUses);

  const total = codesAll.length;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const safePage = Math.min(Math.max(0, page), maxPage);

  const codes = codesAll.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const lang = await getGuildLanguage(interaction.guild.id);
  const title = t(lang, 'code.list_title');
  const noData = t(lang, 'code.list_empty');

  const lines = codes.map((c, i) => {
    const usesText = c.maxUses === 0 ? '∞' : `${c.uses}/${c.maxUses}`;
    const rewards = [];
    if (c.coins > 0) rewards.push(`${Number(c.coins)}コイン`); // Number()で変換
    if (c.roleId) rewards.push('ロール');
    if (c.xp) rewards.push(`${Number(c.xp)}XP`);
    if (c.imageUrl || c.dmMessage) rewards.push('DM');
    return `**${safePage * PAGE_SIZE + i + 1}.** \`${c.code}\`\n> 報酬: ${rewards.join(', ') || 'なし'} | 使用回数: ${usesText}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${title} (${safePage + 1}/${maxPage + 1})`)
    .setDescription(lines.length ? lines.join('\n\n') : noData);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`code_list_page_${safePage - 1}`).setLabel('‹').setStyle(ButtonStyle.Secondary).setDisabled(safePage <= 0),
    new ButtonBuilder().setCustomId(`code_list_page_${safePage + 1}`).setLabel('›').setStyle(ButtonStyle.Secondary).setDisabled(safePage >= maxPage)
  );

  if (interaction.isButton()) {
    await interaction.update({ embeds: [embed], components: [row] }).catch(() => {});
  } else {
    await interaction.editReply({ embeds: [embed], components: [row] }).catch(() => {});
  }
}

async function handlePage(interaction) {
  const page = parseInt(interaction.customId.split('_')[3], 10) || 0;
  await sendCodeListPage(interaction, page);
}

module.exports.handlePage = handlePage;