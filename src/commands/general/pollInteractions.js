// src/commands/general/pollInteractions.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

async function handleVote(interaction) {
  // 先にACKする(複数回のDB問い合わせが続くため)。
  await interaction.deferReply({ ephemeral: true });

  const optionId = interaction.customId.replace('poll_vote_', '');
  
  const option = await prisma.pollOption.findUnique({
    where: { id: optionId },
    include: { 
      poll: { include: { options: { include: { votes: true } } } } 
    }
  });

  if (!option || option.poll.status !== 'ACTIVE') {
    const msg = await tGuild(interaction.guild.id, 'poll.ended');
    return interaction.editReply({ content: msg });
  }

  // 既存の投票を確認
  const existingVote = await prisma.pollVote.findUnique({
    where: { optionId_userId: { optionId, userId: interaction.user.id } }
  });

  if (existingVote) {
    // 投票を取り消す
    await prisma.pollVote.delete({ where: { id: existingVote.id } });
    const msg = await tGuild(interaction.guild.id, 'poll.vote_removed');
    await interaction.editReply({ content: msg });
  } else {
    // 新規投票
    await prisma.pollVote.create({
      data: { optionId, userId: interaction.user.id }
    });
    const msg = await tGuild(interaction.guild.id, 'poll.voted', { option: option.label });
    await interaction.editReply({ content: msg });
  }

  // ボタンのラベル（票数）を更新
  const rows = [];
  let currentRow = new ActionRowBuilder();
  
  option.poll.options.forEach((opt, index) => {
    if (index > 0 && index % 5 === 0) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`poll_vote_${opt.id}`)
        .setLabel(`${opt.label} (${opt.votes.length})`)
        .setStyle(ButtonStyle.Primary)
    );
  });
  rows.push(currentRow);

  await interaction.message.edit({ components: rows }).catch(() => {});
}

async function route(interaction) {
  if (interaction.customId.startsWith('poll_vote_')) return handleVote(interaction);
  return null;
}

module.exports = { route };