// src/handlers/commandHandler.js
const fs = require('fs');
const path = require('path');
const logger = require('../lib/logger');

function loadCommands(client) {
  client.commands = new Map();
  const commandsPath = path.join(__dirname, '..', 'commands');
  
  if (!fs.existsSync(commandsPath)) return;

  const categories = fs.readdirSync(commandsPath);
  
  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const command = require(path.join(categoryPath, file));
      if (command?.data && command?.execute) {
        command.category = category; // カテゴリ情報を付与
        client.commands.set(command.data.name, command);
        logger.info(`Command Loaded: ${category}/${file}`);
      } else {
        logger.warn(`Command Skipped: ${category}/${file} (Missing data or execute)`);
      }
    }
  }
}

module.exports = { loadCommands };