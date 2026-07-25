// src/commands/general/serverinfo.js
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('サーバー情報を表示します / Show server information'),
  category: '一般 / General',
  async execute(interaction) {
    const guild = interaction.guild;
    await guild.fetch(); // boostレベルなどの最新情報を確実に取得する

    const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;

    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setColor(0x5865F2)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'サーバーID / Server ID', value: guild.id, inline: false },
        { name: 'オーナー / Owner', value: `<@${guild.ownerId}>`, inline: false },
        { name: '作成日 / Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
        { name: 'メンバー数 / Members', value: `${guild.memberCount}`, inline: false },
        { name: 'ロール数 / Roles', value: `${guild.roles.cache.size}`, inline: false },
        { name: 'チャンネル数 / Channels', value: `Text: ${textChannels} / Voice: ${voiceChannels}`, inline: false },
        { name: 'ブーストレベル / Boost Level', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: false }
      );

    if (guild.bannerURL()) {
      embed.setImage(guild.bannerURL({ size: 1024 }));
    }

    await interaction.reply({ embeds: [embed] });
  },
};