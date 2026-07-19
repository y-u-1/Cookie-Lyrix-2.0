// src/commands/tickets/ticketScheduler.js
const { prisma } = require('../../lib/database');
const logger = require('../../lib/logger');

const CHECK_INTERVAL_MS = 15 * 1000; // 15秒ごとにチェック
const DELETE_DELAY_MS = 10 * 1000; // クローズしてから10秒後に削除

function startTicketScheduler(client) {
  setInterval(async () => {
    try {
      const dueTickets = await prisma.ticket.findMany({
        where: {
          status: 'CLOSED',
          closedAt: { lte: new Date(Date.now() - DELETE_DELAY_MS) },
        },
      });

      for (const ticket of dueTickets) {
        try {
          const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
          if (channel) await channel.delete('Ticket closed').catch(() => {});
        } finally {
          // チャンネルの有無に関わらず、処理済みとしてDBから削除する。
          // (Bot再起動でsetTimeoutが消えても、次のチェックで必ず拾われるようにするため)
          await prisma.ticket.delete({ where: { id: ticket.id } }).catch(() => {});
        }
      }
    } catch (err) {
      logger.error('Ticket scheduler error:', err);
    }
  }, CHECK_INTERVAL_MS);

  logger.success('Ticket scheduler started.');
}

module.exports = { startTicketScheduler };
