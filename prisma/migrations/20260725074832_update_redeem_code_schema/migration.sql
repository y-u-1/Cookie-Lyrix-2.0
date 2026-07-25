/*
  Warnings:

  - You are about to drop the column `usedAt` on the `RedeemCode` table. All the data in the column will be lost.
  - You are about to drop the column `usedById` on the `RedeemCode` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Giveaway" ALTER COLUMN "coinPrize" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "GiveawayTemplate" ALTER COLUMN "coinPrize" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "GuildSettings" ADD COLUMN     "floodThreshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "floodWindowSec" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "PrivateShopListing" ALTER COLUMN "price" SET DATA TYPE BIGINT,
ALTER COLUMN "quantity" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "RedeemCode" DROP COLUMN "usedAt",
DROP COLUMN "usedById",
ADD COLUMN     "dmMessage" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "maxUses" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "roleId" TEXT,
ADD COLUMN     "uses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xp" BIGINT;

-- AlterTable
ALTER TABLE "UserActivity" ALTER COLUMN "xp" SET DATA TYPE BIGINT,
ALTER COLUMN "coins" SET DATA TYPE BIGINT;

-- CreateTable
CREATE TABLE "RedeemCodeUsage" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RedeemCodeUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RedeemCodeUsage_codeId_idx" ON "RedeemCodeUsage"("codeId");

-- CreateIndex
CREATE UNIQUE INDEX "RedeemCodeUsage_codeId_userId_key" ON "RedeemCodeUsage"("codeId", "userId");

-- AddForeignKey
ALTER TABLE "RedeemCodeUsage" ADD CONSTRAINT "RedeemCodeUsage_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "RedeemCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
