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

// メモリ使用量の監視
setInterval(() => {
  const memory = process.memoryUsage();
  const usedMB = Math.round(memory.rss / 1024 / 1024);
  logger.info(`[Memory Usage] RSS: ${usedMB} MB / 512 MB`);
  
  // メモリ使用量が400MBを超えたら警告
  if (usedMB > 400) {
    logger.warn('[Memory Warning] メモリ使用量が400MBを超えました！クラッシュの危険があります。');
  }
}, 60000); // 1分ごと

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

client.on('debug', (info) => {
  console.log(`[DISCORD DEBUG] ${info}`);
});

client.on('error', (error) => {
  console.error(`[DISCORD ERROR] ${error}`);
});

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