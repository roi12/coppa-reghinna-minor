import assert from "node:assert/strict";
import test from "node:test";

import { MatchParticipantSourceType, MatchStatus } from "@prisma/client";

import { hasProtectedMatches } from "@/features/tournaments/server/competition-structure-guards";
import { generateCompetitionStructure } from "@/features/tournaments/server/generate-competition-structure";
import { mapPersistedMatchToDefinition } from "@/features/tournaments/server/persisted-match-definition";
import {
  estimateMinimumMatchDays,
  scheduleCompetition,
} from "@/features/tournaments/server/schedule-competition";
import type {
  CompetitionGroupAssignment,
  CompetitionStageDefinition,
  CompetitionMatchDefinition,
  CompetitionTeamInput,
} from "@/features/tournaments/types/competition.types";

const ALLOWED_WEEKDAYS = [1, 2, 3, 4];

function buildTeams(count: number): CompetitionTeamInput[] {
  return Array.from({ length: count }, (_, index) => ({
    tournamentTeamId: `tt-${index + 1}`,
    teamId: `team-${index + 1}`,
    teamName: `Team ${index + 1}`,
    seed: index + 1,
    createdAt: new Date(Date.UTC(2026, 0, index + 1)),
  }));
}

function buildAssignments(teams: CompetitionTeamInput[]): CompetitionGroupAssignment[] {
  return teams.map((team, index) => {
    const groupSequence = Math.floor(index / 4) + 1;
    const groupLetter = String.fromCharCode(64 + groupSequence);

    return {
      ...team,
      groupId: `group-${groupLetter}`,
      groupName: `Gruppo ${groupLetter}`,
      groupSequence,
      groupSlot: (index % 4) + 1,
    };
  });
}

function buildStages(): CompetitionStageDefinition[] {
  return [
    {
      stageId: "stage-groups",
      type: "GROUP_STAGE",
      order: 1,
      name: "Fase a gironi",
      groupCount: 4,
      teamsPerGroup: 4,
      legs: 1,
      qualifiersPerGroup: 2,
      stageBreakDaysAfter: 0,
    },
    {
      stageId: "stage-knockout",
      type: "KNOCKOUT_STAGE",
      order: 2,
      name: "Fase finale",
      knockoutTeamCount: 8,
      knockoutRound: "QUARTER_FINAL",
      includeThirdPlaceMatch: false,
      stageBreakDaysAfter: 0,
      pairingRule: "CROSS_ADJACENT_GROUPS",
    },
  ];
}

function buildDirectMatch(match: Partial<CompetitionMatchDefinition> & Pick<CompetitionMatchDefinition, "key" | "stageId" | "stageOrder" | "stageType" | "stageName" | "roundNumber" | "sequence" | "roundLabel" | "home" | "away">): CompetitionMatchDefinition {
  return {
    format: match.format ?? "GROUPS_THEN_KNOCKOUT",
    groupId: null,
    groupName: null,
    knockoutRound: null,
    ...match,
  };
}

