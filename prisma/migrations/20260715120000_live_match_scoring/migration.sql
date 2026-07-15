ALTER TYPE "MatchStatus" RENAME VALUE 'FINAL' TO 'FINISHED';
ALTER TYPE "MatchStatus" ADD VALUE 'POSTPONED';
ALTER TYPE "MatchStatus" ADD VALUE 'CANCELLED';

CREATE TYPE "MatchScoreEventActionType" AS ENUM (
  'START_MATCH',
  'FINISH_MATCH',
  'RETURN_TO_SCHEDULED',
  'REOPEN_MATCH',
  'POSTPONE_MATCH',
  'CANCEL_MATCH',
  'INCREMENT_HOME_SCORE',
  'INCREMENT_AWAY_SCORE',
  'DECREMENT_HOME_SCORE',
  'DECREMENT_AWAY_SCORE',
  'SET_SCORE',
  'UNDO_LAST_CHANGE'
);

ALTER TABLE "Match"
ADD COLUMN "liveStartedAt" TIMESTAMP(3),
ADD COLUMN "finishedAt" TIMESTAMP(3),
ADD COLUMN "lastScoreUpdatedAt" TIMESTAMP(3),
ADD COLUMN "lastScoreUpdatedByUserId" TEXT,
ADD COLUMN "scoreVersion" INTEGER NOT NULL DEFAULT 0;

UPDATE "Match"
SET "homeScore" = 0
WHERE "homeScore" IS NULL;

UPDATE "Match"
SET "awayScore" = 0
WHERE "awayScore" IS NULL;

ALTER TABLE "Match"
ALTER COLUMN "homeScore" SET DEFAULT 0,
ALTER COLUMN "homeScore" SET NOT NULL,
ALTER COLUMN "awayScore" SET DEFAULT 0,
ALTER COLUMN "awayScore" SET NOT NULL;

CREATE TABLE "MatchScoreEvent" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "userId" TEXT,
  "actionType" "MatchScoreEventActionType" NOT NULL,
  "previousStatus" "MatchStatus" NOT NULL,
  "nextStatus" "MatchStatus" NOT NULL,
  "previousHomeScore" INTEGER NOT NULL,
  "previousAwayScore" INTEGER NOT NULL,
  "nextHomeScore" INTEGER NOT NULL,
  "nextAwayScore" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MatchScoreEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Match_lastScoreUpdatedByUserId_idx" ON "Match"("lastScoreUpdatedByUserId");
CREATE INDEX "MatchScoreEvent_matchId_createdAt_idx" ON "MatchScoreEvent"("matchId", "createdAt");
CREATE INDEX "MatchScoreEvent_userId_idx" ON "MatchScoreEvent"("userId");

ALTER TABLE "Match"
ADD CONSTRAINT "Match_lastScoreUpdatedByUserId_fkey"
FOREIGN KEY ("lastScoreUpdatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MatchScoreEvent"
ADD CONSTRAINT "MatchScoreEvent_matchId_fkey"
FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchScoreEvent"
ADD CONSTRAINT "MatchScoreEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
