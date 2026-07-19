const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function executeWithRetry(prismaOperation, retries = 3) {
  try {
    return await prismaOperation();
  } catch (error) {
    if (retries > 0 && (error.code === 'P1001' || error.message.includes('Connection timed out'))) {
      console.warn(`[DB] 接続エラー発生。リトライします... (残り: ${retries})`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return executeWithRetry(prismaOperation, retries - 1);
    }
    throw error;
  }
}

// Neon(サーバーレスPostgres)の接続スリープ明けなど、一時的な接続エラーに対して
// 全クエリへ自動的にリトライを適用する(以前はexecuteWithRetryが定義されているだけで
// どこからも呼び出されておらず機能していなかった)。
prisma.$use((params, next) => {
  return executeWithRetry(() => next(params));
});

module.exports = { prisma, executeWithRetry };