import assert from "node:assert/strict";
import test from "node:test";

import { MatchStatus, TournamentStageType } from "@prisma/client";

import {
  buildPreliminaryStandingsSnapshot,
  getDisplayRoundLabel,
  inferPreliminaryStandingsMode,
} from "@/features/standings/server/preliminary-standings";

function buildTeams() {
  return Array.from({ length: 12 }, (_, index) => {
    const teamNumber = index + 1;
    const bucket = Math.floor(index / 4) + 1;

    return {
      id: `team-${teamNumber}`,
      name: `Team ${teamNumber}`,
      groupId: `pool-${bucket}`,
    };
  });
}

function buildSchedulingPoolMatches() {
  return [
    { home: 1, away: 5, roundLabel: "Pool A · 1ª giornata", groupId: "pool-1", status: MatchStatus.FINISHED, score: [2, 0] },
    { home: 2, away: 6, roundLabel: "Pool A · 1ª giornata", groupId: "pool-1", status: MatchStatus.FINISHED, score: [1, 1] },
    { home: 3, away: 7, roundLabel: "Pool B · 1ª giornata", groupId: "pool-2", status: MatchStatus.FINISHED, score: [0, 1] },
    { home: 4, away: 8, roundLabel: "Pool B · 1ª giornata", groupId: "pool-2", status: MatchStatus.FINISHED, score: [3, 2] },
    { home: 9, away: 11, roundLabel: "Pool C · 1ª giornata", groupId: "pool-3", status: MatchStatus.FINISHED, score: [2, 2] },
    { home: 10, away: 12, roundLabel: "Pool C · 1ª giornata", groupId: "pool-3", status: MatchStatus.LIVE, score: [0, 2] },

    { home: 1, away: 9, roundLabel: "Pool A · 2ª giornata", groupId: "pool-1", status: MatchStatus.FINISHED, score: [1, 0] },
    { home: 2, away: 10, roundLabel: "Pool A · 2ª giornata", groupId: "pool-1", status: MatchStatus.LIVE, score: [5, 0] },
    { home: 3, away: 11, roundLabel: "Pool B · 2ª giornata", groupId: "pool-2", status: MatchStatus.FINISHED, score: [0, 2] },
    { home: 4, away: 12, roundLabel: "Pool B · 2ª giornata", groupId: "pool-2", status: MatchStatus.CANCELLED, score: [4, 0] },
    { home: 5, away: 8, roundLabel: "Pool C · 2ª giornata", groupId: "pool-3", status: MatchStatus.FINISHED, score: [2, 1] },
    { home: 6, away: 7, roundLabel: "Pool C · 2ª giornata", groupId: "pool-3", status: MatchStatus.FINISHED, score: [1, 0] },

    { home: 1, away: 6, roundLabel: "Pool A · 3ª giornata", groupId: "pool-1", status: MatchStatus.FINISHED, score: [0, 1] },
    { home: 2, away: 7, roundLabel: "Pool A · 3ª giornata", groupId: "pool-1", status: MatchStatus.POSTPONED, score: [2, 0] },
    { home: 3, away: 8, roundLabel: "Pool B · 3ª giornata", groupId: "pool-2", status: MatchStatus.FINISHED, score: [1, 0] },
    { home: 4, away: 9, roundLabel: "Pool B · 3ª giornata", groupId: "pool-2", status: MatchStatus.FINISHED, score: [1, 3] },
    { home: 5, away: 10, roundLabel: "Pool C · 3ª giornata", groupId: "pool-3", status: MatchStatus.SCHEDULED, score: [1, 0] },
    { home: 11, away: 12, roundLabel: "Pool C · 3ª giornata", groupId: "pool-3", status: MatchStatus.FINISHED, score: [0, 0] },
  ].map((match, index) => ({
    id: `match-${index + 1}`,
    stageId: "stage-preliminary",
    stageType: TournamentStageType.GROUP_STAGE,
    groupId: match.groupId,
    roundLabel: match.roundLabel,
    status: match.status,
    homeTeamId: `team-${match.home}`,
    awayTeamId: `team-${match.away}`,
    homeTeamName: `Team ${match.home}`,
    awayTeamName: `Team ${match.away}`,
    homeScore: match.score[0],
    awayScore: match.score[1],
  }));
}

