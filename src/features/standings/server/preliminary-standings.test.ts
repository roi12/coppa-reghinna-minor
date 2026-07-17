import assert from "node:assert/strict";
import test from "node:test";

import { MatchStatus } from "@prisma/client";

import {
  buildPreliminaryStandings,
  getConfiguredPreliminaryStandingsScope,
  resolvePreliminaryStandingsScope,
} from "@/features/standings/server/preliminary-standings";

test("explicit preliminary standings scope is read from stage configuration", () => {
  assert.equal(getConfiguredPreliminaryStandingsScope({ standingsScope: "GLOBAL" }), "GLOBAL");
  assert.equal(getConfiguredPreliminaryStandingsScope({ standingsScope: "GROUPS" }), "GROUPS");
  assert.equal(getConfiguredPreliminaryStandingsScope({ standingsScope: "OTHER" }), null);
  assert.equal(getConfiguredPreliminaryStandingsScope(null), null);
});

test("missing preliminary standings scope preserves the legacy grouped fallback", () => {
  assert.equal(
    resolvePreliminaryStandingsScope({
      tournamentFormat: "GROUPS_THEN_KNOCKOUT",
      configuration: null,
    }),
    "GROUPS",
  );
  assert.equal(
    resolvePreliminaryStandingsScope({
      tournamentFormat: "SINGLE_ROUND_ROBIN",
      configuration: null,
    }),
    "GLOBAL",
  );
});

test("global preliminary standings aggregate only finished preliminary matches and keep zero-match teams", () => {
  const result = buildPreliminaryStandings({
    scope: "GLOBAL",
    preliminaryStageId: "stage-preliminary",
    teams: [
      { id: "team-a", name: "Alpha" },
      { id: "team-b", name: "Beta" },
      { id: "team-c", name: "Gamma" },
    ],
    groups: [
      {
        id: "group-a",
        stageId: "stage-preliminary",
        name: "Girone A",
        sequence: 1,
        teams: [
          { id: "team-a", name: "Alpha" },
          { id: "team-b", name: "Beta" },
        ],
      },
      {
        id: "group-b",
        stageId: "stage-preliminary",
        name: "Girone B",
        sequence: 2,
        teams: [{ id: "team-c", name: "Gamma" }],
      },
    ],
    matches: [
      {
        stageId: "stage-preliminary",
        groupId: "group-a",
        status: MatchStatus.FINISHED,
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        homeScore: 2,
        awayScore: 1,
        homeTeamName: "Alpha",
        awayTeamName: "Beta",
      },
      {
        stageId: "stage-preliminary",
        groupId: "group-a",
        status: MatchStatus.LIVE,
        homeTeamId: "team-b",
        awayTeamId: "team-a",
        homeScore: 1,
        awayScore: 1,
        homeTeamName: "Beta",
        awayTeamName: "Alpha",
      },
      {
        stageId: "stage-knockout",
        groupId: null,
        status: MatchStatus.FINISHED,
        homeTeamId: "team-a",
        awayTeamId: "team-c",
        homeScore: 4,
        awayScore: 0,
        homeTeamName: "Alpha",
        awayTeamName: "Gamma",
      },
      {
        stageId: "stage-preliminary",
        groupId: "group-b",
        status: MatchStatus.CANCELLED,
        homeTeamId: "team-c",
        awayTeamId: "team-a",
        homeScore: 0,
        awayScore: 0,
        homeTeamName: "Gamma",
        awayTeamName: "Alpha",
      },
    ],
  });

  assert.deepEqual(
    result.standings.map((row) => ({
      teamId: row.teamId,
      played: row.played,
      points: row.points,
      goalDifference: row.goalDifference,
    })),
    [
      { teamId: "team-a", played: 1, points: 3, goalDifference: 1 },
      { teamId: "team-c", played: 0, points: 0, goalDifference: 0 },
      { teamId: "team-b", played: 1, points: 0, goalDifference: -1 },
    ],
  );
  assert.equal(result.groupStandings[0]?.playedMatchCount, 1);
  assert.equal(result.groupStandings[1]?.rows[0]?.teamId, "team-c");
  assert.equal(result.groupStandings[1]?.rows[0]?.played, 0);
});

test("deterministic standings use wins before team-name fallback", () => {
  const result = buildPreliminaryStandings({
    scope: "GLOBAL",
    preliminaryStageId: "stage-preliminary",
    teams: [
      { id: "team-a", name: "Alpha" },
      { id: "team-b", name: "Beta" },
      { id: "team-c", name: "Gamma" },
      { id: "team-d", name: "Delta" },
    ],
    groups: [],
    matches: [
      {
        stageId: "stage-preliminary",
        groupId: null,
        status: MatchStatus.FINISHED,
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        homeScore: 1,
        awayScore: 0,
        homeTeamName: "Alpha",
        awayTeamName: "Beta",
      },
      {
        stageId: "stage-preliminary",
        groupId: null,
        status: MatchStatus.FINISHED,
        homeTeamId: "team-a",
        awayTeamId: "team-c",
        homeScore: 0,
        awayScore: 1,
        homeTeamName: "Alpha",
        awayTeamName: "Gamma",
      },
      {
        stageId: "stage-preliminary",
        groupId: null,
        status: MatchStatus.FINISHED,
        homeTeamId: "team-d",
        awayTeamId: "team-b",
        homeScore: 1,
        awayScore: 0,
        homeTeamName: "Delta",
        awayTeamName: "Beta",
      },
      {
        stageId: "stage-preliminary",
        groupId: null,
        status: MatchStatus.FINISHED,
        homeTeamId: "team-d",
        awayTeamId: "team-c",
        homeScore: 0,
        awayScore: 1,
        homeTeamName: "Delta",
        awayTeamName: "Gamma",
      },
    ],
  });

  assert.deepEqual(
    result.standings.map((row) => row.teamId),
    ["team-c", "team-a", "team-d", "team-b"],
  );
});
