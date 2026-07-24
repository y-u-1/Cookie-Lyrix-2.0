// src/commands/moderation/auto-role.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto-role')
    .setDescription('新規参加者に自動で付与するロールを設定します / Set auto role for new members')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('自動ロールを設定 / Set auto role')
        .addRoleOption((opt) => opt.setName('role').setDescription('付与するロール / Role to assign').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('自動ロールを無効化 / Disable auto role')
    ),
  category: 'モデレーション / Moderation',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const role = interaction.options.getRole('role');

      // Botの権限チェック
      if (role.position >= interaction.guild.members.me.roles.highest.position) {
        const msg = await tGuild(interaction.guild.id, 'autorole.error');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { autoRoleId: role.id },
        create: { guildId: interaction.guild.id, autoRoleId: role.id },
      });

      const msg = await tGuild(interaction.guild.id, 'autorole.setup_success', { role: role.toString() });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'disable') {
      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { autoRoleId: null },
        create: { guildId: interaction.guild.id, autoRoleId: null },
      });

      const msg = await tGuild(interaction.guild.id, 'autorole.disabled');
      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};