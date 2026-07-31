// src/commands/moderation/tempvc.js
const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempvc')
    .setDescription('一時ボイスチャンネルを設定します / Setup Temp VC')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('作成元チャンネルとカテゴリを設定 / Set creation channel and category')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('参加してVCを作成するチャンネル / Trigger channel').addChannelTypes(ChannelType.GuildVoice).setRequired(true)
        )
        .addChannelOption((opt) =>
          opt.setName('category').setDescription('VCを作成するカテゴリ / Category for VCs').addChannelTypes(ChannelType.GuildCategory).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('一時VC機能を無効化 / Disable Temp VC')
    ),
category: 'モデレーション / Moderation',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const category = interaction.options.getChannel('category');

      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { tempVcChannelId: channel.id, tempVcCategoryId: category.id },
        create: { guildId: interaction.guild.id, tempVcChannelId: channel.id, tempVcCategoryId: category.id },
      });

      const msg = await tGuild(interaction.guild.id, 'tempvc.setup_success', { channel: channel.toString(), category: category.name });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (sub === 'disable') {
      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { tempVcChannelId: null, tempVcCategoryId: null },
        create: { guildId: interaction.guild.id, tempVcChannelId: null, tempVcCategoryId: null },
      });

      const msg = await tGuild(interaction.guild.id, 'tempvc.disabled');
      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};