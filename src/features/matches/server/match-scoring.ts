import {
  MatchScoreEventActionType,
  MatchStatus,
  type Prisma,
} from "@prisma/client";

import { publishTournamentMatchUpdate } from "@/features/matches/server/match-live-updates";
import {
  assertSafeToReopen,
  buildNextState,
  MatchScoringAction,
  MatchScoringError,
  type MatchForScoring,
  type NextState,
} from "@/features/matches/server/match-scoring-state";
import { getMatchParticipantValidationError } from "@/features/matches/server/match-result-guards";
import { revalidateTournamentPaths } from "@/features/tournaments/server/revalidate-tournament-paths";
import { resolveTournamentKnockoutParticipants } from "@/features/tournaments/server/resolve-tournament-knockout-participants";
import { prisma } from "@/lib/prisma";

export type ApplyMatchScoringActionInput = {
  matchId: string;
  action: MatchScoringAction;
  expectedScoreVersion: number;
  homeScore?: number;
  awayScore?: number;
  confirmReopen?: boolean;
  userId?: string | null;
};

export type MatchScoringResult = {
  matchId: string;
  tournamentId: string;
  tournamentSlug: string;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  scoreVersion: number;
  lastScoreUpdatedAt: Date | null;
};

async function loadUndoState(
  transaction: Prisma.TransactionClient,
  matchId: string,
) {
  const latestEvent = await transaction.matchScoreEvent.findFirst({
    where: { matchId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  if (!latestEvent) {
    throw new MatchScoringError("No score change is available to undo.", "NO_UNDO_EVENT");
  }

  return {
    status: latestEvent.previousStatus,
    homeScore: latestEvent.previousHomeScore,
    awayScore: latestEvent.previousAwayScore,
    actionType: MatchScoreEventActionType.UNDO_LAST_CHANGE,
  };
}

function assertUndoParticipantsResolved(match: Pick<MatchForScoring, "homeTeamId" | "awayTeamId">) {
  const validationError = getMatchParticipantValidationError(match);

  if (validationError) {
    throw new MatchScoringError(validationError, "INVALID_TRANSITION");
  }
}

export async function applyMatchScoringAction(
  input: ApplyMatchScoringActionInput,
): Promise<MatchScoringResult> {
  const now = new Date();

  const result = await prisma.$transaction(async (transaction) => {
    const match = await transaction.match.findUnique({
      where: { id: input.matchId },
      select: {
        id: true,
        tournamentId: true,
        homeTeamId: true,
        awayTeamId: true,
        status: true,
        homeScore: true,
        awayScore: true,
        startsAt: true,
        endsAt: true,
        liveStartedAt: true,
        finishedAt: true,
        lastScoreUpdatedAt: true,
        scoreVersion: true,
        stage: {
          select: {
            type: true,
          },
        },
        tournament: {
          select: {
            slug: true,
          },
        },
        dependentHomeMatches: {
          select: {
            id: true,
            status: true,
            homeTeamId: true,
            awayTeamId: true,
          },
        },
        dependentAwayMatches: {
          select: {
            id: true,
            status: true,
            homeTeamId: true,
            awayTeamId: true,
          },
        },
      },
    });

    if (!match) {
      throw new MatchScoringError("Match not found.", "MATCH_NOT_FOUND");
    }

    if (match.status === MatchStatus.CANCELLED && input.action !== "undo") {
      throw new MatchScoringError("Cancelled matches cannot be scored.", "INVALID_TRANSITION");
    }

    let nextState: NextState;

    if (input.action === "undo") {
      const undoState = await loadUndoState(transaction, match.id);

      if (undoState.status === MatchStatus.FINISHED) {
        assertUndoParticipantsResolved(match);
      }

      if (match.status === MatchStatus.FINISHED && undoState.status !== MatchStatus.FINISHED) {
        assertSafeToReopen(match);
      }

      nextState = {
        status: undoState.status,
        homeScore: undoState.homeScore,
        awayScore: undoState.awayScore,
        endsAt: undoState.status === MatchStatus.FINISHED ? match.endsAt ?? now : null,
        liveStartedAt:
          undoState.status === MatchStatus.SCHEDULED ||
          undoState.status === MatchStatus.POSTPONED ||
          undoState.status === MatchStatus.CANCELLED
            ? null
            : match.liveStartedAt ?? now,
        finishedAt: undoState.status === MatchStatus.FINISHED ? match.finishedAt ?? now : null,
        lastScoreUpdatedAt:
          undoState.status === MatchStatus.LIVE || undoState.status === MatchStatus.FINISHED
            ? now
            : null,
        actionType: undoState.actionType,
      };
    } else {
      nextState = buildNextState(match, input, now);
    }

    const updateResult = await transaction.match.updateMany({
      where: {
        id: match.id,
        scoreVersion: input.expectedScoreVersion,
      },
      data: {
        status: nextState.status,
        homeScore: nextState.homeScore,
        awayScore: nextState.awayScore,
        endsAt: nextState.endsAt,
        liveStartedAt: nextState.liveStartedAt,
        finishedAt: nextState.finishedAt,
        lastScoreUpdatedAt: nextState.lastScoreUpdatedAt,
        lastScoreUpdatedByUserId: input.userId ?? null,
        scoreVersion: {
          increment: 1,
        },
      },
    });

    if (updateResult.count !== 1) {
      throw new MatchScoringError(
        "This match was updated by another organizer. Refreshing to the latest score is required.",
        "CONFLICT",
      );
    }

    const updatedMatch = await transaction.match.findUnique({
      where: { id: match.id },
      select: {
        id: true,
        tournamentId: true,
        status: true,
        homeScore: true,
        awayScore: true,
        scoreVersion: true,
        lastScoreUpdatedAt: true,
      },
    });

    if (!updatedMatch) {
      throw new MatchScoringError("Match not found after update.", "MATCH_NOT_FOUND");
    }

    await transaction.matchScoreEvent.create({
      data: {
        matchId: match.id,
        userId: input.userId ?? null,
        actionType: nextState.actionType,
        previousStatus: match.status,
        nextStatus: updatedMatch.status,
        previousHomeScore: match.homeScore,
        previousAwayScore: match.awayScore,
        nextHomeScore: updatedMatch.homeScore,
        nextAwayScore: updatedMatch.awayScore,
      },
    });

    return {
      matchId: updatedMatch.id,
      tournamentId: updatedMatch.tournamentId,
      tournamentSlug: match.tournament.slug,
      status: updatedMatch.status,
      homeScore: updatedMatch.homeScore,
      awayScore: updatedMatch.awayScore,
      scoreVersion: updatedMatch.scoreVersion,
      lastScoreUpdatedAt: updatedMatch.lastScoreUpdatedAt,
    };
  });

  if (result.status === MatchStatus.FINISHED) {
    await resolveTournamentKnockoutParticipants(result.tournamentId).catch(() => null);
  }

  revalidateTournamentPaths(result.tournamentSlug);
  publishTournamentMatchUpdate({
    tournamentSlug: result.tournamentSlug,
    matchId: result.matchId,
    updatedAt: result.lastScoreUpdatedAt ?? now,
  });

  return result;
}
