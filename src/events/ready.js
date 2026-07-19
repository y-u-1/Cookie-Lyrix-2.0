// src/events/ready.js
const logger = require('../lib/logger');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    logger.success(`Logged in as ${client.user.tag}`);
    logger.info(`Connected to ${client.guilds.cache.size} servers | Serving ${client.users.cache.size} users`);
    client.user.setActivity('/help | Cookie Lyrix 2.0', { type: 'PLAYING' });
  },
};