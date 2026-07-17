import assert from "node:assert/strict";
import test from "node:test";

import { MatchParticipantSourceType, MatchStatus } from "@prisma/client";

import {
  buildGlobalQualificationResolutionSnapshot,
  buildManualQualificationResolutionPlan,
  buildQualificationResolutionSnapshot,
} from "@/features/tournaments/server/qualification-resolution";

function buildGroupMatches(prefix: string) {
  const teamIds = [`${prefix}-1`, `${prefix}-2`, `${prefix}-3`, `${prefix}-4`];
  const teamNames = teamIds.map((teamId) => teamId.toUpperCase());
  const pairs: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ];

  return pairs.map(([homeIndex, awayIndex]) => ({
    status: MatchStatus.FINISHED,
    homeTeamId: teamIds[homeIndex] ?? null,
    awayTeamId: teamIds[awayIndex] ?? null,
    homeScore: 0,
    awayScore: 0,
    homeTeam: {
      name: teamNames[homeIndex] ?? "",
    },
    awayTeam: {
      name: teamNames[awayIndex] ?? "",
    },
  }));
}

function buildKnockoutMatch(overrides: Partial<{
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeParticipantLocked: boolean;
  awayParticipantLocked: boolean;
  homeParticipantSourceType: MatchParticipantSourceType | null;
  awayParticipantSourceType: MatchParticipantSourceType | null;
  homeSourceGroupId: string | null;
  awaySourceGroupId: string | null;
  homeSourceGroupPosition: number | null;
  awaySourceGroupPosition: number | null;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
  homeSourceGroup: { name: string } | null;
  awaySourceGroup: { name: string } | null;
  roundLabel: string | null;
}> = {}) {
  return {
    id: "qf-1",
    homeTeamId: null,
    awayTeamId: null,
    homeParticipantLocked: false,
    awayParticipantLocked: false,
    homeParticipantSourceType: MatchParticipantSourceType.GROUP_POSITION,
    awayParticipantSourceType: MatchParticipantSourceType.GROUP_POSITION,
    homeSourceGroupId: "group-a",
    awaySourceGroupId: "group-b",
    homeSourceGroupPosition: 1,
    awaySourceGroupPosition: 2,
    homeTeam: null,
    awayTeam: null,
    homeSourceGroup: {
      name: "Group A",
    },
    awaySourceGroup: {
      name: "Group B",
    },
    roundLabel: "QF1",
    ...overrides,
  };
}

test("no random qualifier is selected when positions are tied", () => {
  const snapshot = buildQualificationResolutionSnapshot({
    qualifiersPerGroup: 2,
    groups: [
      {
        id: "group-a",
        name: "Group A",
        sequence: 1,
        matches: buildGroupMatches("a"),
      },
      {
        id: "group-b",
        name: "Group B",
        sequence: 2,
        matches: buildGroupMatches("b"),
      },
    ],
    knockoutMatches: [buildKnockoutMatch()],
  });

  assert(snapshot.unresolvedSlots.length > 0);
  assert(snapshot.unresolvedSlots.every((slot) => slot.currentTeamId === null));
  assert(snapshot.unresolvedSlots.every((slot) => slot.candidateTeams.length > 1));
});

test("manual resolution populates the intended quarter-final slots", () => {
  const snapshot = buildQualificationResolutionSnapshot({
    qualifiersPerGroup: 2,
    groups: [
      {
        id: "group-a",
        name: "Group A",
        sequence: 1,
        matches: buildGroupMatches("a"),
      },
      {
        id: "group-b",
        name: "Group B",
        sequence: 2,
        matches: buildGroupMatches("b"),
      },
    ],
    knockoutMatches: [
      buildKnockoutMatch({
        id: "qf-1",
        homeSourceGroupId: "group-a",
        homeSourceGroupPosition: 1,
        awaySourceGroupId: "group-b",
        awaySourceGroupPosition: 2,
      }),
      buildKnockoutMatch({
        id: "qf-2",
        homeSourceGroupId: "group-b",
        homeSourceGroupPosition: 1,
        awaySourceGroupId: "group-a",
        awaySourceGroupPosition: 2,
        roundLabel: "QF2",
      }),
    ],
  });

  const plan = buildManualQualificationResolutionPlan(snapshot, [
    {
      matchId: "qf-1",
      side: "home",
      teamId: "a-1",
    },
    {
      matchId: "qf-1",
      side: "away",
      teamId: "b-2",
    },
    {
      matchId: "qf-2",
      side: "home",
      teamId: "b-1",
    },
    {
      matchId: "qf-2",
      side: "away",
      teamId: "a-2",
    },
  ]);

  assert.deepEqual(plan, [
    { matchId: "qf-1", side: "home", teamId: "a-1" },
    { matchId: "qf-1", side: "away", teamId: "b-2" },
    { matchId: "qf-2", side: "home", teamId: "b-1" },
    { matchId: "qf-2", side: "away", teamId: "a-2" },
  ]);
});

