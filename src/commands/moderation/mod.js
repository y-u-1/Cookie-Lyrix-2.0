// src/commands/moderation/mod.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');
const logger = require('../../lib/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('ユーザーを処罰します / Punish a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('warn')
        .setDescription('ユーザーを警告します / Warn a user')
        .addUserOption((opt) => opt.setName('user').setDescription('対象ユーザー / User').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('理由 / Reason').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('kick')
        .setDescription('ユーザーをキックします / Kick a user')
        .addUserOption((opt) => opt.setName('user').setDescription('対象ユーザー / User').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('理由 / Reason').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('ban')
        .setDescription('ユーザーをBANします / Ban a user')
        .addUserOption((opt) => opt.setName('user').setDescription('対象ユーザー / User').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('理由 / Reason').setRequired(false))
    ),
  category: 'モデレーション / Moderation',
  async execute(interaction) {
    // DM送信・kick/ban実行・DB書き込みなど時間のかかる処理が続くため、先にACKする。
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') ?? await tGuild(interaction.guild.id, 'mod.no_reason');
    
    const member = interaction.options.getMember('user');
    const lang = interaction.guild.preferredLocale === 'ja' ? 'ja' : 'en';

    // 権限階層チェック
    if (member && member.roles.highest.position >= interaction.member.roles.highest.position) {
      const msg = await tGuild(interaction.guild.id, 'mod.error_hierarchy');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.editReply({ embeds: [embed] });
    }

    let titleKey, descKey, successKey;
    let logTitleKey;
    let isKick = false, isBan = false;

    if (sub === 'warn') {
      titleKey = 'mod.dm_warn_title';
      descKey = 'mod.dm_warn_desc';
      successKey = 'mod.warn_success';
      logTitleKey = 'mod.log_title_warn';
    } else if (sub === 'kick') {
      titleKey = 'mod.dm_kick_title';
      descKey = 'mod.dm_kick_desc';
      successKey = 'mod.kick_success';
      logTitleKey = 'mod.log_title_kick';
      isKick = true;
    } else if (sub === 'ban') {
      titleKey = 'mod.dm_ban_title';
      descKey = 'mod.dm_ban_desc';
      successKey = 'mod.ban_success';
      logTitleKey = 'mod.log_title_ban';
      isBan = true;
    }

    // DM送信
    try {
      const dmTitle = await tGuild(interaction.guild.id, titleKey);
      const dmDesc = await tGuild(interaction.guild.id, descKey, { server: interaction.guild.name, reason: reason });
      const dmEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(dmTitle)
        .setDescription(dmDesc)
        .setTimestamp();
      await user.send({ embeds: [dmEmbed] });
    } catch (e) {
      logger.warn(`DM送信失敗: ${user.tag}`);
    }

    // 処罰実行
    try {
      if (isKick) {
        if (!interaction.appPermissions.has(PermissionFlagsBits.KickMembers)) {
          const msg = await tGuild(interaction.guild.id, 'mod.error_missing_perms');
          return interaction.editReply({ content: msg });
        }
        if (!member) {
          // 対象がこのサーバーの現在のメンバーでない場合(既に退出済みなど)、
          // member.kick()を呼ぶとnullのメソッド呼び出しでクラッシュしてしまうため、
          // 分かりやすいエラーメッセージを返す。
          const msg = await tGuild(interaction.guild.id, 'mod.error_not_a_member');
          return interaction.editReply({ content: msg });
        }
        await member.kick(reason);
      } else if (isBan) {
        if (!interaction.appPermissions.has(PermissionFlagsBits.BanMembers)) {
          const msg = await tGuild(interaction.guild.id, 'mod.error_missing_perms');
          return interaction.editReply({ content: msg });
        }
        await interaction.guild.bans.create(user.id, { reason });
      } else if (sub === 'warn') {
        // WarnはDBに記録
        await prisma.warning.create({
          data: {
            guildId: interaction.guild.id,
            userId: user.id,
            moderatorId: interaction.user.id,
            reason: reason,
          }
        });
      }
    } catch (e) {
      logger.error('Moderation action error:', e);
      const errMsg = await tGuild(interaction.guild.id, 'mod.action_failed');
      return interaction.editReply({ content: errMsg });
    }

    // 成功メッセージ
    const successMsg = await tGuild(interaction.guild.id, successKey, { user: user.toString(), reason: reason });
    const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(successMsg);
    await interaction.editReply({ embeds: [successEmbed] });

    // ログ送信
    const logChannelSetting = await prisma.logChannel.findUnique({
      where: { guildId_type: { guildId: interaction.guild.id, type: 'moderation' } }
    });

    if (logChannelSetting) {
      const channel = interaction.guild.channels.cache.get(logChannelSetting.channelId);
      if (channel) {
        const logTitle = await tGuild(interaction.guild.id, logTitleKey);
        const logUserText = await tGuild(interaction.guild.id, 'mod.log_user');
        const logModText = await tGuild(interaction.guild.id, 'mod.log_moderator');
        const logReasonText = await tGuild(interaction.guild.id, 'mod.log_reason');

        const logEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(logTitle)
          .addFields(
            { name: logUserText, value: `${user.tag} (<@${user.id}>)`, inline: false },
            { name: logModText, value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: false },
            { name: logReasonText, value: reason, inline: false }
          )
          .setThumbnail(user.displayAvatarURL())
          .setTimestamp();

        await channel.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }
  },
};