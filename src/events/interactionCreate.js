// src/events/interactionCreate.js
const logger = require('../lib/logger');
const { route: giveawayRoute } = require('../commands/giveaway/giveawayInteractions');
const { route: ticketRoute } = require('../commands/tickets/ticketInteractions');
const { route: verifyRoute } = require('../commands/moderation/verifyInteractions');
const { route: roleRoute } = require('../commands/moderation/roleInteractions');
const { route: pollRoute } = require('../commands/general/pollInteractions');
const { route: levelRoute } = require('../commands/level/levelInteractions');
const { route: economyRoute } = require('../commands/economy/economyInteractions');
const { handleOpenModal: redeemOpenModal, handleSubmit: redeemSubmit } = require('../commands/economy/redeem');
const { permissionKeyFor, hasPermission } = require('../lib/permissions');
const { tGuild } = require('../lib/i18n');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // ボタンとモーダルの処理
    if (interaction.isButton() || interaction.isModalSubmit()) {
      try {
        if (interaction.customId.startsWith('giveaway_')) await giveawayRoute(interaction);
        else if (interaction.customId.startsWith('ticket_')) await ticketRoute(interaction);
        else if (interaction.customId.startsWith('verify_')) await verifyRoute(interaction);
        else if (interaction.customId.startsWith('role_')) await roleRoute(interaction);
        else if (interaction.customId.startsWith('poll_vote_')) await pollRoute(interaction);
        else if (interaction.customId.startsWith('level_page_')) await levelRoute(interaction);
        else if (interaction.customId.startsWith('coin_page_')) await economyRoute(interaction);
        else if (interaction.customId === 'redeem_open_modal') await redeemOpenModal(interaction);
        else if (interaction.customId === 'redeem_submit') await redeemSubmit(interaction);
        else if (interaction.customId === 'role_panel_modal') await roleRoute(interaction);
      } catch (err) {
        logger.error('Interaction error:', err);
        const errorMsg = 'An error occurred.';
        try {
          if (interaction.deferred) {
            await interaction.editReply({ content: errorMsg });
          } else if (!interaction.replied) {
            await interaction.reply({ content: errorMsg, ephemeral: true });
          }
        } catch (e) {}
      }
      return;
    }

    // スラッシュコマンドの処理
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      const permKey = permissionKeyFor(interaction);
      const hasPerm = await hasPermission(interaction.member, interaction.guildId, permKey);
      
      if (!hasPerm) {
        const msg = await tGuild(interaction.guildId, 'no_permission');
        return interaction.reply({ content: msg, ephemeral: true });
      }

      await command.execute(interaction);
    } catch (error) {
      logger.error(`Command execution error (${interaction.commandName}):`, error);
      const errorMsg = 'An error occurred during command execution.';
      try {
        if (interaction.deferred) {
          await interaction.editReply({ content: errorMsg });
        } else if (interaction.replied) {
          await interaction.followUp({ content: errorMsg, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMsg, ephemeral: true });
        }
      } catch (e) {}
    }
  },
};