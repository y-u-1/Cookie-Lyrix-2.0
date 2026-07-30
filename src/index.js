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
const { startEarthquakeWatcher } = require('./commands/moderation/earthquakeWatcher');
const { startTicketScheduler } = require('./commands/tickets/ticketScheduler');
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

// DEBUG_DISCORD=1 を設定した時だけ詳細ログを出す(常時有効だと大量のログでエラーが埋もれるため)
if (process.env.DEBUG_DISCORD === '1') {
  client.on('debug', (info) => {
    console.log(`[DISCORD DEBUG] ${info}`);
  });
}

client.on('error', (error) => {
  console.error(`[DISCORD ERROR] ${error}`);
});

startKeepAlive('Cookie Lyrix 2.0');

// 重要: discord.js v14.17以降、'ready'イベントは廃止され'clientReady'のみが発火する。
// 'ready'のままだと、ここで登録している4つのスケジューラ(giveaway/level/earthquake/ticket)が
// 一切起動しないまま気づかれずに動いてしまう(実際にこのバグが発生していた)。
client.once('clientReady', () => {
  startGiveawayScheduler(client);
  startLevelScheduler(client);
  startEarthquakeWatcher(client);
  startTicketScheduler(client);
});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  logger.error('Login failed:', err);
  process.exit(1);
});