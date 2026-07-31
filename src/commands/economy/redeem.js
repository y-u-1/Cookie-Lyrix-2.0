// src/commands/economy/redeem.js
const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { prisma } = require('../../lib/database');
const { addCoins, addXp } = require('../../lib/levelService');
const { applyLevelRoles } = require('../../lib/levelRoleService');
const { t, tGuild, getGuildLanguage } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('ギフトコードを交換します / Redeem a gift code')
    .addStringOption((opt) => opt.setName('code').setDescription('ギフトコード / Gift code').setRequired(true)),
  category: 'エコノミー / Economy',
  async execute(interaction) {
    const codeInput = interaction.options.getString('code');
    await processRedeem(interaction, codeInput);
  },
};

async function handleOpenModal(interaction) {
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
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const code = await prisma.redeemCode.findUnique({
      where: { code: codeInput.toUpperCase() },
      include: { usages: true }
    });

    if (!code) {
      const msg = await tGuild(interaction.guild.id, 'code.not_found');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.editReply({ embeds: [embed] });
    }

    if (code.maxUses > 0 && code.uses >= code.maxUses) {
      const msg = await tGuild(interaction.guild.id, 'code.faster_ended');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.editReply({ embeds: [embed] });
    }

    const userUsage = code.usages.find(u => u.userId === interaction.user.id);
    const userCount = userUsage?.count ?? 0;
    if (code.maxUsesPerUser > 0 && userCount >= code.maxUsesPerUser) {
      const msg = await tGuild(interaction.guild.id, 'code.user_limit_reached', { max: code.maxUsesPerUser });
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.editReply({ embeds: [embed] });
    }

    try {
      // インタラクティブ・トランザクションに変更。
      // 以前は updateMany と usage.upsert を別々の配列要素として同じ
      // $transaction に渡していたが、updateMany が0件(＝定員/上限到達)でも
      // upsert 側は無条件に実行されてしまい、報酬なしで使用回数だけが
      // カウントされる不整合が起きていた。ここではブロックされた場合は
      // upsert 自体を実行しないようにする。
      const blocked = await prisma.$transaction(async (tx) => {
        const codeUpdateResult = await tx.redeemCode.updateMany({
          where: {
            id: code.id,
            OR: [{ maxUses: 0 }, { uses: { lt: code.maxUses } }],
            usages: code.maxUsesPerUser > 0
              ? { none: { userId: interaction.user.id, count: { gte: code.maxUsesPerUser } } }
              : undefined,
          },
          data: { uses: { increment: 1 } }
        });

        if (codeUpdateResult.count === 0) return true;

        await tx.redeemCodeUsage.upsert({
          where: { codeId_userId: { codeId: code.id, userId: interaction.user.id } },
          update: { count: { increment: 1 } },
          create: { codeId: code.id, userId: interaction.user.id, count: 1 }
        });
        return false;
      });

      if (blocked) {
        const msg = await tGuild(interaction.guild.id, 'code.faster_ended');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.editReply({ embeds: [embed] });
      }
    } catch (txErr) {
      console.error('Redeem Transaction Error:', txErr);
      const msg = await tGuild(interaction.guild.id, 'code.faster_ended');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.editReply({ embeds: [embed] });
    }

    const lang = await getGuildLanguage(interaction.guild.id);
    const rewardsText = [];

    // 1. コイン付与
    if (code.coins > 0) {
      const newTotal = await addCoins(interaction.guild.id, interaction.user.id, code.coins);
      const coinsName = t(lang, 'economy.coin_name');
      rewardsText.push(`${Number(code.coins)} ${coinsName} (Total: ${Number(newTotal)})`); // Number()で変換
    }

    // 2. XP付与
    if (code.xp) {
      const xpResult = await addXp(interaction.guild.id, interaction.user.id, Number(code.xp));
      rewardsText.push(`${Number(code.xp)} XP`); // Number()で変換

      if (xpResult.leveledUp) {
        const grantedRoleIds = await applyLevelRoles(interaction.member, xpResult.newLevel).catch(() => []);
        if (grantedRoleIds.length > 0) {
          rewardsText.push(grantedRoleIds.map((id) => `<@&${id}>`).join(', '));
        }
      }
    }

    // 3. ロール付与
    if (code.roleId) {
      const member = interaction.member;
      await member.roles.add(code.roleId).catch(() => {});
      rewardsText.push(`Role: <@&${code.roleId}>`);
    }

    // 4. DM送信 (画像またはメッセージ)
    if (code.imageUrl || code.dmMessage) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(t(lang, 'redeem.dm_title'))
          .setDescription(code.dmMessage || ' ');
        if (code.imageUrl) dmEmbed.setImage(code.imageUrl);
        
        await interaction.user.send({ embeds: [dmEmbed] });
        rewardsText.push(t(lang, 'redeem.dm_sent'));
      } catch (dmErr) {
        console.error('DM Send Error:', dmErr);
        rewardsText.push(t(lang, 'redeem.dm_failed'));
      }
    }

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
              { name: 'Rewards', value: rewardsText.join('\n') || 'None', inline: false },
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

    let msg = await tGuild(interaction.guild.id, 'code.redeemed', { rewards: rewardsText.join('\n') || t(lang, 'redeem.no_rewards') });
    if (code.customMessage) {
      msg += `\n\n> ${code.customMessage}`;
    }

    const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error('Redeem Process Error:', err);
    const errorMsg = await tGuild(interaction.guild.id, 'code.redeem_error').catch(() => '### Error\nAn error occurred while redeeming this code.');
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMsg });
      } else {
        await interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
      }
    } catch (e) {}
  }
}

module.exports.handleOpenModal = handleOpenModal;
module.exports.handleSubmit = handleSubmit;