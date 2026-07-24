// src/commands/general/language.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { t, setGuildLanguageCache } = require('../../lib/i18n');
const logger = require('../../lib/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('language')
    .setDescription('サーバーの言語設定を変更します / Change the server language')
    .addStringOption((option) =>
      option
        .setName('language')
        .setDescription('設定する言語 / Language to set')
        .setRequired(true)
        .addChoices(
          { name: '日本語', value: 'ja' },
          { name: 'English', value: 'en' }
        )
    ),
  category: '一般 / General',
  async execute(interaction) {
    const lang = interaction.options.getString('language');
    
    try {
      // データベースの言語設定を更新（なければ作成）
      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { language: lang },
        create: { guildId: interaction.guild.id, language: lang },
      });

      // TTLを待たずにキャッシュへ即反映(古い言語がしばらく表示され続けるのを防ぐ)
      setGuildLanguageCache(interaction.guild.id, lang);

      // 言語名を表示用に取得
      const langName = lang === 'ja' ? t(lang, 'lang_name_ja') : t(lang, 'lang_name_en');

      // Embedの作成
      const embed = new EmbedBuilder()
        .setColor(0x5865F2) // ブルー
        .setTitle(t(lang, 'lang_title'))
        .setDescription(t(lang, 'lang_changed_desc', { lang: langName }))
        .setFooter({ text: 'Cookie Lyrics 2.0' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      logger.error('言語設定エラー:', err);
      // エラー時もEmbedで返す
      const embed = new EmbedBuilder()
        .setColor(0xED4245) // 赤
        .setTitle(t(lang, 'lang_title'))
        .setDescription(t(lang, 'lang_err'))
        .setFooter({ text: 'Cookie Lyrics 2.0' });
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};