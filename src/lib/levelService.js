// src/lib/levelService.js
const { prisma } = require('./database');

function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(Number(xp)));
}

function xpForNextLevel(level) {
  return Math.pow((level + 1) / 0.1, 2);
}

async function addXp(guildId, userId, amount) {
  const activity = await prisma.userActivity.upsert({
    where: { guildId_userId: { guildId, userId } },
    update: {},
    create: { guildId, userId, coins: 3000n },
  });

  const newXp = activity.xp + BigInt(amount);
  const oldLevel = activity.level;
  const newLevel = calculateLevel(newXp);

  await prisma.userActivity.update({
    where: { id: activity.id },
    data: {
      xp: newXp,
      level: newLevel,
    },
  });

  return { leveledUp: newLevel > oldLevel, oldLevel, newLevel };
}

async function getRank(guildId, userId) {
  const activity = await prisma.userActivity.findUnique({
    where: { guildId_userId: { guildId, userId } }
  });

  if (!activity) return null;

  const higherCount = await prisma.userActivity.count({
    where: { guildId, xp: { gt: activity.xp } }
  });

  return {
    ...activity,
    rank: higherCount + 1,
    nextLevelXp: xpForNextLevel(activity.level),
  };
}

async function getTopUsers(guildId, limit = 30, skip = 0) {
  return prisma.userActivity.findMany({
    where: { guildId },
    orderBy: { xp: 'desc' },
    skip: skip,
    take: limit,
  });
}

async function addCoins(guildId, userId, amount) {
  const activity = await prisma.userActivity.upsert({
    where: { guildId_userId: { guildId, userId } },
    update: { coins: { increment: BigInt(amount) } },
    create: { guildId, userId, coins: 3000n + BigInt(amount) },
  });
  return activity.coins;
}

async function removeCoins(guildId, userId, amount) {
  const removeAmount = BigInt(amount);

  // 残高が足りる場合は、確認と減算を1つの原子的クエリで行う。
  // (以前は「読み取り→判定→更新」の3段階に分かれており、
  //  同時に複数回呼び出すと残高以上に引き落とせてしまう競合状態があった)
  const sufficientUpdate = await prisma.userActivity.updateMany({
    where: { guildId, userId, coins: { gte: removeAmount } },
    data: { coins: { decrement: removeAmount } },
  });

  if (sufficientUpdate.count > 0) {
    const activity = await prisma.userActivity.findUnique({ where: { guildId_userId: { guildId, userId } } });
    return activity ? activity.coins : 0n;
  }

  // 残高不足の場合は0にクランプする(元の挙動を維持)。
  const activity = await prisma.userActivity.upsert({
    where: { guildId_userId: { guildId, userId } },
    update: { coins: 0n },
    create: { guildId, userId, coins: 0n },
  });
  return activity.coins;
}

async function getCoins(guildId, userId) {
  const activity = await prisma.userActivity.findUnique({
    where: { guildId_userId: { guildId, userId } }
  });
  return activity?.coins ?? 0n;
}

async function getTopUsersByCoins(guildId, limit = 30, skip = 0) {
  return prisma.userActivity.findMany({
    where: { guildId },
    orderBy: { coins: 'desc' },
    skip: skip,
    take: limit,
  });
}

async function getTopAffinity(guildId, limit = 30, skip = 0) {
  return prisma.userAffinity.findMany({
    where: { guildId },
    orderBy: { points: 'desc' },
    skip: skip,
    take: limit,
  });
}

module.exports = { addXp, getRank, getTopUsers, calculateLevel, xpForNextLevel, addCoins, removeCoins, getCoins, getTopUsersByCoins, getTopAffinity };