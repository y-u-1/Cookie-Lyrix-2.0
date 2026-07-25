// src/commands/general/message.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { tGuild } = require('../../lib/i18n');

const MAX_ATTACHMENTS = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('message')
    .setDescription('Botとしてメッセージを送信します / Send a message as the bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => {
      sub
        .setName('send')
        .setDescription('指定チャンネルにEmbedメッセージを送信する')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('送信先チャンネル / Target channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('content').setDescription('本文 (\\n で改行) / Content').setRequired(true)
        )
        .addStringOption((opt) => opt.setName('title').setDescription('タイトル(任意) / Title').setRequired(false))
        .addStringOption((opt) =>
          opt.setName('color').setDescription('Embedの色 (例: #D97757) / Hex color').setRequired(false)
        );

      for (let i = 1; i <= MAX_ATTACHMENTS; i++) {
        sub.addAttachmentOption((opt) =>
          opt.setName(`attachment${i}`).setDescription(`添付ファイル ${i} / Attachment ${i}`).setRequired(false)
        );
      }

      return sub;
    }),
  category: 'ユーティリティ / Utility',
  async execute(interaction) {
    if (interaction.options.getSubcommand() !== 'send') return;

    const channel = interaction.options.getChannel('channel');
    const rawContent = interaction.options.getString('content');
    const content = rawContent.replaceAll('\\n', '\n');
    const title = interaction.options.getString('title');
    const colorInput = interaction.options.getString('color');

    await interaction.deferReply({ ephemeral: true });

    try {
      const embed = new EmbedBuilder()
        .setDescription(content)
        .setColor(parseColor(colorInput) ?? 0x5865F2);

      if (title) embed.setTitle(title);

      const files = [];
      const attachmentNames = [];
      
      for (let i = 1; i <= MAX_ATTACHMENTS; i++) {
        const attachment = interaction.options.getAttachment(`attachment${i}`);
        if (attachment) {
          files.push(new AttachmentBuilder(attachment.url, { name: attachment.name }));
          attachmentNames.push(attachment.name);
        }
      }

      // 添付ファイルがある場合は、Embedの下に表示されるようにメッセージを送信
      if (files.length > 0) {
        // 本文の末尾に添付ファイルのリンクを追加して、本文の下に画像が表示されるようにする
        let newContent = content;
        for (const name of attachmentNames) {
          newContent += `\nattachment://${name}`;
        }
        embed.setDescription(newContent);
        
        await channel.send({ embeds: [embed], files });
      } else {
        await channel.send({ embeds: [embed] });
      }

      const msg = await tGuild(interaction.guild.id, 'message.sent');
      const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      console.error('Message command error:', error);
      const errorMsg = await tGuild(interaction.guild.id, 'message.error');
      const errorEmbed = new EmbedBuilder().setColor(0xED4245).setDescription(errorMsg);
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};

function parseColor(colorString) {
  if (!colorString) return null;
  const hex = colorString.replace('#', '');
  const parsed = parseInt(hex, 16);
  return Number.isNaN(parsed) ? null : parsed;
}