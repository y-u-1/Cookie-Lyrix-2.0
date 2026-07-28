// src/lib/levelRoleService.js
const { prisma } = require('./database');

/**
 * ギルドのレベル報酬ロール設定を1件追加/更新する。
 */
async function setLevelRole(guildId, level, roleId) {
  return prisma.levelRole.upsert({
    where: { guildId_level: { guildId, level } },
    update: { roleId },
    create: { guildId, level, roleId },
  });
}

/**
 * 指定レベルの報酬ロール設定を削除する。
 */
async function removeLevelRole(guildId, level) {
  return prisma.levelRole.deleteMany({ where: { guildId, level } });
}

/**
 * ギルドの全レベル報酬ロール設定をレベル昇順で取得する。
 */
async function listLevelRoles(guildId) {
  return prisma.levelRole.findMany({ where: { guildId }, orderBy: { level: 'asc' } });
}

/**
 * レベルアップ時(または一度に複数レベル上昇した場合)に、
 * 新しく到達した全てのマイルストーンのロールをまとめて付与する。
 * すでに保持しているロールはスキップし、Discord APIへの不要な呼び出しを避ける。
 *
 * @param {import('discord.js').GuildMember} member
 * @param {number} newLevel 更新後のレベル
 * @returns {Promise<string[]>} 新しく付与されたロールIDの配列
 */
async function applyLevelRoles(member, newLevel) {
  if (!member || !member.guild) return [];

  const levelRoles = await prisma.levelRole.findMany({
    where: { guildId: member.guild.id, level: { lte: newLevel } },
  });

  if (levelRoles.length === 0) return [];

  const grantedRoleIds = [];

  for (const lr of levelRoles) {
    if (member.roles.cache.has(lr.roleId)) continue;
    const success = await member.roles.add(lr.roleId).then(() => true).catch(() => false);
    if (success) grantedRoleIds.push(lr.roleId);
  }

  return grantedRoleIds;
}

module.exports = { setLevelRole, removeLevelRole, listLevelRoles, applyLevelRoles };
