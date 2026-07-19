// src/commands/giveaway/giveawayScheduler.js
const { prisma } = require('../../lib/database');
const logger = require('../../lib/logger');
const { endGiveaway } = require('./giveawayService');

const CHECK_INTERVAL_MS = 10000;

function startGiveawayScheduler(client) {
  setInterval(async () => {
    try {
      const expired = await prisma.giveaway.findMany({
        where: { status: 'ACTIVE', endsAt: { lte: new Date() } },
      });
      for (const giveaway of expired) {
        await endGiveaway(client, giveaway.id).catch((err) => {
          logger.error(`Giveaway auto-end error (${giveaway.shortId}):`, err);
        });
      }
    } catch (err) {
      logger.error('Giveaway scheduler error:', err);
    }
  }, CHECK_INTERVAL_MS);

  logger.success('Giveaway scheduler started.');
}

module.exports = { startGiveawayScheduler };