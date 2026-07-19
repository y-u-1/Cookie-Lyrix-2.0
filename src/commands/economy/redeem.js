// src/commands/economy/redeem.js
const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { addCoins } = require('../../lib/levelService');
const { t, tGuild, getGuildLanguage } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('ギフトコードを交換します / Redeem a gift code')
    .addStringOption((opt) => opt.setName('code').setDescription('ギフトコード / Gift code').setRequired(true)),
  async execute(interaction) {
    const codeInput = interaction.options.getString('code');
    await processRedeem(interaction, codeInput);
  },
};

async function handleOpenModal(interaction) {
  // showModal()は事前にdeferできない(これ自体が最初の応答)ため、
  // その前段のDB問い合わせを最小限(1回)に抑える。
  // 以前はtGuild()を3回連続で呼んでおり、DBが遅い瞬間に
  // 3秒のインタラクション期限に間に合わずパネルが反応しないことがあった。
  const lang = await getGuildLanguage(interaction.guild.id);
  const modalTitle = t(lang, 'redeem.modal_title');
  const fieldLabel = t(lang, 'redeem.modal_label');
  const fieldPlaceholder = t(lang, 'redeem.modal_placeholder');

  const modal = new ModalBuilder()
    .setCustomId('redeem_submit')
    .setTitle(modalTitle);

  const codeInput = new TextInputBuilder()
    .setCustomId('code_input')
    .setLabel(fieldLabel)
    .setPlaceholder(fieldPlaceholder)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(codeInput));

  await interaction.showModal(modal);
}

async function handleSubmit(interaction) {
  const codeInput = interaction.fields.getTextInputValue('code_input');
  await processRedeem(interaction, codeInput);
}

async function processRedeem(interaction, codeInput) {
  // モーダル経由の時だけdeferしていたが、通常の/redeemコマンドの方が
  // DBトランザクション・コイン付与・ログ送信など処理が多く、
  // 3秒のインタラクション期限を超えるリスクが高いため、
  // 常に最初にdeferReplyしてから処理する。
  await interaction.deferReply({ ephemeral: true });

  try {
    // コードを検索
    const code = await prisma.redeemCode.findUnique({
      where: { code: codeInput.toUpperCase() },
      include: { usages: true }
    });

    if (!code) {
      const msg = await tGuild(interaction.guild.id, 'code.not_found');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.editReply({ embeds: [embed] });
    }

    // 全体の使用回数チェック
    if (code.maxUses > 0 && code.uses >= code.maxUses) {
      const msg = await tGuild(interaction.guild.id, 'code.faster_ended');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.editReply({ embeds: [embed] });
    }

    // ユーザーごとの使用回数チェック
    const userUsage = code.usages.find(u => u.userId === interaction.user.id);
    const userCount = userUsage?.count ?? 0;
    if (code.maxUsesPerUser > 0 && userCount >= code.maxUsesPerUser) {
      const msg = await tGuild(interaction.guild.id, 'code.user_limit_reached', { max: code.maxUsesPerUser });
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.editReply({ embeds: [embed] });
    }

    // トランザクションで安全にカウントを更新
    try {
      await prisma.$transaction([
        prisma.redeemCode.updateMany({
          where: {
            id: code.id,
            OR: [{ maxUses: 0 }, { uses: { lt: code.maxUses } }]
          },
          data: { uses: { increment: 1 } }
        }),
        prisma.redeemCodeUsage.upsert({
          where: { codeId_userId: { codeId: code.id, userId: interaction.user.id } },
          update: { count: { increment: 1 } },
          create: { codeId: code.id, userId: interaction.user.id, count: 1 }
        })
      ]);
    } catch (txErr) {
      console.error('Redeem Transaction Error:', txErr);
      const msg = await tGuild(interaction.guild.id, 'code.faster_ended');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.editReply({ embeds: [embed] });
    }

    // コイン付与
    const newTotal = await addCoins(interaction.guild.id, interaction.user.id, code.coins);

    // --- Redeemログ送信 ---
    try {
      const logChannelSetting = await prisma.logChannel.findUnique({
        where: { guildId_type: { guildId: interaction.guild.id, type: 'redeem' } }
      });
      if (logChannelSetting) {
        const channel = interaction.guild.channels.cache.get(logChannelSetting.channelId);
        if (channel) {
          const logEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setTitle('Redeem Log')
            .addFields(
              { name: 'User', value: `<@${interaction.user.id}>`, inline: false },
              { name: 'Code', value: `\`${code.code}\``, inline: false },
              { name: 'Coins', value: `${code.coins}`, inline: false },
              { name: 'Total Uses', value: `${code.uses + 1} / ${code.maxUses === 0 ? '∞' : code.maxUses}`, inline: true },
              { name: 'User Uses', value: `${userCount + 1} / ${code.maxUsesPerUser === 0 ? '∞' : code.maxUsesPerUser}`, inline: true }
            )
            .setTimestamp();
          await channel.send({ embeds: [logEmbed] });
        }
      }
    } catch (logErr) {
      console.error('Redeem Log Error:', logErr);
    }

    let msg = await tGuild(interaction.guild.id, 'code.redeemed', { coins: code.coins, total: newTotal });
    if (code.customMessage) {
      msg += `\n\n> ${code.customMessage}`;
    }

    const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error('Redeem Process Error:', err);
    const errorMsg = await tGuild(interaction.guild.id, 'code.redeem_error').catch(() => '### エラー\nコードの引き換え中にエラーが発生しました。');
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMsg });
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
    } catch (e) {}
  }
}

module.exports.handleOpenModal = handleOpenModal;
module.exports.handleSubmit = handleSubmit;