-- CreateTable
CREATE TABLE "GuildSettings" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ja',
    "welcomeChannelId" TEXT,
    "leaveChannelId" TEXT,
    "autoRoleId" TEXT,
    "earthquakeChannelId" TEXT,
    "earthquakeMinScale" INTEGER NOT NULL DEFAULT 4,
    "antiraidEnabled" BOOLEAN NOT NULL DEFAULT false,
    "antiraidJoinThreshold" INTEGER NOT NULL DEFAULT 8,
    "antiraidJoinWindowSec" INTEGER NOT NULL DEFAULT 10,
    "antiraidMinAccountAgeHours" INTEGER NOT NULL DEFAULT 0,
    "antiraidAction" TEXT NOT NULL DEFAULT 'kick',
    "tempVcChannelId" TEXT,
    "tempVcCategoryId" TEXT,
    "starboardChannelId" TEXT,
    "starboardThreshold" INTEGER NOT NULL DEFAULT 5,
    "aiPersona" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Giveaway" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'NORMAL',
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "prize" TEXT NOT NULL,
    "winnerCount" INTEGER NOT NULL DEFAULT 1,
    "hostId" TEXT NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "color" INTEGER,
    "endColor" INTEGER,
    "requiredRoleId" TEXT,
    "bypassRoleId" TEXT,
    "winnersRoleId" TEXT,
    "requiredLevel" INTEGER,
    "coinPrize" INTEGER,
    "winnersDmMessage" TEXT,
    "winnerIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Giveaway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveawayEntry" (
    "id" TEXT NOT NULL,
    "giveawayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiveawayEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiveawayTemplate" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMs" INTEGER,
    "winnerCount" INTEGER,
    "channelId" TEXT,
    "hostId" TEXT,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "color" INTEGER,
    "endColor" INTEGER,
    "requiredRoleId" TEXT,
    "bypassRoleId" TEXT,
    "winnersRoleId" TEXT,
    "requiredLevel" INTEGER,
    "winnersDmMessage" TEXT,
    "creationMessage" TEXT,
    "coinPrize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiveawayTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandPermission" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "CommandPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPanel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSettings" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "categoryId" TEXT,
    "staffRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifyPanel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "blockGuildIds" TEXT,
    "minAccountAgeDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifyPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePanel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePanelItem" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "style" INTEGER NOT NULL DEFAULT 2,
    "emoji" TEXT,

    CONSTRAINT "RolePanelItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "question" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "multiVote" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warning" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogChannel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "LogChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 3000,
    "lastXpAt" TIMESTAMP(3),
    "lastDailyAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardPanel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'XP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NgWord" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "word" TEXT NOT NULL,

    CONSTRAINT "NgWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateShopListing" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "roleId" TEXT,
    "imageUrl" TEXT,
    "channelId" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateShopListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AntiRaidTracker" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AntiRaidTracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedeemCode" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "coins" INTEGER NOT NULL,
    "customMessage" TEXT,
    "usedById" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedeemCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarboardMessage" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "starboardMsgId" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StarboardMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAffinity" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserAffinity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildSettings_guildId_key" ON "GuildSettings"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Giveaway_shortId_key" ON "Giveaway"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "Giveaway_messageId_key" ON "Giveaway"("messageId");

-- CreateIndex
CREATE INDEX "Giveaway_guildId_idx" ON "Giveaway"("guildId");

-- CreateIndex
CREATE INDEX "Giveaway_status_endsAt_idx" ON "Giveaway"("status", "endsAt");

-- CreateIndex
CREATE INDEX "GiveawayEntry_giveawayId_idx" ON "GiveawayEntry"("giveawayId");

-- CreateIndex
CREATE UNIQUE INDEX "GiveawayEntry_giveawayId_userId_key" ON "GiveawayEntry"("giveawayId", "userId");

-- CreateIndex
CREATE INDEX "GiveawayTemplate_guildId_idx" ON "GiveawayTemplate"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "GiveawayTemplate_guildId_name_key" ON "GiveawayTemplate"("guildId", "name");

-- CreateIndex
CREATE INDEX "CommandPermission_guildId_key_idx" ON "CommandPermission"("guildId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CommandPermission_guildId_key_roleId_key" ON "CommandPermission"("guildId", "key", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketPanel_messageId_key" ON "TicketPanel"("messageId");

-- CreateIndex
CREATE INDEX "TicketPanel_guildId_idx" ON "TicketPanel"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_channelId_key" ON "Ticket"("channelId");

-- CreateIndex
CREATE INDEX "Ticket_guildId_idx" ON "Ticket"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSettings_guildId_key" ON "TicketSettings"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "VerifyPanel_messageId_key" ON "VerifyPanel"("messageId");

-- CreateIndex
CREATE INDEX "VerifyPanel_guildId_idx" ON "VerifyPanel"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePanel_messageId_key" ON "RolePanel"("messageId");

-- CreateIndex
CREATE INDEX "RolePanel_guildId_idx" ON "RolePanel"("guildId");

-- CreateIndex
CREATE INDEX "RolePanelItem_panelId_idx" ON "RolePanelItem"("panelId");

-- CreateIndex
CREATE UNIQUE INDEX "Poll_messageId_key" ON "Poll"("messageId");

-- CreateIndex
CREATE INDEX "Poll_guildId_idx" ON "Poll"("guildId");

-- CreateIndex
CREATE INDEX "PollOption_pollId_idx" ON "PollOption"("pollId");

-- CreateIndex
CREATE INDEX "PollVote_optionId_idx" ON "PollVote"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_optionId_userId_key" ON "PollVote"("optionId", "userId");

-- CreateIndex
CREATE INDEX "Warning_guildId_userId_idx" ON "Warning"("guildId", "userId");

-- CreateIndex
CREATE INDEX "LogChannel_guildId_idx" ON "LogChannel"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "LogChannel_guildId_type_key" ON "LogChannel"("guildId", "type");

-- CreateIndex
CREATE INDEX "UserActivity_guildId_idx" ON "UserActivity"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "UserActivity_guildId_userId_key" ON "UserActivity"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardPanel_messageId_key" ON "LeaderboardPanel"("messageId");

-- CreateIndex
CREATE INDEX "LeaderboardPanel_guildId_idx" ON "LeaderboardPanel"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardPanel_guildId_type_key" ON "LeaderboardPanel"("guildId", "type");

-- CreateIndex
CREATE INDEX "NgWord_guildId_idx" ON "NgWord"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "NgWord_guildId_word_key" ON "NgWord"("guildId", "word");

-- CreateIndex
CREATE INDEX "PrivateShopListing_guildId_idx" ON "PrivateShopListing"("guildId");

-- CreateIndex
CREATE INDEX "PrivateShopListing_guildId_sellerId_idx" ON "PrivateShopListing"("guildId", "sellerId");

-- CreateIndex
CREATE INDEX "AntiRaidTracker_guildId_idx" ON "AntiRaidTracker"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "RedeemCode_code_key" ON "RedeemCode"("code");

-- CreateIndex
CREATE INDEX "RedeemCode_guildId_idx" ON "RedeemCode"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "StarboardMessage_messageId_key" ON "StarboardMessage"("messageId");

-- CreateIndex
CREATE INDEX "StarboardMessage_guildId_idx" ON "StarboardMessage"("guildId");

-- CreateIndex
CREATE INDEX "UserAffinity_guildId_idx" ON "UserAffinity"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAffinity_guildId_userId_targetId_key" ON "UserAffinity"("guildId", "userId", "targetId");

-- AddForeignKey
ALTER TABLE "GiveawayEntry" ADD CONSTRAINT "GiveawayEntry_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePanelItem" ADD CONSTRAINT "RolePanelItem_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "RolePanel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogChannel" ADD CONSTRAINT "LogChannel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildSettings"("guildId") ON DELETE RESTRICT ON UPDATE CASCADE;
