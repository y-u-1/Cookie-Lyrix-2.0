// src/commands/moderation/verifyInteractions.js
const { EmbedBuilder, MessageFlags } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

async function handleVerify(interaction) {
  // タイムアウト防止
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const panel = await prisma.verifyPanel.findUnique({
    where: { messageId: interaction.message.id }
  });

  if (!panel) {
    const msg = await tGuild(interaction.guild.id, 'verify.panel_not_found');
    return interaction.editReply({ content: msg });
  }

  const member = interaction.member;
  
  if (member.roles.cache.has(panel.roleId)) {
    const msg = await tGuild(interaction.guild.id, 'verify.already_verified');
    const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
    return interaction.editReply({ embeds: [embed] });
  }

  if (panel.minAccountAgeDays > 0) {
    const accountAgeDays = Math.floor((Date.now() - interaction.user.createdTimestamp) / (1000 * 60 * 60 * 24));
    if (accountAgeDays < panel.minAccountAgeDays) {
      const msg = await tGuild(interaction.guild.id, 'verify.account_too_new', { min_age: panel.minAccountAgeDays, account_age: accountAgeDays });
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.editReply({ embeds: [embed] });
    }
  }

  if (panel.blockGuildIds) {
    const blockIds = panel.blockGuildIds.split(',').map(id => id.trim());
    try {
      const user = await interaction.client.users.fetch(interaction.user.id, { force: true });
      const mutualGuilds = interaction.client.guilds.cache.filter(g => g.members.cache.has(user.id));
      
      for (const guild of mutualGuilds.values()) {
        if (blockIds.includes(guild.id)) {
          const msg = await tGuild(interaction.guild.id, 'verify.blocked_guild');
          const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
          return interaction.editReply({ embeds: [embed] });
        }
      }
    } catch (e) {
      console.error('Failed to fetch mutual guilds:', e);
    }
  }

  try {
    await member.roles.add(panel.roleId);
    const msg = await tGuild(interaction.guild.id, 'verify.success', { role: `<@&${panel.roleId}>` });
    const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Role Add Error:', err);
    const msg = await tGuild(interaction.guild.id, 'verify.role_add_failed');
    await interaction.editReply({ content: msg });
  }
}

async function route(interaction) {
  if (interaction.customId === 'verify_button') return handleVerify(interaction);
  return null;
}

module.exports = { route };