test("12-team preliminary scheduling pools still produce one global standings table", () => {
  const teams = buildTeams();
  const matches = buildSchedulingPoolMatches();
  const snapshot = buildPreliminaryStandingsSnapshot({
    stages: [
      {
        id: "stage-preliminary",
        name: "Fase preliminare",
        type: TournamentStageType.GROUP_STAGE,
        groupCount: 3,
        configuration: null,
      },
      {
        id: "stage-knockout",
        name: "Fase finale",
        type: TournamentStageType.KNOCKOUT_STAGE,
        groupCount: null,
        configuration: null,
      },
    ],
    groups: [
      { id: "pool-1", name: "Pool A", sequence: 1, stageId: "stage-preliminary" },
      { id: "pool-2", name: "Pool B", sequence: 2, stageId: "stage-preliminary" },
      { id: "pool-3", name: "Pool C", sequence: 3, stageId: "stage-preliminary" },
    ],
    teams,
    matches: [
      ...matches,
      {
        id: "knockout-1",
        stageId: "stage-knockout",
        stageType: TournamentStageType.KNOCKOUT_STAGE,
        groupId: null,
        roundLabel: "QF1",
        status: MatchStatus.FINISHED,
        homeTeamId: "team-1",
        awayTeamId: "team-2",
        homeTeamName: "Team 1",
        awayTeamName: "Team 2",
        homeScore: 9,
        awayScore: 0,
      },
    ],
  });

  assert.equal(snapshot.mode, "GLOBAL");
  assert.equal(snapshot.groupStandings.length, 0);
  assert.equal(snapshot.standings.length, 12);

  const team1 = snapshot.standings.find((row) => row.teamId === "team-1");
  const team2 = snapshot.standings.find((row) => row.teamId === "team-2");
  const team5 = snapshot.standings.find((row) => row.teamId === "team-5");
  const team10 = snapshot.standings.find((row) => row.teamId === "team-10");

  assert.deepEqual(
    team1 && {
      played: team1.played,
      wins: team1.wins,
      draws: team1.draws,
      losses: team1.losses,
      goalsFor: team1.goalsFor,
      goalsAgainst: team1.goalsAgainst,
      goalDifference: team1.goalDifference,
      points: team1.points,
    },
    {
      played: 3,
      wins: 2,
      draws: 0,
      losses: 1,
      goalsFor: 3,
      goalsAgainst: 1,
      goalDifference: 2,
      points: 6,
    },
  );
  assert.equal(team2?.played, 1);
  assert.equal(team2?.points, 1);
  assert.equal(team5?.played, 2);
  assert.equal(team5?.points, 3);
  assert.equal(team10?.played, 0);
  assert.equal(team10?.points, 0);

  const zeroMatchTeams = snapshot.standings.filter((row) => row.played === 0).map((row) => row.teamId);
  assert.deepEqual(zeroMatchTeams, ["team-10"]);
  assert.equal(snapshot.standings[0]?.teamId, "team-6");
  assert.equal(snapshot.standings[1]?.teamId, "team-1");
  assert.equal(snapshot.standings.at(-1)?.teamId, "team-8");
});

test("genuine multi-group tournaments keep separated standings", () => {
  const mode = inferPreliminaryStandingsMode({
    stage: {
      id: "stage-groups",
      name: "Fase a gironi",
      type: TournamentStageType.GROUP_STAGE,
      groupCount: 2,
      configuration: null,
    },
    groups: [
      { id: "group-a", name: "Group A", sequence: 1, stageId: "stage-groups" },
      { id: "group-b", name: "Group B", sequence: 2, stageId: "stage-groups" },
    ],
    teams: [
      { id: "team-1", name: "Team 1", groupId: "group-a" },
      { id: "team-2", name: "Team 2", groupId: "group-a" },
      { id: "team-3", name: "Team 3", groupId: "group-b" },
      { id: "team-4", name: "Team 4", groupId: "group-b" },
    ],
    matches: [
      {
        id: "match-a",
        stageId: "stage-groups",
        stageType: TournamentStageType.GROUP_STAGE,
        groupId: "group-a",
        roundLabel: "Group A · Giornata 1",
        status: MatchStatus.FINISHED,
        homeTeamId: "team-1",
        awayTeamId: "team-2",
        homeTeamName: "Team 1",
        awayTeamName: "Team 2",
        homeScore: 1,
        awayScore: 0,
      },
      {
        id: "match-b",
        stageId: "stage-groups",
        stageType: TournamentStageType.GROUP_STAGE,
        groupId: "group-b",
        roundLabel: "Group B · Giornata 1",
        status: MatchStatus.FINISHED,
        homeTeamId: "team-3",
        awayTeamId: "team-4",
        homeTeamName: "Team 3",
        awayTeamName: "Team 4",
        homeScore: 1,
        awayScore: 1,
      },
    ],
  });

  assert.equal(mode, "GROUPS");
});

test("global-table preliminary labels drop scheduling pool prefixes", () => {
  assert.equal(
    getDisplayRoundLabel({
      roundLabel: "Pool C · 3ª giornata",
      groupName: "Pool C",
      standingsMode: "GLOBAL",
      stageType: TournamentStageType.GROUP_STAGE,
    }),
    "3ª giornata",
  );
  assert.equal(
    getDisplayRoundLabel({
      roundLabel: "Girone A · Giornata 1",
      groupName: "Girone A",
      standingsMode: "GROUPS",
      stageType: TournamentStageType.GROUP_STAGE,
    }),
    "Girone A · Giornata 1",
  );
});
