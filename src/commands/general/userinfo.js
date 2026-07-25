// src/commands/general/userinfo.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('ユーザー情報を表示します / Show user information')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('対象ユーザー(省略時は自分) / Target user').setRequired(false)
    ),
  category: '一般 / General',
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle(targetUser.tag)
      .setColor(0x5865F2)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID / ID', value: targetUser.id, inline: true },
        {
          name: 'アカウント作成日 / Account Created',
          value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`,
          inline: false,
        }
      );

    if (targetMember) {
      embed.addFields(
        {
          name: 'サーバー参加日 / Joined Server',
          value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>`,
          inline: false,
        },
        {
          name: `ロール / Roles (${targetMember.roles.cache.size - 1})`,
          value:
            targetMember.roles.cache
              .filter((r) => r.id !== interaction.guild.id)
              .map((r) => `<@&${r.id}>`)
              .join(' ') || 'None',
          inline: false,
        }
      );

      if (targetMember.premiumSince) {
        embed.addFields({
          name: 'ブースト開始日 / Boosting Since',
          value: `<t:${Math.floor(targetMember.premiumSinceTimestamp / 1000)}:F>`,
          inline: false,
        });
      }
    } else {
      embed.addFields({
        name: '注記 / Note',
        value: 'このユーザーは現在サーバーにいません。 / This user is not currently in the server.',
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};