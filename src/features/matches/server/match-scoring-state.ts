import {
  MatchScoreEventActionType,
  MatchStatus,
  TournamentStageType,
} from "@prisma/client";

import { getMatchParticipantValidationError } from "@/features/matches/server/match-result-guards";

export type MatchScoringAction =
  | "start"
  | "finish"
  | "return_to_scheduled"
  | "postpone"
  | "cancel"
  | "reopen"
  | "increment_home"
  | "increment_away"
  | "decrement_home"
  | "decrement_away"
  | "set_score"
  | "undo";

export type MatchForScoring = {
  id: string;
  tournamentId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  startsAt: Date | null;
  endsAt: Date | null;
  liveStartedAt: Date | null;
  finishedAt: Date | null;
  lastScoreUpdatedAt: Date | null;
  scoreVersion: number;
  stage: {
    type: TournamentStageType;
  } | null;
  tournament: {
    slug: string;
  };
  dependentHomeMatches: Array<{
    id: string;
    status: MatchStatus;
    homeTeamId: string | null;
    awayTeamId: string | null;
  }>;
  dependentAwayMatches: Array<{
    id: string;
    status: MatchStatus;
    homeTeamId: string | null;
    awayTeamId: string | null;
  }>;
};

export type NextState = {
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  endsAt: Date | null;
  liveStartedAt: Date | null;
  finishedAt: Date | null;
  lastScoreUpdatedAt: Date | null;
  actionType: MatchScoreEventActionType;
};

export class MatchScoringError extends Error {
  constructor(
    message: string,
    readonly code:
      | "MATCH_NOT_FOUND"
      | "INVALID_TRANSITION"
      | "INVALID_SCORE"
      | "CONFLICT"
      | "UNAUTHORIZED"
      | "UNSAFE_REOPEN"
      | "NO_UNDO_EVENT",
  ) {
    super(message);
  }
}

function assertEditableParticipants(match: Pick<MatchForScoring, "homeTeamId" | "awayTeamId">) {
  const validationError = getMatchParticipantValidationError(match);

  if (validationError) {
    throw new MatchScoringError(validationError, "INVALID_TRANSITION");
  }
}

function ensureNonNegativeScore(score: number) {
  if (!Number.isInteger(score) || score < 0) {
    throw new MatchScoringError("Scores must be non-negative integers.", "INVALID_SCORE");
  }
}

function hasResolvedDependentMatches(match: MatchForScoring) {
  return [...match.dependentHomeMatches, ...match.dependentAwayMatches].some(
    (dependentMatch) =>
      dependentMatch.homeTeamId !== null ||
      dependentMatch.awayTeamId !== null ||
      dependentMatch.status !== MatchStatus.SCHEDULED,
  );
}

export function assertSafeToReopen(match: MatchForScoring) {
  if (hasResolvedDependentMatches(match)) {
    throw new MatchScoringError(
      "This finished match already feeds a downstream knockout slot. Clear the dependent assignment before reopening it.",
      "UNSAFE_REOPEN",
    );
  }
}

function buildScheduledState(match: MatchForScoring): NextState {
  return {
    status: MatchStatus.SCHEDULED,
    homeScore: 0,
    awayScore: 0,
    endsAt: match.endsAt,
    liveStartedAt: null,
    finishedAt: null,
    lastScoreUpdatedAt: null,
    actionType: MatchScoreEventActionType.RETURN_TO_SCHEDULED,
  };
}

