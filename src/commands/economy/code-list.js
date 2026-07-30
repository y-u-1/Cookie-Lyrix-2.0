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
  const lang = await getGuildLanguage(interaction.guild.id);

  // Prisma標準クライアントでは同一行内の2つのフィールド比較(uses < maxUses)を
  // 直接クエリできないため(previewFeatureが無効)、このギルドの全コードを取得し、
  // 「まだ使用可能か」の判定はJS側で行う。
  const allCodes = await prisma.redeemCode.findMany({
    where: { guildId: interaction.guild.id },
    orderBy: { createdAt: 'desc' },
  });

  const availableCodes = allCodes.filter((c) => c.maxUses === 0 || c.uses < c.maxUses);

  const total = availableCodes.length;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const safePage = Math.min(Math.max(0, page), maxPage);

  const codes = availableCodes.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const title = t(lang, 'code.list_title');
  const noData = t(lang, 'code.list_empty');
  const unlimitedText = t(lang, 'code.unlimited');
  const rewardsLabel = t(lang, 'code.rewards_label');
  const usesLabel = t(lang, 'code.uses_label');
  const coinsName = t(lang, 'economy.coin_name');
  const roleText = t(lang, 'code.reward_role');
  const dmText = t(lang, 'code.reward_dm');

  const lines = codes.map((c, i) => {
    const usesText = c.maxUses === 0 ? unlimitedText : `${c.uses}/${c.maxUses}`;
    
    const rewards = [];
    if (c.coins > 0) rewards.push(`${Number(c.coins)} ${coinsName}`);
    if (c.roleId) rewards.push(roleText);
    if (c.xp) rewards.push(`${Number(c.xp)} XP`);
    if (c.imageUrl || c.dmMessage) rewards.push(dmText);
    
    return `**${safePage * PAGE_SIZE + i + 1}.** \`${c.code}\`\n> ${rewardsLabel}: ${rewards.join(', ') || t(lang, 'redeem.no_rewards')} | ${usesLabel}: ${usesText}`;
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