import assert from "node:assert/strict";
import test from "node:test";

import { deriveDashboardTournamentSetupState } from "@/features/tournaments/server/dashboard-tournament-setup";
import type { DashboardTournamentDetail } from "@/features/tournaments/server/get-dashboard-tournament-by-slug";
import type { TournamentGroupsSnapshot } from "@/features/groups/types/group.types";
import type { MatchSummary } from "@/features/matches/types/match.types";

function buildTournament(
  overrides: Partial<
    Pick<
      DashboardTournamentDetail,
      | "format"
      | "expectedTeamCount"
      | "scheduleMaxMatchesPerDay"
      | "scheduleMinimumRestDays"
      | "scheduleSlots"
      | "stages"
    >
  > = {},
): Pick<
  DashboardTournamentDetail,
  "format" | "expectedTeamCount" | "scheduleMaxMatchesPerDay" | "scheduleMinimumRestDays" | "scheduleSlots" | "stages"
> {
  return {
    format: "GROUPS_THEN_KNOCKOUT",
    expectedTeamCount: 16,
    scheduleMaxMatchesPerDay: 2,
    scheduleMinimumRestDays: 0,
    scheduleSlots: [
      { id: "slot-1", sequence: 1, startMinutes: 1320, durationMinutes: 60 },
      { id: "slot-2", sequence: 2, startMinutes: 1380, durationMinutes: 60 },
    ],
    stages: [
      {
        id: "stage-groups",
        order: 1,
        type: "GROUP_STAGE",
        name: "Fase a gironi",
        groupCount: 4,
        teamsPerGroup: 4,
        legs: 1,
        qualifiersPerGroup: 2,
        knockoutTeamCount: null,
        knockoutRound: null,
        includeThirdPlaceMatch: null,
        stageBreakDaysAfter: 0,
        configuration: null,
      },
      {
        id: "stage-knockout",
        order: 2,
        type: "KNOCKOUT_STAGE",
        name: "Fase finale",
        groupCount: null,
        teamsPerGroup: null,
        legs: null,
        qualifiersPerGroup: null,
        knockoutTeamCount: 8,
        knockoutRound: "QUARTER_FINAL",
        includeThirdPlaceMatch: false,
        stageBreakDaysAfter: 0,
        configuration: { pairingRule: "CROSS_ADJACENT_GROUPS" },
      },
    ],
    ...overrides,
  };
}

function buildGroupsSnapshot(options?: {
  assignedTeamCount?: number;
  unassignedTeamCount?: number;
  missingSlotTeamName?: string;
  duplicateSlotInFirstGroup?: boolean;
}) : TournamentGroupsSnapshot {
  const groups = Array.from({ length: 4 }, (_, groupIndex) => ({
    id: `group-${groupIndex + 1}`,
    tournamentId: "tournament-1",
    name: `Group ${String.fromCharCode(65 + groupIndex)}`,
    sequence: groupIndex + 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    teams: Array.from({ length: 4 }, (_, teamIndex) => ({
      tournamentTeamId: `tt-${groupIndex * 4 + teamIndex + 1}`,
      teamId: `team-${groupIndex * 4 + teamIndex + 1}`,
      organizationId: "org-1",
      name:
        options?.missingSlotTeamName && groupIndex === 3 && teamIndex === 0
          ? options.missingSlotTeamName
          : `Team ${groupIndex * 4 + teamIndex + 1}`,
      slug: `team-${groupIndex * 4 + teamIndex + 1}`,
      seed: groupIndex * 4 + teamIndex + 1,
      groupSlot:
        options?.missingSlotTeamName && groupIndex === 3 && teamIndex === 0
          ? null
          : options?.duplicateSlotInFirstGroup && groupIndex === 0 && teamIndex === 1
            ? 1
            : teamIndex + 1,
      playerCount: 5,
      createdAt: new Date(),
    })),
  }));

  const assignedTeamCount = options?.assignedTeamCount ?? 16;
  const trimmedGroups =
    assignedTeamCount === 16
      ? groups
      : groups.map((group, index) =>
          index === 3
            ? {
                ...group,
                teams: group.teams.slice(0, Math.max(0, assignedTeamCount - 12)),
              }
            : group,
        );

  return {
    groups: trimmedGroups,
    existingGroupCount: 4,
    assignedTeamCount,
    unassignedTeamCount: options?.unassignedTeamCount ?? 0,
    unassignedTeams:
      options?.unassignedTeamCount
        ? [
            {
              tournamentTeamId: "tt-16",
              teamId: "team-16",
              organizationId: "org-1",
              name: "Team 16",
              slug: "team-16",
              seed: 16,
              groupSlot: null,
              playerCount: 5,
              createdAt: new Date(),
            },
          ]
        : [],
    isUneven: false,
  };
}

