// src/commands/moderation/ngword.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ngword')
    .setDescription('NGワードを管理します / Manage NG words')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('NGワードを追加 / Add an NG word')
        .addStringOption((opt) => opt.setName('word').setDescription('NGワード / Word').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('NGワードを削除 / Remove an NG word')
        .addStringOption((opt) => opt.setName('word').setDescription('NGワード / Word').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('NGワードの一覧を表示 / List NG words')
    ),
  category: 'モデレーション / Moderation',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const word = interaction.options.getString('word');
      await prisma.ngWord.upsert({
        where: { guildId_word: { guildId: interaction.guild.id, word } },
        update: {},
        create: { guildId: interaction.guild.id, word },
      });

      const msg = await tGuild(interaction.guild.id, 'ngword.added', { word });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'remove') {
      const word = interaction.options.getString('word');
      await prisma.ngWord.deleteMany({
        where: { guildId: interaction.guild.id, word },
      });

      const msg = await tGuild(interaction.guild.id, 'ngword.removed', { word });
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'list') {
      const words = await prisma.ngWord.findMany({ where: { guildId: interaction.guild.id } });
      
      let msg;
      if (words.length === 0) {
        msg = await tGuild(interaction.guild.id, 'ngword.list_empty');
      } else {
        const title = await tGuild(interaction.guild.id, 'ngword.list_title');
        const wordList = words.map((w, i) => `${i + 1}. \`${w.word}\``).join('\n');
        msg = `${title}\n${wordList}`;
      }

      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};