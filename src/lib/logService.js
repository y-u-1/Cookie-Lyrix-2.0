// src/lib/levelService.js
const { prisma } = require('./database');

const COOLDOWN_MS = 60 * 1000; // 1分間のクールダウン

// レベル計算式: level = floor(0.1 * sqrt(xp))
function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

// 次のレベルに必要なXP
function xpForNextLevel(level) {
  return Math.pow((level + 1) / 0.1, 2);
}

async function addXp(guildId, userId, amount) {
  const now = new Date();
  
  const activity = await prisma.userActivity.upsert({
    where: { guildId_userId: { guildId, userId } },
    update: {},
    create: { guildId, userId, lastXpAt: null },
  });

  // クールダウン判定
  if (activity.lastXpAt && (now - new Date(activity.lastXpAt) < COOLDOWN_MS)) {
    return { leveledUp: false };
  }

  const newXp = activity.xp + amount;
  const oldLevel = activity.level;
  const newLevel = calculateLevel(newXp);

  await prisma.userActivity.update({
    where: { id: activity.id },
    data: {
      xp: newXp,
      level: newLevel,
      lastXpAt: now,
    },
  });

  return { leveledUp: newLevel > oldLevel, newLevel };
}

async function getRank(guildId, userId) {
  const activity = await prisma.userActivity.findUnique({
    where: { guildId_userId: { guildId, userId } }
  });

  if (!activity) return null;

  // 順位計算: 自分よりXPが多いユーザーの数 + 1
  const higherCount = await prisma.userActivity.count({
    where: {
      guildId,
      xp: { gt: activity.xp }
    }
  });

  return {
    ...activity,
    rank: higherCount + 1,
    nextLevelXp: xpForNextLevel(activity.level),
  };
}

async function getTopUsers(guildId, limit = 30) {
  return prisma.userActivity.findMany({
    where: { guildId },
    orderBy: { xp: 'desc' },
    take: limit,
  });
}

module.exports = { addXp, getRank, getTopUsers, calculateLevel, xpForNextLevel };