function buildMatches(count: number, withSchedule = false): MatchSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `match-${index + 1}`,
    tournamentId: "tournament-1",
    stageId: "stage-groups",
    groupId: "group-1",
    homeTeamId: `team-${index * 2 + 1}`,
    awayTeamId: `team-${index * 2 + 2}`,
    homeTeamName: `Team ${index * 2 + 1}`,
    awayTeamName: `Team ${index * 2 + 2}`,
    roundLabel: `Match ${index + 1}`,
    startsAt: withSchedule ? new Date(Date.UTC(2026, 6, index + 1, 22, 0, 0)) : null,
    endsAt: withSchedule ? new Date(Date.UTC(2026, 6, index + 1, 23, 0, 0)) : null,
    locationLabel: null,
    status: "SCHEDULED",
    homeScore: null,
    awayScore: null,
  }));
}

test("settings are locked when group assignments exist", () => {
  const state = deriveDashboardTournamentSetupState({
    tournament: buildTournament(),
    attachedTeamCount: 16,
    groupsSnapshot: buildGroupsSnapshot(),
    matches: [],
  });

  assert.equal(state.settings.status, "LOCKED");
});

test("settings are locked when matches exist", () => {
  const state = deriveDashboardTournamentSetupState({
    tournament: buildTournament(),
    attachedTeamCount: 16,
    groupsSnapshot: buildGroupsSnapshot(),
    matches: buildMatches(1),
  });

  assert.equal(state.settings.status, "LOCKED");
  assert.match(state.settings.message ?? "", /partite sono gi[aà] state generate/i);
});

test("group assignment is blocked when settings are incomplete", () => {
  const state = deriveDashboardTournamentSetupState({
    tournament: buildTournament({ stages: [], scheduleSlots: [] }),
    attachedTeamCount: 16,
    groupsSnapshot: null,
    matches: [],
  });

  assert.equal(state.groups.status, "BLOCKED");
  assert.equal(state.nextAllowedAction, "Save competition settings");
});

test("generation is blocked when teams are unassigned", () => {
  const state = deriveDashboardTournamentSetupState({
    tournament: buildTournament(),
    attachedTeamCount: 16,
    groupsSnapshot: buildGroupsSnapshot({ assignedTeamCount: 15, unassignedTeamCount: 1 }),
    matches: [],
  });

  assert.equal(state.structure.readyToGenerate, false);
  assert(state.structure.issues.some((issue) => issue.includes("Squadre assegnate: 15 / 16")));
});

test("generation is blocked when group slots are invalid", () => {
  const state = deriveDashboardTournamentSetupState({
    tournament: buildTournament(),
    attachedTeamCount: 16,
    groupsSnapshot: buildGroupsSnapshot({ missingSlotTeamName: "Team 13" }),
    matches: [],
  });

  assert.equal(state.groups.status, "INVALID");
  assert(state.groups.issues.some((issue) => issue.includes("squadra Team 13 non ha uno slot")));
  assert.equal(state.structure.readyToGenerate, false);
});

test("generation is enabled when Coppa setup state is valid", () => {
  const state = deriveDashboardTournamentSetupState({
    tournament: buildTournament(),
    attachedTeamCount: 16,
    groupsSnapshot: buildGroupsSnapshot(),
    matches: [],
  });

  assert.equal(state.groups.status, "COMPLETE");
  assert.equal(state.structure.readyToGenerate, true);
  assert.equal(state.nextAllowedAction, "Generate structure");
});

test("setup summary reports the correct next allowed action", () => {
  const state = deriveDashboardTournamentSetupState({
    tournament: buildTournament(),
    attachedTeamCount: 16,
    groupsSnapshot: buildGroupsSnapshot(),
    matches: buildMatches(31, false),
  });

  assert.equal(state.nextAllowedAction, "Schedule calendar");
});

test("readiness state is derived from persisted stages", () => {
  const state = deriveDashboardTournamentSetupState({
    tournament: buildTournament({ format: "SINGLE_ROUND_ROBIN" }),
    attachedTeamCount: 16,
    groupsSnapshot: buildGroupsSnapshot(),
    matches: [],
  });

  assert.equal(state.groups.status, "COMPLETE");
  assert.equal(state.structure.readyToGenerate, true);
  assert.equal(state.nextAllowedAction, "Generate structure");
});
