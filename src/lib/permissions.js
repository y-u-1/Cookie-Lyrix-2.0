// src/lib/permissions.js
const { PermissionFlagsBits } = require('discord.js');
const { prisma } = require('./database');

async function addPermissionRole(guildId, key, roleId) {
  await prisma.commandPermission.upsert({
    where: { guildId_key_roleId: { guildId, key, roleId } },
    update: {},
    create: { guildId, key, roleId },
  });
}

async function removePermissionRole(guildId, key, roleId) {
  await prisma.commandPermission.deleteMany({ where: { guildId, key, roleId } });
}

async function listPermissionRoles(guildId, key) {
  return prisma.commandPermission.findMany({ where: { guildId, key } });
}

// これらのキーはロールを設定してあっても委任を認めず、常に管理者のみ許可する。
// (Giveaway系・modのban/kick/timeoutなど、強い権限を持つコマンド)
const ADMIN_ONLY_KEYS = new Set(['giveaway-create', 'giveaway-manage', 'mod-actions']);

async function hasPermission(member, guildId, key) {
  if (!key || !member) return true; // 権限チェック不要のコマンド(rankingなど)
  
  // サーバー管理者は常に許可
  const isAdmin = member.permissions?.has?.(PermissionFlagsBits.Administrator);
  if (isAdmin) return true;

  // 管理者専用キーはロール委任を無視する
  if (ADMIN_ONLY_KEYS.has(key)) return false;

  const rows = await listPermissionRoles(guildId, key);
  // 【重要】設定されたロールが1つもない場合は「拒否(管理者のみ)」に変更
  if (!rows.length) return false; 
  
  return rows.some((r) => member.roles?.cache?.has(r.roleId));
}

function permissionKeyFor(interaction) {
  const { commandName } = interaction;
  const sub = interaction.options.getSubcommand(false);

  // Giveaway
  if (commandName === 'giveaway') {
    if (sub === 'start') return `${commandName}-create`;
    return `${commandName}-manage`;
  }
  
  // Moderation (管理者のみ許可)
  if (commandName === 'mod') return 'mod-actions';
  if (commandName === 'ticket') return 'tickets';
  if (commandName === 'verify') return 'moderation';
  if (commandName === 'role-panel') return 'moderation';
  if (commandName === 'auto-role') return 'moderation';
  if (commandName === 'welcome') return 'moderation';
  if (commandName === 'message') return 'moderation';
  if (commandName === 'channel-reset') return 'moderation';
  if (commandName === 'earthquake') return 'moderation';
  if (commandName === 'antiraid') return 'moderation';
  if (commandName === 'ngword') return 'moderation';
  if (commandName === 'spam-filter') return 'moderation';
  if (commandName === 'log') return 'log-manage';
  if (commandName === 'tempvc') return 'moderation';
  if (commandName === 'starboard') return 'moderation';
  
  // Poll
  if (commandName === 'poll') return 'poll-manage';
  
  // Leveling & Economy
  if (commandName === 'level') {
    if (sub === 'rank' || sub === 'panel') return null;
    return 'level-manage'; // addxp, reset は管理者のみ
  }
  if (commandName === 'coins') {
    if (sub === 'add' || sub === 'remove' || sub === 'clear') return 'level-manage'; // add, remove, clear は管理者のみ
    return null; // check は誰でも
  }
  if (commandName === 'shop') return null;
  if (commandName === 'daily') return null;
  if (commandName === 'gamble') return null;
  if (commandName === 'redeem') return null;
  if (commandName === 'code') return 'level-manage';
  if (commandName === 'minesweeper') return null;
  if (commandName === 'affinity') return null;
  if (commandName === 'redeem-panel') return 'moderation';

  return null;
}

module.exports = {
  addPermissionRole,
  removePermissionRole,
  listPermissionRoles,
  hasPermission,
  permissionKeyFor,
};