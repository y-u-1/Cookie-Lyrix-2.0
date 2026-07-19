// src/commands/giveaway/giveaway.js
const { buildGiveawayCommand } = require('./giveawayCommandFactory');

module.exports = buildGiveawayCommand({
  name: 'giveaway',
  description: 'ギブアウェイを管理します / Manage giveaways',
});