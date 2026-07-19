// src/commands/tickets/ticketInteractions.js
const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

async function handleCreate(interaction) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  try {
    const existingTicket = await prisma.ticket.findFirst({
      where: { guildId, ownerId: userId, status: 'OPEN' }
    });

    if (existingTicket) {
      const msg = await tGuild(guildId, 'ticket.already_open');
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      return interaction.editReply({ embeds: [embed] });
    }

    const settings = await prisma.ticketSettings.findUnique({ where: { guildId } });
    const categoryId = settings?.categoryId ?? null;
    const staffRoleId = settings?.staffRoleId ?? null;

    const channelName = `ticket-${interaction.user.username}`;
    
    const permissionOverwrites = [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
    ];

    if (staffRoleId) {
      permissionOverwrites.push({
        id: staffRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      });
    }

    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: permissionOverwrites,
    });

    await prisma.ticket.create({
      data: { guildId, channelId: ticketChannel.id, ownerId: userId }
    });

    const logChannelSetting = await prisma.logChannel.findUnique({
      where: { guildId_type: { guildId, type: 'ticket' } }
    });
    if (logChannelSetting) {
      const channel = interaction.guild.channels.cache.get(logChannelSetting.channelId);
      if (channel) {
        const logTitle = await tGuild(guildId, 'ticket.log_title_created');
        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle(logTitle)
          .addFields(
            { name: 'User', value: `<@${userId}>`, inline: false },
            { name: 'Channel', value: `<#${ticketChannel.id}>`, inline: false }
          )
          .setTimestamp();
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    const createdTitle = await tGuild(guildId, 'ticket.created_title');
    const createdDesc = await tGuild(guildId, 'ticket.created_desc');
    const closeButtonLabel = await tGuild(guildId, 'ticket.button_close');
    
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(createdTitle)
      .setDescription(createdDesc);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_close').setLabel(closeButtonLabel).setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ content: `<@${userId}>${staffRoleId ? ` <@&${staffRoleId}>` : ''}`, embeds: [embed], components: [row] });

    const replyMsg = await tGuild(guildId, 'ticket.created_channel', { channel: ticketChannel.toString() });
    const replyEmbed = new EmbedBuilder().setColor(0x57F287).setDescription(replyMsg);
    await interaction.editReply({ embeds: [replyEmbed] });

  } catch (err) {
    console.error('Ticket Create Error:', err);
    const errorMsg = await tGuild(guildId, 'ticket.create_error');
    if (interaction.deferred) {
      await interaction.editReply({ content: errorMsg }).catch(() => {});
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
    }
  }
}

async function handleClose(interaction) {
  await interaction.deferReply();
  const ticket = await prisma.ticket.findUnique({
    where: { channelId: interaction.channel.id }
  });

  if (!ticket) {
    const msg = await tGuild(interaction.guild.id, 'ticket.channel_not_ticket');
    const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
    return interaction.editReply({ embeds: [embed] });
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'CLOSED', closedAt: new Date(), closedBy: interaction.user.id }
  });

  let transcript = '';
  try {
    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    messages.reverse().forEach(msg => {
      const time = new Date(msg.createdTimestamp).toLocaleString('ja-JP');
      transcript += `[${time}] ${msg.author.tag} (ID: ${msg.author.id}):\n${msg.content}\n\n`;
    });
  } catch (e) {
    transcript = 'Failed to fetch messages.';
  }

  const buffer = Buffer.from(transcript, 'utf-8');
  const attachment = new AttachmentBuilder(buffer, { name: `transcript-${ticket.id}.txt` });

  const logChannelSetting = await prisma.logChannel.findUnique({
    where: { guildId_type: { guildId: interaction.guild.id, type: 'ticket' } }
  });
  if (logChannelSetting) {
    const channel = interaction.guild.channels.cache.get(logChannelSetting.channelId);
    if (channel) {
      const logMsg = await tGuild(interaction.guild.id, 'ticket.log_transcript');
      const logTitle = await tGuild(interaction.guild.id, 'ticket.log_title_closed');
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(logTitle)
        .setDescription(logMsg)
        .addFields(
          { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: false },
          { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: false }
        )
        .setTimestamp();
      
      await channel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
    }
  }

  const closedTitle = await tGuild(ticket.guildId, 'ticket.closed_title');
  const closedDesc = await tGuild(ticket.guildId, 'ticket.closed_desc');
  const embed = new EmbedBuilder().setColor(0xED4245).setTitle(closedTitle).setDescription(closedDesc);
  
  await interaction.editReply({ embeds: [embed] });

  setTimeout(async () => {
    const channel = interaction.guild.channels.cache.get(interaction.channel.id);
    if (channel) await channel.delete().catch(() => {});
  }, 10000);
}

async function route(interaction) {
  if (interaction.customId === 'ticket_create') return handleCreate(interaction);
  if (interaction.customId === 'ticket_close') return handleClose(interaction);
  return null;
}

module.exports = { route };