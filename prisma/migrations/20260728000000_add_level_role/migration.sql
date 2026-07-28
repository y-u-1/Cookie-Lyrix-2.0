-- CreateTable
CREATE TABLE "LevelRole" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevelRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LevelRole_guildId_idx" ON "LevelRole"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "LevelRole_guildId_level_key" ON "LevelRole"("guildId", "level");
