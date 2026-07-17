import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLatestEventSummary,
  buildMatchGoalSummary,
  buildMatchScoreReconciliation,
  buildTournamentScorerStandings,
} from "@/features/matches/server/match-player-event-utils";

const baseDate = new Date("2026-07-17T12:00:00.000Z");

test("goal summary groups repeated scorers and keeps own goals separate", () => {
  const summary = buildMatchGoalSummary(
    [
      {
        id: "goal-1",
        type: "GOAL",
        teamId: "team-home",
        awardedTeamId: "team-home",
        playerId: "player-1",
        playerDisplayNameSnapshot: "Luigi Calabrese",
        playerJerseyNumberSnapshot: "9",
        teamNameSnapshot: "Team Home",
        matchMinute: 4,
        sequence: 1,
        createdAt: baseDate,
        updatedAt: baseDate,
        voidedAt: null,
      },
      {
        id: "goal-2",
        type: "GOAL",
        teamId: "team-home",
        awardedTeamId: "team-home",
        playerId: "player-1",
        playerDisplayNameSnapshot: "Luigi Calabrese",
        playerJerseyNumberSnapshot: "9",
        teamNameSnapshot: "Team Home",
        matchMinute: 12,
        sequence: 2,
        createdAt: new Date(baseDate.getTime() + 1000),
        updatedAt: new Date(baseDate.getTime() + 1000),
        voidedAt: null,
      },
      {
        id: "goal-3",
        type: "OWN_GOAL",
        teamId: "team-away",
        awardedTeamId: "team-home",
        playerId: "player-2",
        playerDisplayNameSnapshot: "Mario Rossi",
        playerJerseyNumberSnapshot: "4",
        teamNameSnapshot: "Team Away",
        matchMinute: 18,
        sequence: 3,
        createdAt: new Date(baseDate.getTime() + 2000),
        updatedAt: new Date(baseDate.getTime() + 2000),
        voidedAt: null,
      },
      {
        id: "goal-4",
        type: "GOAL",
        teamId: "team-away",
        awardedTeamId: "team-away",
        playerId: null,
        playerDisplayNameSnapshot: null,
        playerJerseyNumberSnapshot: null,
        teamNameSnapshot: "Team Away",
        matchMinute: 20,
        sequence: 4,
        createdAt: new Date(baseDate.getTime() + 3000),
        updatedAt: new Date(baseDate.getTime() + 3000),
        voidedAt: null,
      },
    ],
    {
      homeTeamId: "team-home",
      awayTeamId: "team-away",
      homeTeamName: "Team Home",
      awayTeamName: "Team Away",
    },
  );

  assert.deepEqual(summary, [
    {
      teamId: "team-home",
      teamName: "Team Home",
      type: "OWN_GOAL",
      label: "Autogol · Mario Rossi",
      goalCount: 1,
      playerId: "player-2",
    },
    {
      teamId: "team-home",
      teamName: "Team Home",
      type: "GOAL",
      label: "Luigi Calabrese",
      goalCount: 2,
      playerId: "player-1",
    },
    {
      teamId: "team-away",
      teamName: "Team Away",
      type: "GOAL",
      label: "Marcatore da assegnare",
      goalCount: 1,
      playerId: null,
    },
  ]);
});

test("score reconciliation reports unassigned goals and score deltas", () => {
  const reconciliation = buildMatchScoreReconciliation(
    [
      {
        id: "goal-1",
        type: "GOAL",
        teamId: "team-home",
        awardedTeamId: "team-home",
        playerId: null,
        playerDisplayNameSnapshot: null,
        playerJerseyNumberSnapshot: null,
        teamNameSnapshot: "Team Home",
        matchMinute: null,
        sequence: 1,
        createdAt: baseDate,
        updatedAt: baseDate,
        voidedAt: null,
      },
      {
        id: "goal-2",
        type: "GOAL",
        teamId: "team-away",
        awardedTeamId: "team-away",
        playerId: "player-away",
        playerDisplayNameSnapshot: "Christian Proto",
        playerJerseyNumberSnapshot: "10",
        teamNameSnapshot: "Team Away",
        matchMinute: null,
        sequence: 2,
        createdAt: new Date(baseDate.getTime() + 1000),
        updatedAt: new Date(baseDate.getTime() + 1000),
        voidedAt: null,
      },
    ],
    {
      homeTeamId: "team-home",
      awayTeamId: "team-away",
      homeScore: 2,
      awayScore: 1,
    },
  );

  assert.deepEqual(reconciliation, {
    homeRecordedGoals: 1,
    awayRecordedGoals: 1,
    homeUnassignedGoals: 1,
    awayUnassignedGoals: 0,
    homeGoalDelta: 1,
    awayGoalDelta: 0,
  });
});

test("latest event summary ignores voided events and scorer standings remain deterministic", () => {
  const latestEvent = buildLatestEventSummary([
    {
      id: "event-1",
      type: "GOAL",
      teamId: "team-home",
      awardedTeamId: "team-home",
      playerId: "player-1",
      playerDisplayNameSnapshot: "Luigi Calabrese",
      playerJerseyNumberSnapshot: "9",
      teamNameSnapshot: "Team Home",
      matchMinute: 5,
      sequence: 1,
      createdAt: baseDate,
      updatedAt: baseDate,
      voidedAt: null,
    },
    {
      id: "event-2",
      type: "RED_CARD",
      teamId: "team-away",
      awardedTeamId: null,
      playerId: "player-2",
      playerDisplayNameSnapshot: "Mario Rossi",
      playerJerseyNumberSnapshot: "4",
      teamNameSnapshot: "Team Away",
      matchMinute: 8,
      sequence: 2,
      createdAt: new Date(baseDate.getTime() + 1000),
      updatedAt: new Date(baseDate.getTime() + 1000),
      voidedAt: new Date(baseDate.getTime() + 2000),
    },
  ]);

  assert.deepEqual(latestEvent, {
    eventId: "event-1",
    type: "GOAL",
    label: "Luigi Calabrese",
    teamName: "Team Home",
    matchMinute: 5,
  });

  const standings = buildTournamentScorerStandings([
    {
      playerId: "player-2",
      playerName: "Christian Proto",
      teamId: "team-b",
      teamName: "Team B",
      goals: 3,
      yellowCards: 0,
      redCards: 0,
    },
    {
      playerId: "player-1",
      playerName: "Christian Proto",
      teamId: "team-a",
      teamName: "Team A",
      goals: 3,
      yellowCards: 1,
      redCards: 0,
    },
    {
      playerId: "player-3",
      playerName: "Luigi Calabrese",
      teamId: "team-c",
      teamName: "Team C",
      goals: 2,
      yellowCards: 0,
      redCards: 1,
    },
  ]);

  assert.deepEqual(
    standings.map((row) => ({
      position: row.position,
      playerId: row.playerId,
      goals: row.goals,
    })),
    [
      { position: 1, playerId: "player-1", goals: 3 },
      { position: 2, playerId: "player-2", goals: 3 },
      { position: 3, playerId: "player-3", goals: 2 },
    ],
  );
});
