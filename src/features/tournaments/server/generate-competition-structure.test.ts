import assert from "node:assert/strict";
import test from "node:test";

import { generateCompetitionStructure } from "@/features/tournaments/server/generate-competition-structure";
import type {
  CompetitionGroupAssignment,
  CompetitionStageDefinition,
  CompetitionTeamInput,
} from "@/features/tournaments/types/competition.types";
import type { TournamentFormatValue } from "@/features/tournaments/types/tournament-format.types";

function buildTeams(count: number): CompetitionTeamInput[] {
  return Array.from({ length: count }, (_, index) => {
    const teamNumber = index + 1;

    return {
      tournamentTeamId: `tt-${teamNumber}`,
      teamId: `team-${teamNumber}`,
      teamName: `Team ${teamNumber}`,
      seed: teamNumber,
      createdAt: new Date(Date.UTC(2026, 0, teamNumber)),
    };
  });
}

function buildGroupAssignments(teams: CompetitionTeamInput[]): CompetitionGroupAssignment[] {
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

function buildStages(format: TournamentFormatValue): CompetitionStageDefinition[] {
  switch (format) {
    case "SINGLE_ROUND_ROBIN":
      return [
        {
          stageId: "stage-league",
          type: "GROUP_STAGE",
          order: 1,
          name: "Girone unico",
          groupCount: 1,
          teamsPerGroup: 4,
          legs: 1,
          qualifiersPerGroup: 0,
          stageBreakDaysAfter: 0,
        },
      ];
    case "DOUBLE_ROUND_ROBIN":
      return [
        {
          stageId: "stage-league",
          type: "GROUP_STAGE",
          order: 1,
          name: "Girone unico",
          groupCount: 1,
          teamsPerGroup: 4,
          legs: 2,
          qualifiersPerGroup: 0,
          stageBreakDaysAfter: 0,
        },
      ];
    case "GROUPS_ONLY":
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
      ];
    case "GROUPS_THEN_KNOCKOUT":
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
    case "KNOCKOUT_ONLY":
      return [
        {
          stageId: "stage-knockout",
          type: "KNOCKOUT_STAGE",
          order: 1,
          name: "Fase finale",
          knockoutTeamCount: 8,
          knockoutRound: "QUARTER_FINAL",
          includeThirdPlaceMatch: false,
          stageBreakDaysAfter: 0,
          pairingRule: "SEEDED_BRACKET",
        },
      ];
  }
}

test("single round-robin creates 6 matches for 4 teams", () => {
  const teams = buildTeams(4);
  const result = generateCompetitionStructure({
    format: "SINGLE_ROUND_ROBIN",
    teams,
    stages: buildStages("SINGLE_ROUND_ROBIN"),
  });

  assert.equal(result.matches.length, 6);
  assert.equal(result.preview.totalMatchCount, 6);
});

test("double round-robin creates 12 matches for 4 teams", () => {
  const teams = buildTeams(4);
  const result = generateCompetitionStructure({
    format: "DOUBLE_ROUND_ROBIN",
    teams,
    stages: buildStages("DOUBLE_ROUND_ROBIN"),
  });

  assert.equal(result.matches.length, 12);
  assert.equal(result.preview.totalMatchCount, 12);
});

test("groups of four create 24 matches and each team plays three times", () => {
  const teams = buildTeams(16);
  const assignments = buildGroupAssignments(teams);
  const result = generateCompetitionStructure({
    format: "GROUPS_ONLY",
    teams,
    stages: buildStages("GROUPS_ONLY"),
    groupAssignments: assignments,
  });

  assert.equal(result.matches.length, 24);

  const teamMatchCounts = new Map<string, number>();

  for (const match of result.matches) {
    assert.equal(match.home.type, "DIRECT_TEAM");
    assert.equal(match.away.type, "DIRECT_TEAM");
    teamMatchCounts.set(match.home.teamId, (teamMatchCounts.get(match.home.teamId) ?? 0) + 1);
    teamMatchCounts.set(match.away.teamId, (teamMatchCounts.get(match.away.teamId) ?? 0) + 1);
  }

  for (const team of teams) {
    assert.equal(teamMatchCounts.get(team.teamId), 3);
  }
});

