// src/clear-commands.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const logger = require('./lib/logger');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    logger.info('Clearing all slash commands...');

    // ギルドコマンドをクリア
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] });
      logger.success('Cleared guild commands.');
    }

    // グローバルコマンドをクリア
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    logger.success('Cleared global commands.');

  } catch (err) {
    logger.error('Failed to clear slash commands:', err);
  } finally {
    setTimeout(() => process.exit(0), 1000);
  }
})();