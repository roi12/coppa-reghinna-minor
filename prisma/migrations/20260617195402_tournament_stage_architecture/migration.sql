-- CreateEnum
CREATE TYPE "TournamentStageType" AS ENUM ('GROUP_STAGE', 'KNOCKOUT_STAGE');

-- CreateEnum
CREATE TYPE "KnockoutRound" AS ENUM ('ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL', 'THIRD_PLACE');

-- CreateEnum
CREATE TYPE "MatchParticipantSourceType" AS ENUM ('DIRECT_TEAM', 'GROUP_POSITION', 'MATCH_WINNER', 'MATCH_LOSER');

-- AlterEnum
ALTER TYPE "MatchStatus" ADD VALUE 'LIVE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TournamentFormat" ADD VALUE 'SINGLE_ROUND_ROBIN';
ALTER TYPE "TournamentFormat" ADD VALUE 'DOUBLE_ROUND_ROBIN';
ALTER TYPE "TournamentFormat" ADD VALUE 'GROUPS_ONLY';
ALTER TYPE "TournamentFormat" ADD VALUE 'GROUPS_THEN_KNOCKOUT';
ALTER TYPE "TournamentFormat" ADD VALUE 'KNOCKOUT_ONLY';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "awayParticipantLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "awayParticipantSourceType" "MatchParticipantSourceType",
ADD COLUMN     "awaySourceGroupId" TEXT,
ADD COLUMN     "awaySourceGroupPosition" INTEGER,
ADD COLUMN     "awaySourceMatchId" TEXT,
ADD COLUMN     "awaySourceTeamId" TEXT,
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "homeParticipantLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "homeParticipantSourceType" "MatchParticipantSourceType",
ADD COLUMN     "homeSourceGroupId" TEXT,
ADD COLUMN     "homeSourceGroupPosition" INTEGER,
ADD COLUMN     "homeSourceMatchId" TEXT,
ADD COLUMN     "homeSourceTeamId" TEXT,
ADD COLUMN     "sequence" INTEGER,
ADD COLUMN     "stageId" TEXT,
ALTER COLUMN "homeTeamId" DROP NOT NULL,
ALTER COLUMN "awayTeamId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "expectedTeamCount" INTEGER,
ADD COLUMN     "scheduleMaxMatchesPerDay" INTEGER,
ADD COLUMN     "scheduleMinimumRestDays" INTEGER DEFAULT 0,
ADD COLUMN     "scheduleStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TournamentGroup" ADD COLUMN     "stageId" TEXT;

-- CreateTable
CREATE TABLE "TournamentStage" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "TournamentStageType" NOT NULL,
    "name" TEXT NOT NULL,
    "groupCount" INTEGER,
    "teamsPerGroup" INTEGER,
    "legs" INTEGER,
    "qualifiersPerGroup" INTEGER,
    "knockoutTeamCount" INTEGER,
    "knockoutRound" "KnockoutRound",
    "includeThirdPlaceMatch" BOOLEAN,
    "stageBreakDaysAfter" INTEGER DEFAULT 0,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentScheduleSlot" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentStage_tournamentId_order_idx" ON "TournamentStage"("tournamentId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentStage_tournamentId_order_key" ON "TournamentStage"("tournamentId", "order");

-- CreateIndex
CREATE INDEX "TournamentScheduleSlot_tournamentId_idx" ON "TournamentScheduleSlot"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentScheduleSlot_tournamentId_sequence_key" ON "TournamentScheduleSlot"("tournamentId", "sequence");

-- CreateIndex
CREATE INDEX "Match_stageId_idx" ON "Match"("stageId");

-- CreateIndex
CREATE INDEX "Match_homeTeamId_idx" ON "Match"("homeTeamId");

-- CreateIndex
CREATE INDEX "Match_awayTeamId_idx" ON "Match"("awayTeamId");

-- CreateIndex
CREATE INDEX "Match_homeSourceMatchId_idx" ON "Match"("homeSourceMatchId");

-- CreateIndex
CREATE INDEX "Match_awaySourceMatchId_idx" ON "Match"("awaySourceMatchId");

-- CreateIndex
CREATE INDEX "TournamentGroup_stageId_idx" ON "TournamentGroup"("stageId");

-- AddForeignKey
ALTER TABLE "TournamentStage" ADD CONSTRAINT "TournamentStage_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentGroup" ADD CONSTRAINT "TournamentGroup_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TournamentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentScheduleSlot" ADD CONSTRAINT "TournamentScheduleSlot_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TournamentStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeSourceTeamId_fkey" FOREIGN KEY ("homeSourceTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awaySourceTeamId_fkey" FOREIGN KEY ("awaySourceTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeSourceGroupId_fkey" FOREIGN KEY ("homeSourceGroupId") REFERENCES "TournamentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awaySourceGroupId_fkey" FOREIGN KEY ("awaySourceGroupId") REFERENCES "TournamentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeSourceMatchId_fkey" FOREIGN KEY ("homeSourceMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awaySourceMatchId_fkey" FOREIGN KEY ("awaySourceMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
