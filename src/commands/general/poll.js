// src/commands/general/poll.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('アンケートを作成します / Create a poll')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('アンケートを作成 / Create a poll')
        .addStringOption((opt) => opt.setName('question').setDescription('質問 / Question').setRequired(true))
        .addStringOption((opt) => opt.setName('option1').setDescription('選択肢1 / Option 1').setRequired(true))
        .addStringOption((opt) => opt.setName('option2').setDescription('選択肢2 / Option 2').setRequired(true))
        .addStringOption((opt) => opt.setName('option3').setDescription('選択肢3 / Option 3').setRequired(false))
        .addStringOption((opt) => opt.setName('option4').setDescription('選択肢4 / Option 4').setRequired(false))
        .addStringOption((opt) => opt.setName('option5').setDescription('選択肢5 / Option 5').setRequired(false))
    ),
  category: '一般 / General',
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'create') {
      const question = interaction.options.getString('question');
      const options = [];
      for (let i = 1; i <= 5; i++) {
        const opt = interaction.options.getString(`option${i}`);
        if (opt) options.push(opt);
      }

      if (options.length < 2) {
        const msg = await tGuild(interaction.guild.id, 'poll.error.too_few_options');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      if (options.length > 5) {
        const msg = await tGuild(interaction.guild.id, 'poll.error.too_many_options');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      // DBにアンケートデータを保存
      const poll = await prisma.poll.create({
        data: {
          guildId: interaction.guild.id,
          channelId: interaction.channel.id,
          question,
          hostId: interaction.user.id,
          options: {
            create: options.map(label => ({ label }))
          }
        },
        include: { options: true }
      });

      // Embedの作成
      const hostText = await tGuild(interaction.guild.id, 'poll.hosted_by');
      const pollDesc = await tGuild(interaction.guild.id, 'poll.desc'); // ここで言語対応した説明文を取得
      
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📊 ${question}`)
        .setDescription(pollDesc) // 固定テキストから変数に変更
        .setFooter({ text: `${hostText}: ${interaction.user.tag}` })
        .setTimestamp();

      // ボタンの作成
      const rows = [];
      let currentRow = new ActionRowBuilder();
      
      poll.options.forEach((option, index) => {
        if (index > 0 && index % 5 === 0) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll_vote_${option.id}`)
            .setLabel(`${option.label} (0)`)
            .setStyle(ButtonStyle.Primary)
        );
      });
      rows.push(currentRow);

      const panelMessage = await interaction.channel.send({ embeds: [embed], components: rows });
      
      await prisma.poll.update({
        where: { id: poll.id },
        data: { messageId: panelMessage.id }
      });

      // コマンド実行者への返信もEmbed化
      const successMsg = await tGuild(interaction.guild.id, 'poll.created');
      const successEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(successMsg);
      await interaction.editReply({ embeds: [successEmbed] });
    }
  },
};