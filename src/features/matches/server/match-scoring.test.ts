import assert from "node:assert/strict";
import test from "node:test";

import { MatchScoreEventActionType, MatchStatus, TournamentStageType } from "@prisma/client";

import {
  assertSafeToReopen,
  buildNextState,
  MatchScoringError,
  type MatchForScoring,
} from "@/features/matches/server/match-scoring-state";

function buildMatch(overrides: Partial<MatchForScoring> = {}): MatchForScoring {
  return {
    id: "match-1",
    tournamentId: "tournament-1",
    homeTeamId: "team-1",
    awayTeamId: "team-2",
    status: MatchStatus.SCHEDULED,
    homeScore: 0,
    awayScore: 0,
    startsAt: null,
    endsAt: null,
    liveStartedAt: null,
    finishedAt: null,
    lastScoreUpdatedAt: null,
    scoreVersion: 0,
    stage: {
      type: TournamentStageType.GROUP_STAGE,
    },
    tournament: {
      slug: "coppa-reghinna-minor-2026",
    },
    dependentHomeMatches: [],
    dependentAwayMatches: [],
    ...overrides,
  };
}

test("scheduled matches can be started", () => {
  const now = new Date(Date.UTC(2026, 6, 15, 20, 0, 0));
  const nextState = buildNextState(buildMatch(), { action: "start" }, now);

  assert.equal(nextState.status, MatchStatus.LIVE);
  assert.equal(nextState.homeScore, 0);
  assert.equal(nextState.awayScore, 0);
  assert.equal(nextState.liveStartedAt?.toISOString(), now.toISOString());
  assert.equal(nextState.actionType, MatchScoreEventActionType.START_MATCH);
});

test("live home goals increment the score", () => {
  const nextState = buildNextState(
    buildMatch({
      status: MatchStatus.LIVE,
      homeScore: 1,
      awayScore: 0,
    }),
    { action: "increment_home" },
    new Date(Date.UTC(2026, 6, 15, 20, 5, 0)),
  );

  assert.equal(nextState.homeScore, 2);
  assert.equal(nextState.awayScore, 0);
  assert.equal(nextState.actionType, MatchScoreEventActionType.INCREMENT_HOME_SCORE);
});

test("live away goals increment the score", () => {
  const nextState = buildNextState(
    buildMatch({
      status: MatchStatus.LIVE,
      homeScore: 1,
      awayScore: 1,
    }),
    { action: "increment_away" },
    new Date(Date.UTC(2026, 6, 15, 20, 6, 0)),
  );

  assert.equal(nextState.homeScore, 1);
  assert.equal(nextState.awayScore, 2);
  assert.equal(nextState.actionType, MatchScoreEventActionType.INCREMENT_AWAY_SCORE);
});

test("scores cannot drop below zero", () => {
  assert.throws(
    () =>
      buildNextState(
        buildMatch({
          status: MatchStatus.LIVE,
        }),
        { action: "decrement_home" },
        new Date(Date.UTC(2026, 6, 15, 20, 7, 0)),
      ),
    (error: unknown) =>
      error instanceof MatchScoringError && error.code === "INVALID_SCORE",
  );
});

test("live matches can be finished", () => {
  const now = new Date(Date.UTC(2026, 6, 15, 21, 0, 0));
  const nextState = buildNextState(
    buildMatch({
      status: MatchStatus.LIVE,
      homeScore: 2,
      awayScore: 1,
      liveStartedAt: new Date(Date.UTC(2026, 6, 15, 20, 0, 0)),
    }),
    { action: "finish" },
    now,
  );

  assert.equal(nextState.status, MatchStatus.FINISHED);
  assert.equal(nextState.finishedAt?.toISOString(), now.toISOString());
  assert.equal(nextState.homeScore, 2);
  assert.equal(nextState.awayScore, 1);
  assert.equal(nextState.actionType, MatchScoreEventActionType.FINISH_MATCH);
});

test("finished matches require explicit confirmation before reopening", () => {
  assert.throws(
    () =>
      buildNextState(
        buildMatch({
          status: MatchStatus.FINISHED,
          homeScore: 3,
          awayScore: 2,
        }),
        { action: "reopen", confirmReopen: false },
        new Date(Date.UTC(2026, 6, 15, 21, 30, 0)),
      ),
    (error: unknown) =>
      error instanceof MatchScoringError && error.code === "INVALID_TRANSITION",
  );
});

test("reopening is blocked when downstream knockout matches are already resolved", () => {
  assert.throws(
    () =>
      assertSafeToReopen(
        buildMatch({
          status: MatchStatus.FINISHED,
          dependentHomeMatches: [
            {
              id: "sf-1",
              status: MatchStatus.SCHEDULED,
              homeTeamId: "winner-team",
              awayTeamId: null,
            },
          ],
        }),
      ),
    (error: unknown) =>
      error instanceof MatchScoringError && error.code === "UNSAFE_REOPEN",
  );
});