export function buildNextState(
  match: MatchForScoring,
  input: {
    action: MatchScoringAction;
    homeScore?: number;
    awayScore?: number;
    confirmReopen?: boolean;
  },
  now: Date,
): NextState {
  switch (input.action) {
    case "start":
      if (match.status !== MatchStatus.SCHEDULED) {
        throw new MatchScoringError("Only scheduled matches can be started.", "INVALID_TRANSITION");
      }

      assertEditableParticipants(match);

      return {
        status: MatchStatus.LIVE,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        endsAt: match.endsAt,
        liveStartedAt: match.liveStartedAt ?? now,
        finishedAt: null,
        lastScoreUpdatedAt: match.lastScoreUpdatedAt,
        actionType: MatchScoreEventActionType.START_MATCH,
      };

    case "finish":
      if (match.status !== MatchStatus.LIVE) {
        throw new MatchScoringError("Only live matches can be finished.", "INVALID_TRANSITION");
      }

      assertEditableParticipants(match);

      return {
        status: MatchStatus.FINISHED,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        endsAt: match.endsAt ?? now,
        liveStartedAt: match.liveStartedAt ?? now,
        finishedAt: now,
        lastScoreUpdatedAt: match.lastScoreUpdatedAt ?? now,
        actionType: MatchScoreEventActionType.FINISH_MATCH,
      };

    case "return_to_scheduled":
      if (match.status !== MatchStatus.LIVE) {
        throw new MatchScoringError(
          "Only live matches can be returned to scheduled.",
          "INVALID_TRANSITION",
        );
      }

      return buildScheduledState(match);

    case "postpone":
      if (match.status !== MatchStatus.SCHEDULED && match.status !== MatchStatus.LIVE) {
        throw new MatchScoringError(
          "Only scheduled or live matches can be postponed.",
          "INVALID_TRANSITION",
        );
      }

      return {
        status: MatchStatus.POSTPONED,
        homeScore: 0,
        awayScore: 0,
        endsAt: match.endsAt,
        liveStartedAt: null,
        finishedAt: null,
        lastScoreUpdatedAt: null,
        actionType: MatchScoreEventActionType.POSTPONE_MATCH,
      };

    case "cancel":
      if (match.status === MatchStatus.CANCELLED) {
        throw new MatchScoringError("This match is already cancelled.", "INVALID_TRANSITION");
      }

      return {
        status: MatchStatus.CANCELLED,
        homeScore: 0,
        awayScore: 0,
        endsAt: match.endsAt,
        liveStartedAt: null,
        finishedAt: null,
        lastScoreUpdatedAt: null,
        actionType: MatchScoreEventActionType.CANCEL_MATCH,
      };

    case "reopen":
      if (match.status !== MatchStatus.FINISHED) {
        throw new MatchScoringError("Only finished matches can be reopened.", "INVALID_TRANSITION");
      }

      if (!input.confirmReopen) {
        throw new MatchScoringError(
          "Reopening a finished match requires explicit confirmation.",
          "INVALID_TRANSITION",
        );
      }

      assertSafeToReopen(match);

      return {
        status: MatchStatus.LIVE,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        endsAt: null,
        liveStartedAt: match.liveStartedAt ?? now,
        finishedAt: null,
        lastScoreUpdatedAt: now,
        actionType: MatchScoreEventActionType.REOPEN_MATCH,
      };

    case "increment_home":
      if (match.status !== MatchStatus.LIVE) {
        throw new MatchScoringError("Scores can only change while a match is live.", "INVALID_TRANSITION");
      }

      return {
        status: MatchStatus.LIVE,
        homeScore: match.homeScore + 1,
        awayScore: match.awayScore,
        endsAt: null,
        liveStartedAt: match.liveStartedAt ?? now,
        finishedAt: null,
        lastScoreUpdatedAt: now,
        actionType: MatchScoreEventActionType.INCREMENT_HOME_SCORE,
      };

    case "increment_away":
      if (match.status !== MatchStatus.LIVE) {
        throw new MatchScoringError("Scores can only change while a match is live.", "INVALID_TRANSITION");
      }

      return {
        status: MatchStatus.LIVE,
        homeScore: match.homeScore,
        awayScore: match.awayScore + 1,
        endsAt: null,
        liveStartedAt: match.liveStartedAt ?? now,
        finishedAt: null,
        lastScoreUpdatedAt: now,
        actionType: MatchScoreEventActionType.INCREMENT_AWAY_SCORE,
      };

    case "decrement_home":
      if (match.status !== MatchStatus.LIVE) {
        throw new MatchScoringError("Scores can only change while a match is live.", "INVALID_TRANSITION");
      }

      ensureNonNegativeScore(match.homeScore - 1);

      return {
        status: MatchStatus.LIVE,
        homeScore: match.homeScore - 1,
        awayScore: match.awayScore,
        endsAt: null,
        liveStartedAt: match.liveStartedAt ?? now,
        finishedAt: null,
        lastScoreUpdatedAt: now,
        actionType: MatchScoreEventActionType.DECREMENT_HOME_SCORE,
      };

    case "decrement_away":
      if (match.status !== MatchStatus.LIVE) {
        throw new MatchScoringError("Scores can only change while a match is live.", "INVALID_TRANSITION");
      }

      ensureNonNegativeScore(match.awayScore - 1);

      return {
        status: MatchStatus.LIVE,
        homeScore: match.homeScore,
        awayScore: match.awayScore - 1,
        endsAt: null,
        liveStartedAt: match.liveStartedAt ?? now,
        finishedAt: null,
        lastScoreUpdatedAt: now,
        actionType: MatchScoreEventActionType.DECREMENT_AWAY_SCORE,
      };

    case "set_score":
      if (match.status !== MatchStatus.LIVE) {
        throw new MatchScoringError(
          "Manual score corrections are only allowed while a match is live.",
          "INVALID_TRANSITION",
        );
      }

      ensureNonNegativeScore(input.homeScore ?? Number.NaN);
      ensureNonNegativeScore(input.awayScore ?? Number.NaN);

      return {
        status: MatchStatus.LIVE,
        homeScore: input.homeScore as number,
        awayScore: input.awayScore as number,
        endsAt: null,
        liveStartedAt: match.liveStartedAt ?? now,
        finishedAt: null,
        lastScoreUpdatedAt: now,
        actionType: MatchScoreEventActionType.SET_SCORE,
      };

    case "undo":
      throw new MatchScoringError("Undo must be handled with the latest audit event.", "INVALID_TRANSITION");
  }
}
