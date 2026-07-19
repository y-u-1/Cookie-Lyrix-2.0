// src/index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { startKeepAlive } = require('./lib/keepAlive');
const { startGiveawayScheduler } = require('./commands/giveaway/giveawayScheduler');
const { startLevelScheduler } = require('./commands/level/levelScheduler');
const { startEarthquakeScheduler } = require('./commands/moderation/earthquakeScheduler');
const logger = require('./lib/logger');

// Global Error Handling
process.on('warning', (warning) => {
  logger.warn(`[${warning.name}] ${warning.message}`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection:', err);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.Reaction, Partials.User],
});

loadCommands(client);
loadEvents(client);

startKeepAlive('Cookie Lyrix 2.0');

client.once('ready', () => {
  startGiveawayScheduler(client);
  startLevelScheduler(client);
  startEarthquakeScheduler(client);
});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  logger.error('Login failed:', err);
  process.exit(1);
});