test("scheduler respects max two matches per day, no team twice per day, and midnight end times", () => {
  const teams = buildTeams(16);
  const result = generateCompetitionStructure({
    format: "GROUPS_THEN_KNOCKOUT",
    teams,
    stages: buildStages(),
    groupAssignments: buildAssignments(teams),
  });

  const scheduledMatches = scheduleCompetition(result.matches, {
    startDate: new Date("2026-07-14T00:00:00.000Z"),
    maxMatchesPerDay: 2,
    minimumRestDays: 0,
    slots: [
      { sequence: 1, startMinutes: 22 * 60, durationMinutes: 60 },
      { sequence: 2, startMinutes: 23 * 60, durationMinutes: 60 },
    ],
    allowedWeekdays: ALLOWED_WEEKDAYS,
    stageBreakDaysByStageId: {
      "stage-groups": 0,
      "stage-knockout": 0,
    },
  });

  assert.equal(scheduledMatches.length, 31);
  assert.equal(estimateMinimumMatchDays(31, 2), 16);

  const matchesPerDay = new Map<string, typeof scheduledMatches>();

  for (const match of scheduledMatches) {
    const existing = matchesPerDay.get(match.calendarDayKey) ?? [];
    existing.push(match);
    matchesPerDay.set(match.calendarDayKey, existing);
  }

  for (const [dayKey, dayMatches] of matchesPerDay) {
    assert(dayMatches.length <= 2, `${dayKey} has more than two matches.`);
    const weekday = new Date(`${dayKey}T00:00:00.000Z`).getUTCDay();
    assert(ALLOWED_WEEKDAYS.includes(weekday), `${dayKey} falls outside Monday to Thursday.`);

    const teamIds = dayMatches.flatMap((match) => {
      const ids: string[] = [];

      if (match.home.type === "DIRECT_TEAM") {
        ids.push(match.home.teamId);
      }

      if (match.away.type === "DIRECT_TEAM") {
        ids.push(match.away.teamId);
      }

      return ids;
    });
    assert.equal(teamIds.length, new Set(teamIds).size, `${dayKey} schedules a team twice.`);
  }

  assert.equal(matchesPerDay.size, 16, "A 31-match tournament with two daily slots should use 16 match dates.");
  const usedKickoffTimes = new Set(
    scheduledMatches.map((match) => match.startsAt.toISOString().slice(11, 16)),
  );
  assert.deepEqual([...usedKickoffTimes].sort(), ["22:00", "23:00"]);
  assert(
    scheduledMatches.every((match) => match.startsAt >= new Date("2026-07-14T00:00:00.000Z")),
    "Expected the Coppa schedule to start on or after 14 July 2026.",
  );
  assert(
    scheduledMatches.every((match) => match.startsAt <= new Date("2026-08-10T23:59:59.999Z")),
    "Expected the Coppa schedule to fit within 10 August 2026.",
  );

  const lateMatch = scheduledMatches.find(
    (match) =>
      match.startsAt.getUTCHours() === 23 &&
      match.endsAt.getUTCHours() === 0 &&
      match.endsAt.getUTCDate() !== match.startsAt.getUTCDate(),
  );

  assert(lateMatch, "Expected at least one 23:00 kick-off ending at midnight.");

  const lastDayKey = [...matchesPerDay.keys()].sort().at(-1);
  assert(lastDayKey);
  assert.equal(matchesPerDay.get(lastDayKey)?.length, 1);
  assert.equal(matchesPerDay.get(lastDayKey)?.[0]?.knockoutRound, "FINAL");
});

