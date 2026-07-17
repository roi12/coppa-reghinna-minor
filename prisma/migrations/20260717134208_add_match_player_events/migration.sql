-- CreateEnum
CREATE TYPE "MatchPlayerEventType" AS ENUM ('GOAL', 'OWN_GOAL', 'YELLOW_CARD', 'RED_CARD');

-- CreateTable
CREATE TABLE "MatchPlayerEvent" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "awardedTeamId" TEXT,
    "playerId" TEXT,
    "type" "MatchPlayerEventType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "matchMinute" INTEGER,
    "playerDisplayNameSnapshot" TEXT,
    "playerJerseyNumberSnapshot" TEXT,
    "teamNameSnapshot" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchPlayerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchPlayerEvent_tournamentId_type_voidedAt_idx" ON "MatchPlayerEvent"("tournamentId", "type", "voidedAt");

-- CreateIndex
CREATE INDEX "MatchPlayerEvent_playerId_type_voidedAt_idx" ON "MatchPlayerEvent"("playerId", "type", "voidedAt");

-- CreateIndex
CREATE INDEX "MatchPlayerEvent_teamId_type_voidedAt_idx" ON "MatchPlayerEvent"("teamId", "type", "voidedAt");

-- CreateIndex
CREATE INDEX "MatchPlayerEvent_awardedTeamId_type_voidedAt_idx" ON "MatchPlayerEvent"("awardedTeamId", "type", "voidedAt");

-- CreateIndex
CREATE INDEX "MatchPlayerEvent_createdByUserId_idx" ON "MatchPlayerEvent"("createdByUserId");

-- CreateIndex
CREATE INDEX "MatchPlayerEvent_updatedByUserId_idx" ON "MatchPlayerEvent"("updatedByUserId");

-- CreateIndex
CREATE INDEX "MatchPlayerEvent_voidedByUserId_idx" ON "MatchPlayerEvent"("voidedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlayerEvent_matchId_sequence_key" ON "MatchPlayerEvent"("matchId", "sequence");

-- AddForeignKey
ALTER TABLE "MatchPlayerEvent" ADD CONSTRAINT "MatchPlayerEvent_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerEvent" ADD CONSTRAINT "MatchPlayerEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerEvent" ADD CONSTRAINT "MatchPlayerEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerEvent" ADD CONSTRAINT "MatchPlayerEvent_awardedTeamId_fkey" FOREIGN KEY ("awardedTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerEvent" ADD CONSTRAINT "MatchPlayerEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerEvent" ADD CONSTRAINT "MatchPlayerEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerEvent" ADD CONSTRAINT "MatchPlayerEvent_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerEvent" ADD CONSTRAINT "MatchPlayerEvent_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
