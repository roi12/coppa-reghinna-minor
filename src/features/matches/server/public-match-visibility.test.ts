import assert from "node:assert/strict";
import test from "node:test";

import { filterPublicTournamentMatches } from "@/features/matches/server/public-match-visibility";
import type { MatchSummary } from "@/features/matches/types/match.types";

function buildMatch(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    id: "match-1",
    tournamentId: "tournament-1",
    stageId: "stage-1",
    stageType: "GROUP_STAGE",
    stageIsPublic: true,
    groupId: "group-a",
    homeTeamId: "team-1",
    awayTeamId: "team-2",
    homeTeamName: "Team 1",
    awayTeamName: "Team 2",
    roundLabel: "Round 1",
    startsAt: new Date(Date.UTC(2026, 6, 14, 22, 0, 0)),
    endsAt: new Date(Date.UTC(2026, 6, 14, 23, 0, 0)),
    liveStartedAt: null,
    finishedAt: null,
    lastScoreUpdatedAt: null,
    scoreVersion: 0,
    locationLabel: null,
    status: "SCHEDULED",
    homeScore: 0,
    awayScore: 0,
    ...overrides,
  };
}

test("public calendar excludes hidden knockout matches", () => {
  const matches = [
    buildMatch({
      id: "group-1",
      stageId: "stage-groups",
      stageType: "GROUP_STAGE",
      stageIsPublic: true,
    }),
    buildMatch({
      id: "qf-1",
      stageId: "stage-knockout",
      stageType: "KNOCKOUT_STAGE",
      stageIsPublic: false,
      groupId: null,
    }),
  ];

  assert.deepEqual(
    filterPublicTournamentMatches(matches).map((match) => match.id),
    ["group-1"],
  );
});

test("public calendar includes knockout matches after visibility toggle", () => {
  const matches = [
    buildMatch({
      id: "group-1",
      stageId: "stage-groups",
      stageType: "GROUP_STAGE",
      stageIsPublic: true,
    }),
    buildMatch({
      id: "sf-1",
      stageId: "stage-knockout",
      stageType: "KNOCKOUT_STAGE",
      stageIsPublic: true,
      groupId: null,
    }),
  ];

  assert.deepEqual(
    filterPublicTournamentMatches(matches).map((match) => match.id),
    ["group-1", "sf-1"],
  );
});

test("legacy and group-stage matches remain public", () => {
  const matches = [
    buildMatch({
      id: "legacy-1",
      stageId: null,
      stageType: null,
      stageIsPublic: null,
      groupId: null,
    }),
    buildMatch({
      id: "group-2",
      stageId: "stage-groups",
      stageType: "GROUP_STAGE",
      stageIsPublic: true,
    }),
  ];

  assert.deepEqual(
    filterPublicTournamentMatches(matches).map((match) => match.id),
    ["legacy-1", "group-2"],
  );
});