test("persisted managed matches still reschedule into both daily slots instead of one match per day", () => {
  const teams = buildTeams(16);
  const result = generateCompetitionStructure({
    format: "GROUPS_THEN_KNOCKOUT",
    teams,
    stages: buildStages(),
    groupAssignments: buildAssignments(teams),
  });

  const persistedDefinitions = result.matches.map((match) => ({
    id: match.key,
    stageId: match.stageId,
    sequence: match.sequence,
    roundLabel: match.roundLabel,
    homeTeamId: match.home.type === "DIRECT_TEAM" ? match.home.teamId : null,
    awayTeamId: match.away.type === "DIRECT_TEAM" ? match.away.teamId : null,
    homeParticipantSourceType:
      match.home.type === "DIRECT_TEAM"
        ? MatchParticipantSourceType.DIRECT_TEAM
        : match.home.type === "GROUP_POSITION"
          ? MatchParticipantSourceType.GROUP_POSITION
          : match.home.type === "MATCH_WINNER"
            ? MatchParticipantSourceType.MATCH_WINNER
            : MatchParticipantSourceType.MATCH_LOSER,
    awayParticipantSourceType:
      match.away.type === "DIRECT_TEAM"
        ? MatchParticipantSourceType.DIRECT_TEAM
        : match.away.type === "GROUP_POSITION"
          ? MatchParticipantSourceType.GROUP_POSITION
          : match.away.type === "MATCH_WINNER"
            ? MatchParticipantSourceType.MATCH_WINNER
            : MatchParticipantSourceType.MATCH_LOSER,
    homeSourceTeamId: match.home.type === "DIRECT_TEAM" ? match.home.teamId : null,
    awaySourceTeamId: match.away.type === "DIRECT_TEAM" ? match.away.teamId : null,
    homeSourceGroupId: match.home.type === "GROUP_POSITION" ? match.home.groupId : null,
    awaySourceGroupId: match.away.type === "GROUP_POSITION" ? match.away.groupId : null,
    homeSourceGroupPosition: match.home.type === "GROUP_POSITION" ? match.home.position : null,
    awaySourceGroupPosition: match.away.type === "GROUP_POSITION" ? match.away.position : null,
    homeSourceMatchId:
      match.home.type === "MATCH_WINNER" || match.home.type === "MATCH_LOSER"
        ? match.home.matchKey
        : null,
    awaySourceMatchId:
      match.away.type === "MATCH_WINNER" || match.away.type === "MATCH_LOSER"
        ? match.away.matchKey
        : null,
    groupId: match.groupId,
    stage: {
      id: match.stageId,
      order: match.stageOrder,
      type: match.stageType,
      name: match.stageName,
      knockoutRound: match.knockoutRound,
    },
    homeTeam:
      match.home.type === "DIRECT_TEAM"
        ? {
            name: match.home.label,
          }
        : null,
    awayTeam:
      match.away.type === "DIRECT_TEAM"
        ? {
            name: match.away.label,
          }
        : null,
    homeSourceGroup:
      match.home.type === "GROUP_POSITION"
        ? {
            name: match.home.groupName,
          }
        : null,
    awaySourceGroup:
      match.away.type === "GROUP_POSITION"
        ? {
            name: match.away.groupName,
          }
        : null,
  }));

  const scheduledMatches = scheduleCompetition(
    persistedDefinitions.map((match) => mapPersistedMatchToDefinition(match)),
    {
      startDate: new Date("2026-07-14T00:00:00.000Z"),
      maxMatchesPerDay: 2,
      minimumRestDays: 0,
      slots: [
        { sequence: 1, startMinutes: 22 * 60, durationMinutes: 60 },
        { sequence: 2, startMinutes: 23 * 60, durationMinutes: 60 },
      ],
      allowedWeekdays: ALLOWED_WEEKDAYS,
      stageBreakDaysByStageId: {
        "stage-groups": 0,
        "stage-knockout": 0,
      },
    },
  );

  const matchDays = new Set(scheduledMatches.map((match) => match.calendarDayKey));
  assert.equal(matchDays.size, 16);
  assert(
    scheduledMatches.some((match) => match.startsAt.toISOString().slice(11, 16) === "23:00"),
    "Expected the persisted reschedule path to use the 23:00 slot.",
  );
  assert(
    scheduledMatches.every((match) => ALLOWED_WEEKDAYS.includes(match.startsAt.getUTCDay())),
    "Expected the persisted reschedule path to use Monday to Thursday only.",
  );
});

