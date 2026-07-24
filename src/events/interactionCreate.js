// src/events/interactionCreate.js
const logger = require('../lib/logger');
const { route: giveawayRoute } = require('../commands/giveaway/giveawayInteractions');
const { route: ticketRoute } = require('../commands/tickets/ticketInteractions');
const { route: verifyRoute } = require('../commands/moderation/verifyInteractions');
const { route: roleRoute } = require('../commands/moderation/roleInteractions');
const { route: pollRoute } = require('../commands/general/pollInteractions');
const { route: levelRoute } = require('../commands/level/levelInteractions');
const { route: economyRoute } = require('../commands/economy/economyInteractions');
const { route: affinityRoute } = require('../commands/general/affinityInteractions');
const { route: minesweeperRoute } = require('../commands/games/minesweeperInteractions');
const { handleOpenModal: redeemOpenModal, handleSubmit: redeemSubmit } = require('../commands/economy/redeem');
const { permissionKeyFor, hasPermission } = require('../lib/permissions');
const { tGuild } = require('../lib/i18n');

async function safeReply(interaction, content, ephemeral = true) {
  try {
    if (interaction.deferred) {
      if (interaction.replied) {
        await interaction.followUp({ content, ephemeral });
      } else {
        await interaction.editReply({ content });
      }
    } else if (!interaction.replied) {
      await interaction.reply({ content, ephemeral });
    }
  } catch (e) {
    console.error('SafeReply Error:', e);
  }
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // ボタンとモーダルの処理
    // 【重要】ここで一律にdeferReplyすると、各ハンドラが個別に行うdeferReplyと二重になったり、
    // showModal()(Redeemの引き換えボタン・ロール追加ボタンなど)がdeferReply後には呼べず
    // 必ずエラーになる。ACK(defer/reply/showModal)は各ハンドラの責任で行う。
    if (interaction.isButton() || interaction.isModalSubmit()) {
      try {
        if (interaction.customId.startsWith('giveaway_')) await giveawayRoute(interaction);
        else if (interaction.customId.startsWith('ticket_')) await ticketRoute(interaction);
        else if (interaction.customId.startsWith('verify_')) await verifyRoute(interaction);
        else if (interaction.customId.startsWith('role_')) await roleRoute(interaction);
        else if (interaction.customId.startsWith('poll_vote_')) await pollRoute(interaction);
        else if (interaction.customId.startsWith('level_page_')) await levelRoute(interaction);
        else if (interaction.customId.startsWith('coin_page_')) await economyRoute(interaction);
        else if (interaction.customId.startsWith('affinity_page_')) await affinityRoute(interaction);
        else if (interaction.customId.startsWith('mine_')) await minesweeperRoute(interaction);
        else if (interaction.customId === 'redeem_open_modal') await redeemOpenModal(interaction);
        else if (interaction.customId === 'redeem_submit') await redeemSubmit(interaction);
        else if (interaction.customId === 'role_panel_modal') await roleRoute(interaction);
      } catch (err) {
        console.error(`[ERROR] Interaction error (${interaction.customId}):`, err);
        await safeReply(interaction, '処理中にエラーが発生しました。');
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
      console.error(`[ERROR] Command execution error (${interaction.commandName}):`, error);
      await safeReply(interaction, 'コマンドの実行中にエラーが発生しました。');
    }
  },
};