test("locked participants are not overwritten", () => {
  const snapshot = buildQualificationResolutionSnapshot({
    qualifiersPerGroup: 2,
    groups: [
      {
        id: "group-a",
        name: "Group A",
        sequence: 1,
        matches: buildGroupMatches("a"),
      },
      {
        id: "group-b",
        name: "Group B",
        sequence: 2,
        matches: buildGroupMatches("b"),
      },
    ],
    knockoutMatches: [
      buildKnockoutMatch({
        id: "qf-1",
        homeTeamId: "a-1",
        homeParticipantLocked: true,
      }),
    ],
  });

  assert.throws(
    () =>
      buildManualQualificationResolutionPlan(snapshot, [
        {
          matchId: "qf-1",
          side: "home",
          teamId: "a-2",
        },
      ]),
    /non può essere modificata/i,
  );
});

test("duplicate manual assignments are rejected", () => {
  const snapshot = buildQualificationResolutionSnapshot({
    qualifiersPerGroup: 2,
    groups: [
      {
        id: "group-a",
        name: "Group A",
        sequence: 1,
        matches: buildGroupMatches("a"),
      },
      {
        id: "group-b",
        name: "Group B",
        sequence: 2,
        matches: buildGroupMatches("b"),
      },
    ],
    knockoutMatches: [buildKnockoutMatch()],
  });

  assert.throws(
    () =>
      buildManualQualificationResolutionPlan(snapshot, [
        {
          matchId: "qf-1",
          side: "home",
          teamId: "a-1",
        },
        {
          matchId: "qf-2",
          side: "away",
          teamId: "a-1",
        },
      ]),
    /non è più disponibile/i,
  );
});

test("global-table qualification resolves ties against one shared standings table", () => {
  const snapshot = buildGlobalQualificationResolutionSnapshot({
    qualifierCount: 8,
    standings: [
      { teamId: "team-1", teamName: "Team 1", points: 9, goalDifference: 5, goalsFor: 6 },
      { teamId: "team-2", teamName: "Team 2", points: 7, goalDifference: 4, goalsFor: 5 },
      { teamId: "team-3", teamName: "Team 3", points: 7, goalDifference: 2, goalsFor: 4 },
      { teamId: "team-4", teamName: "Team 4", points: 6, goalDifference: 3, goalsFor: 4 },
      { teamId: "team-5", teamName: "Team 5", points: 6, goalDifference: 2, goalsFor: 3 },
      { teamId: "team-6", teamName: "Team 6", points: 5, goalDifference: 1, goalsFor: 3 },
      { teamId: "team-7", teamName: "Team 7", points: 4, goalDifference: 0, goalsFor: 2 },
      { teamId: "team-8", teamName: "Team 8", points: 3, goalDifference: -1, goalsFor: 2 },
      { teamId: "team-9", teamName: "Team 9", points: 3, goalDifference: -1, goalsFor: 2 },
      { teamId: "team-10", teamName: "Team 10", points: 1, goalDifference: -3, goalsFor: 1 },
    ],
    knockoutMatches: [
      buildKnockoutMatch({
        id: "qf-1",
        homeSourceGroupPosition: 1,
        awaySourceGroupPosition: 8,
      }),
      buildKnockoutMatch({
        id: "qf-2",
        homeSourceGroupPosition: 4,
        awaySourceGroupPosition: 5,
        roundLabel: "QF2",
      }),
      buildKnockoutMatch({
        id: "qf-3",
        homeSourceGroupPosition: 2,
        awaySourceGroupPosition: 7,
        roundLabel: "QF3",
      }),
      buildKnockoutMatch({
        id: "qf-4",
        homeSourceGroupPosition: 3,
        awaySourceGroupPosition: 6,
        roundLabel: "QF4",
      }),
    ],
    sourceLabel: "Classifica generale",
  });

  assert.equal(snapshot.unresolvedSlots.length, 1);
  assert.equal(snapshot.unresolvedSlots[0]?.groupName, "Classifica generale");
  assert.equal(snapshot.unresolvedSlots[0]?.position, 8);
  assert.deepEqual(
    snapshot.unresolvedSlots[0]?.candidateTeams.map((team) => team.teamId),
    ["team-8", "team-9"],
  );
});