test("Coppa Reghinna grouped knockout creates 31 matches with 4 QFs, 2 SFs, and 1 final", () => {
  const teams = buildTeams(16);
  const assignments = buildGroupAssignments(teams);
  const result = generateCompetitionStructure({
    format: "GROUPS_THEN_KNOCKOUT",
    teams,
    stages: buildStages("GROUPS_THEN_KNOCKOUT"),
    groupAssignments: assignments,
  });

  const quarterFinals = result.matches.filter((match) => match.knockoutRound === "QUARTER_FINAL");
  const semiFinals = result.matches.filter((match) => match.knockoutRound === "SEMI_FINAL");
  const finals = result.matches.filter((match) => match.knockoutRound === "FINAL");
  const thirdPlace = result.matches.filter((match) => match.knockoutRound === "THIRD_PLACE");

  assert.equal(result.matches.length, 31);
  assert.equal(result.preview.totalMatchCount, 31);
  assert.equal(result.preview.groupCount, 4);
  assert.equal(quarterFinals.length, 4);
  assert.equal(semiFinals.length, 2);
  assert.equal(finals.length, 1);
  assert.equal(thirdPlace.length, 0);

  const qualifiedSources = quarterFinals.flatMap((match) => [match.home, match.away]);
  assert.equal(qualifiedSources.length, 8);
  assert(qualifiedSources.every((source) => source.type === "GROUP_POSITION"));

  assert.deepEqual(
    quarterFinals.map((match) => match.roundLabel),
    ["QF1", "QF2", "QF3", "QF4"],
  );
  assert.deepEqual(
    semiFinals.flatMap((match) => [match.home.label, match.away.label]),
    ["Vincente QF1", "Vincente QF3", "Vincente QF2", "Vincente QF4"],
  );
  assert.deepEqual(
    finals.flatMap((match) => [match.home.label, match.away.label]),
    ["Vincente SF1", "Vincente SF2"],
  );
});

test("duplicate group assignments are rejected", () => {
  const teams = buildTeams(16);
  const assignments = buildGroupAssignments(teams);
  const duplicatedAssignments = [
    assignments[0],
    {
      ...assignments[1],
      tournamentTeamId: assignments[0].tournamentTeamId,
    },
    ...assignments.slice(2),
  ];

  assert.throws(
    () =>
      generateCompetitionStructure({
        format: "GROUPS_ONLY",
        teams,
        stages: buildStages("GROUPS_ONLY"),
        groupAssignments: duplicatedAssignments,
      }),
    /cannot belong to more than one group/i,
  );
});

test("missing group assignments are rejected", () => {
  const teams = buildTeams(16);
  const assignments = buildGroupAssignments(teams).slice(0, 15);

  assert.throws(
    () =>
      generateCompetitionStructure({
        format: "GROUPS_ONLY",
        teams,
        stages: buildStages("GROUPS_ONLY"),
        groupAssignments: assignments,
      }),
    /must have a group assignment/i,
  );
});

test("invalid knockout entry sizes are rejected", () => {
  const teams = buildTeams(8);
  const invalidStages: CompetitionStageDefinition[] = [
    {
      stageId: "stage-knockout",
      type: "KNOCKOUT_STAGE",
      order: 1,
      name: "Fase finale",
      knockoutTeamCount: 6,
      knockoutRound: "QUARTER_FINAL",
      includeThirdPlaceMatch: false,
      stageBreakDaysAfter: 0,
      pairingRule: "SEEDED_BRACKET",
    },
  ];

  assert.throws(
    () =>
      generateCompetitionStructure({
        format: "KNOCKOUT_ONLY",
        teams,
        stages: invalidStages,
      }),
    /power-of-two entry size/i,
  );
});
