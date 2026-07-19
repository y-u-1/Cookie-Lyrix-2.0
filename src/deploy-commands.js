// src/deploy-commands.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const logger = require('./lib/logger');

const commands = [];
const commandSources = []; // 追加:どのファイルから来たか記録

const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
  const categories = fs.readdirSync(commandsPath);
  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const command = require(path.join(categoryPath, file));
      if (command?.data) {
        const json = command.data.toJSON();
        commands.push(json);
        commandSources.push({ name: json.name, file: `${category}/${file}` });
      }
    }
  }
}

// ==== ここから重複チェック用のデバッグ出力 ====
const nameMap = {};
for (const { name, file } of commandSources) {
  if (!nameMap[name]) nameMap[name] = [];
  nameMap[name].push(file);
}
const dupes = Object.entries(nameMap).filter(([, files]) => files.length > 1);
if (dupes.length) {
  console.log('=== 重複しているコマンド名とそのファイル ===');
  for (const [name, files] of dupes) {
    console.log(`  "${name}" が以下のファイルで重複:`);
    files.forEach((f) => console.log(`    - ${f}`));
  }
} else {
  console.log('名前の重複は検出されませんでした(別原因の可能性あり)');
}
// ==== デバッグ出力ここまで ====

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    logger.info(`Registering ${commands.length} slash commands...`);
    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);

    await rest.put(route, { body: commands });
    logger.success('Slash commands registered successfully.');
  } catch (err) {
    logger.error('Failed to register slash commands:', err);
  } finally {
    setTimeout(() => {
      process.exit(0);
    }, 500);
  }
})();