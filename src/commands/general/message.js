// src/commands/general/message.js
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('message')
    .setDescription('カスタム埋め込みメッセージを送信します / Send a custom embed message')
    .addStringOption((opt) => opt.setName('title').setDescription('タイトル / Title').setRequired(true))
    .addStringOption((opt) => opt.setName('description').setDescription('説明 (\nで改行) / Description').setRequired(false))
    .addStringOption((opt) => opt.setName('color').setDescription('Hexカラー / Hex color').setRequired(false))
    .addStringOption((opt) => opt.setName('image_url').setDescription('画像URL (Embed内) / Image URL (in Embed)').setRequired(false))
    .addStringOption((opt) => opt.setName('thumbnail_url').setDescription('サムネイルURL (Embed内) / Thumbnail URL (in Embed)').setRequired(false))
    .addAttachmentOption((opt) => 
      opt.setName('file1').setDescription('添付ファイル1 (Embedの下) / Attachment 1').setRequired(false))
    .addAttachmentOption((opt) => 
      opt.setName('file2').setDescription('添付ファイル2 (Embedの下) / Attachment 2').setRequired(false))
    .addAttachmentOption((opt) => 
      opt.setName('file3').setDescription('添付ファイル3 (Embedの下) / Attachment 3').setRequired(false))
    .addAttachmentOption((opt) => 
      opt.setName('file4').setDescription('添付ファイル4 (Embedの下) / Attachment 4').setRequired(false))
    .addAttachmentOption((opt) => 
      opt.setName('file5').setDescription('添付ファイル5 (Embedの下) / Attachment 5').setRequired(false))
    .addAttachmentOption((opt) => 
      opt.setName('file6').setDescription('添付ファイル6 (Embedの下) / Attachment 6').setRequired(false))
    .addAttachmentOption((opt) => 
      opt.setName('file7').setDescription('添付ファイル7 (Embedの下) / Attachment 7').setRequired(false))
    .addAttachmentOption((opt) => 
      opt.setName('file8').setDescription('添付ファイル8 (Embedの下) / Attachment 8').setRequired(false))
    .addAttachmentOption((opt) => 
      opt.setName('file9').setDescription('添付ファイル9 (Embedの下) / Attachment 9').setRequired(false))
    .addAttachmentOption((opt) => 
      opt.setName('file10').setDescription('添付ファイル10 (Embedの下) / Attachment 10').setRequired(false)),
  category: 'ユーティリティ / Utility',
  async execute(interaction) {
    const title = interaction.options.getString('title');
    // \n という文字列を実際の改行コードに変換
    const desc = (interaction.options.getString('description') ?? '').replace(/\\n/g, '\n');
    const colorInput = interaction.options.getString('color') ?? '#5865F2';
    const imageUrl = interaction.options.getString('image_url');
    const thumbnailUrl = interaction.options.getString('thumbnail_url');

    const hex = colorInput.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      const msg = await tGuild(interaction.guild.id, 'message.invalid_color');
      return interaction.reply({ content: msg, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(parseInt(hex, 16))
      .setTitle(title)
      .setDescription(desc);

    if (imageUrl) embed.setImage(imageUrl);
    if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);

    // 10個の添付ファイルを取得
    const files = [];
    for (let i = 1; i <= 10; i++) {
      const file = interaction.options.getAttachment(`file${i}`);
      if (file) {
        files.push(file);
      }
    }

    // 添付ファイルがある場合は、filesプロパティとして渡す（Embedの下に表示される）
    if (files.length > 0) {
      await interaction.channel.send({ embeds: [embed], files });
    } else {
      await interaction.channel.send({ embeds: [embed] });
    }

    const msg = await tGuild(interaction.guild.id, 'message.sent');
    const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
    await interaction.reply({ embeds: [successEmbed], ephemeral: true });
  },
};