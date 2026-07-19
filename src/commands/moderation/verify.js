// src/commands/moderation/verify.js
const { SlashCommandBuilder, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('認証パネルを設置します / Setup a verification panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addRoleOption((opt) => opt.setName('role').setDescription('認証後に付与するロール / Role to give').setRequired(true))
    .addChannelOption((opt) => opt.setName('channel').setDescription('パネルを設置するチャンネル / Channel').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addStringOption((opt) => opt.setName('block_guild_ids').setDescription('ブロックするサーバーID (カンマ区切り) / Block guild IDs (comma separated)').setRequired(false))
    .addIntegerOption((opt) => opt.setName('min_account_age').setDescription('アカウント作成からの必要日数 / Min account age (days)').setMinValue(0).setRequired(false)),
  async execute(interaction) {
    // チャンネルへのメッセージ投稿・DB書き込みの後に応答していたため、
    // 3秒のインタラクション期限に間に合わないことがあった。先にdeferする。
    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole('role');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const blockGuildIds = interaction.options.getString('block_guild_ids');
    const minAge = interaction.options.getInteger('min_account_age') ?? 0;

    const title = await tGuild(interaction.guild.id, 'verify.panel_title');
    const desc = await tGuild(interaction.guild.id, 'verify.panel_desc');
    const buttonLabel = await tGuild(interaction.guild.id, 'verify.button');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(title)
      .setDescription(desc);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel(buttonLabel)
        .setStyle(ButtonStyle.Success)
    );

    const panelMessage = await channel.send({ embeds: [embed], components: [row] });

    await prisma.verifyPanel.create({
      data: {
        guildId: interaction.guild.id,
        channelId: channel.id,
        messageId: panelMessage.id,
        roleId: role.id,
        blockGuildIds: blockGuildIds,
        minAccountAgeDays: minAge,
      }
    });

    const successMsg = await tGuild(interaction.guild.id, 'verify.panel_created');
    const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(successMsg);
    await interaction.editReply({ embeds: [successEmbed] });
  },
};