test("protected-match guard blocks live, final, and scored matches", () => {
  assert.equal(
    hasProtectedMatches([
      { status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
      { status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
    ]),
    false,
  );

  assert.equal(
    hasProtectedMatches([{ status: MatchStatus.LIVE, homeScore: null, awayScore: null }]),
    true,
  );
  assert.equal(
    hasProtectedMatches([{ status: MatchStatus.FINAL, homeScore: 3, awayScore: 1 }]),
    true,
  );
});

test("minimum rest days of zero still blocks same-day repeat appearances", () => {
  const matches: CompetitionMatchDefinition[] = [
    buildDirectMatch({
      key: "M1",
      stageId: "stage-league",
      stageOrder: 1,
      stageType: "GROUP_STAGE",
      stageName: "Fase a gironi",
      roundNumber: 1,
      sequence: 1,
      roundLabel: "Giornata 1",
      home: {
        type: "DIRECT_TEAM",
        teamId: "team-1",
        label: "Team 1",
      },
      away: {
        type: "DIRECT_TEAM",
        teamId: "team-2",
        label: "Team 2",
      },
    }),
    buildDirectMatch({
      key: "M2",
      stageId: "stage-league",
      stageOrder: 1,
      stageType: "GROUP_STAGE",
      stageName: "Fase a gironi",
      roundNumber: 1,
      sequence: 2,
      roundLabel: "Giornata 1",
      home: {
        type: "DIRECT_TEAM",
        teamId: "team-1",
        label: "Team 1",
      },
      away: {
        type: "DIRECT_TEAM",
        teamId: "team-3",
        label: "Team 3",
      },
    }),
  ];

  const scheduledMatches = scheduleCompetition(matches, {
    startDate: new Date("2026-06-20T00:00:00.000Z"),
    maxMatchesPerDay: 2,
    minimumRestDays: 0,
    slots: [
      { sequence: 1, startMinutes: 22 * 60, durationMinutes: 60 },
      { sequence: 2, startMinutes: 23 * 60, durationMinutes: 60 },
    ],
    allowedWeekdays: ALLOWED_WEEKDAYS,
    stageBreakDaysByStageId: {
      "stage-league": 0,
    },
  });

  assert.equal(scheduledMatches[0]?.calendarDayKey, "2026-06-22");
  assert.equal(scheduledMatches[1]?.calendarDayKey, "2026-06-23");
});

test("knockout dependencies schedule after source matches and respect rest days", () => {
  const teams = buildTeams(16);
  const result = generateCompetitionStructure({
    format: "GROUPS_THEN_KNOCKOUT",
    teams,
    stages: buildStages(),
    groupAssignments: buildAssignments(teams),
  });

  const scheduledMatches = scheduleCompetition(result.matches, {
    startDate: new Date("2026-07-14T00:00:00.000Z"),
    maxMatchesPerDay: 2,
    minimumRestDays: 1,
    slots: [
      { sequence: 1, startMinutes: 22 * 60, durationMinutes: 60 },
      { sequence: 2, startMinutes: 23 * 60, durationMinutes: 60 },
    ],
    allowedWeekdays: ALLOWED_WEEKDAYS,
    stageBreakDaysByStageId: {
      "stage-groups": 0,
      "stage-knockout": 0,
    },
  });

  const findByRoundLabel = (roundLabel: string) =>
    scheduledMatches.find((match) => match.roundLabel === roundLabel);

  const qf1 = findByRoundLabel("QF1");
  const qf3 = findByRoundLabel("QF3");
  const sf1 = findByRoundLabel("SF1");
  const sf2 = findByRoundLabel("SF2");
  const final = findByRoundLabel("Finale");

  assert(qf1);
  assert(qf3);
  assert(sf1);
  assert(sf2);
  assert(final);
  assert(sf1.calendarDayKey > qf3.calendarDayKey);
  assert(sf2.calendarDayKey > qf3.calendarDayKey);
  assert(final.calendarDayKey > sf2.calendarDayKey);
});

test("missing knockout dependencies are rejected before scheduling", () => {
  const matches: CompetitionMatchDefinition[] = [
    buildDirectMatch({
      key: "QF1",
      stageId: "stage-knockout",
      stageOrder: 2,
      stageType: "KNOCKOUT_STAGE",
      stageName: "Fase finale",
      roundNumber: 1,
      sequence: 1,
      roundLabel: "QF1",
      home: {
        type: "DIRECT_TEAM",
        teamId: "team-1",
        label: "Team 1",
      },
      away: {
        type: "DIRECT_TEAM",
        teamId: "team-2",
        label: "Team 2",
      },
    }),
    buildDirectMatch({
      key: "SF1",
      stageId: "stage-knockout",
      stageOrder: 2,
      stageType: "KNOCKOUT_STAGE",
      stageName: "Fase finale",
      roundNumber: 2,
      sequence: 2,
      roundLabel: "SF1",
      home: {
        type: "MATCH_WINNER",
        matchKey: "MISSING",
        label: "Vincente MISSING",
      },
      away: {
        type: "DIRECT_TEAM",
        teamId: "team-3",
        label: "Team 3",
      },
    }),
  ];

  assert.throws(
    () =>
      scheduleCompetition(matches, {
        startDate: new Date("2026-07-14T00:00:00.000Z"),
        maxMatchesPerDay: 2,
        minimumRestDays: 0,
        slots: [
          { sequence: 1, startMinutes: 22 * 60, durationMinutes: 60 },
          { sequence: 2, startMinutes: 23 * 60, durationMinutes: 60 },
        ],
        allowedWeekdays: ALLOWED_WEEKDAYS,
        stageBreakDaysByStageId: {
          "stage-knockout": 0,
        },
      }),
    /missing source match/i,
  );
});

test("circular knockout dependencies are rejected before scheduling", () => {
  const matches: CompetitionMatchDefinition[] = [
    buildDirectMatch({
      key: "M1",
      stageId: "stage-knockout",
      stageOrder: 2,
      stageType: "KNOCKOUT_STAGE",
      stageName: "Fase finale",
      roundNumber: 1,
      sequence: 1,
      roundLabel: "M1",
      home: {
        type: "MATCH_WINNER",
        matchKey: "M2",
        label: "Vincente M2",
      },
      away: {
        type: "DIRECT_TEAM",
        teamId: "team-1",
        label: "Team 1",
      },
    }),
    buildDirectMatch({
      key: "M2",
      stageId: "stage-knockout",
      stageOrder: 2,
      stageType: "KNOCKOUT_STAGE",
      stageName: "Fase finale",
      roundNumber: 1,
      sequence: 2,
      roundLabel: "M2",
      home: {
        type: "MATCH_WINNER",
        matchKey: "M1",
        label: "Vincente M1",
      },
      away: {
        type: "DIRECT_TEAM",
        teamId: "team-2",
        label: "Team 2",
      },
    }),
  ];

  assert.throws(
    () =>
      scheduleCompetition(matches, {
        startDate: new Date("2026-07-14T00:00:00.000Z"),
        maxMatchesPerDay: 2,
        minimumRestDays: 0,
        slots: [
          { sequence: 1, startMinutes: 22 * 60, durationMinutes: 60 },
          { sequence: 2, startMinutes: 23 * 60, durationMinutes: 60 },
        ],
        allowedWeekdays: ALLOWED_WEEKDAYS,
        stageBreakDaysByStageId: {
          "stage-knockout": 0,
        },
      }),
    /circular participant dependency/i,
  );
});

test("scheduler skips Friday, Saturday, and Sunday before using Monday to Thursday slots", () => {
  const matches: CompetitionMatchDefinition[] = [
    buildDirectMatch({
      key: "M1",
      stageId: "stage-league",
      stageOrder: 1,
      stageType: "GROUP_STAGE",
      stageName: "Fase a gironi",
      roundNumber: 1,
      sequence: 1,
      roundLabel: "Giornata 1",
      home: {
        type: "DIRECT_TEAM",
        teamId: "team-1",
        label: "Team 1",
      },
      away: {
        type: "DIRECT_TEAM",
        teamId: "team-2",
        label: "Team 2",
      },
    }),
    buildDirectMatch({
      key: "M2",
      stageId: "stage-league",
      stageOrder: 1,
      stageType: "GROUP_STAGE",
      stageName: "Fase a gironi",
      roundNumber: 1,
      sequence: 2,
      roundLabel: "Giornata 1",
      home: {
        type: "DIRECT_TEAM",
        teamId: "team-3",
        label: "Team 3",
      },
      away: {
        type: "DIRECT_TEAM",
        teamId: "team-4",
        label: "Team 4",
      },
    }),
  ];

  const scheduledMatches = scheduleCompetition(matches, {
    startDate: new Date("2026-07-17T00:00:00.000Z"),
    maxMatchesPerDay: 2,
    minimumRestDays: 0,
    slots: [
      { sequence: 1, startMinutes: 22 * 60, durationMinutes: 60 },
      { sequence: 2, startMinutes: 23 * 60, durationMinutes: 60 },
    ],
    allowedWeekdays: ALLOWED_WEEKDAYS,
    stageBreakDaysByStageId: {
      "stage-league": 0,
    },
  });

  assert.equal(scheduledMatches[0]?.calendarDayKey, "2026-07-20");
  assert.equal(scheduledMatches[1]?.calendarDayKey, "2026-07-20");
  assert.equal(scheduledMatches[0]?.startsAt.getUTCDay(), 1);
  assert.equal(scheduledMatches[1]?.startsAt.getUTCDay(), 1);
  assert.deepEqual(
    scheduledMatches.map((match) => match.startsAt.toISOString().slice(11, 16)),
    ["22:00", "23:00"],
  );
});
