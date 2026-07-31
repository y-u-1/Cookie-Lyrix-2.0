// src/commands/tickets/ticket.js
const { SlashCommandBuilder, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('チケット機能を管理します / Manage ticket system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('チケットパネルを設置します / Setup ticket panel')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('パネルを設置するチャンネル / Channel to setup').addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
        .addChannelOption((opt) =>
          opt.setName('category').setDescription('チケットを作成するカテゴリ / Category for tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(false)
        )
        .addRoleOption((opt) =>
          opt.setName('staff_role').setDescription('チケットに対応するスタッフロール / Staff role').setRequired(false)
        )
    ),
  category: 'チケット / Tickets',
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'setup') {
      // チャンネルへのメッセージ投稿・DB書き込みの後に応答していたため、
      // 3秒のインタラクション期限に間に合わないことがあった。先にdeferする。
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const channel = interaction.options.getChannel('channel') ?? interaction.channel;
      const category = interaction.options.getChannel('category');
      const staffRole = interaction.options.getRole('staff_role');

      // 設定をDBに保存（なければ作成）
      if (category || staffRole) {
        await prisma.ticketSettings.upsert({
          where: { guildId: interaction.guild.id },
          update: {
            categoryId: category?.id ?? null,
            staffRoleId: staffRole?.id ?? null,
          },
          create: {
            guildId: interaction.guild.id,
            categoryId: category?.id ?? null,
            staffRoleId: staffRole?.id ?? null,
          },
        });
      }

      const title = await tGuild(interaction.guild.id, 'ticket.panel_title');
      const desc = await tGuild(interaction.guild.id, 'ticket.panel_desc');
      const buttonLabel = await tGuild(interaction.guild.id, 'ticket.button_create');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setDescription(desc);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create')
          .setLabel(buttonLabel)
          .setStyle(ButtonStyle.Primary)
      );

      const panelMessage = await channel.send({ embeds: [embed], components: [row] });

      // パネルの情報をDBに保存
      await prisma.ticketPanel.create({
        data: {
          guildId: interaction.guild.id,
          channelId: channel.id,
          messageId: panelMessage.id,
        }
      });

      const successMsg = await tGuild(interaction.guild.id, 'ticket.panel_created');
      const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(successMsg);
      await interaction.editReply({ embeds: [successEmbed] });
    }
  },
};