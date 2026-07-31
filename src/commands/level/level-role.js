// src/commands/level/level-role.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { tGuild } = require('../../lib/i18n');
const { setLevelRole, removeLevelRole, listLevelRoles } = require('../../lib/levelRoleService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level-role')
    .setDescription('レベル到達時のロール付与を設定します / Configure level-up role rewards')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('レベル到達時に付与するロールを設定 / Set the role granted at a level')
        .addIntegerOption((opt) => opt.setName('level').setDescription('到達レベル / Level').setMinValue(1).setRequired(true))
        .addRoleOption((opt) => opt.setName('role').setDescription('付与するロール / Role to grant').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('指定レベルのロール設定を削除 / Remove a level role reward')
        .addIntegerOption((opt) => opt.setName('level').setDescription('対象レベル / Level').setMinValue(1).setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('現在のレベルロール設定を一覧表示 / List configured level role rewards')
    ),
  category: 'レベリング / Leveling',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const level = interaction.options.getInteger('level');
      const role = interaction.options.getRole('role');

      // Botの権限チェック(auto-roleと同様、Botの最高ロールより上の位置には付与できない)
      if (role.position >= interaction.guild.members.me.roles.highest.position) {
        const msg = await tGuild(interaction.guild.id, 'levelrole.error_position');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      await setLevelRole(interaction.guild.id, level, role.id);

      const msg = await tGuild(interaction.guild.id, 'levelrole.set_success', { level, role: role.toString() });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (sub === 'remove') {
      const level = interaction.options.getInteger('level');
      const result = await removeLevelRole(interaction.guild.id, level);

      if (result.count === 0) {
        const msg = await tGuild(interaction.guild.id, 'levelrole.not_found', { level });
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      const msg = await tGuild(interaction.guild.id, 'levelrole.remove_success', { level });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (sub === 'list') {
      const levelRoles = await listLevelRoles(interaction.guild.id);
      const title = await tGuild(interaction.guild.id, 'levelrole.list_title');
      const noData = await tGuild(interaction.guild.id, 'levelrole.list_empty');

      const lines = levelRoles.map((lr) => `**LV. ${lr.level}** → <@&${lr.roleId}>`);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setDescription(lines.length ? lines.join('\n') : noData);

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};
