import type { TournamentGroupsSnapshot } from "@/features/groups/types/group.types";
import type { MatchSummary } from "@/features/matches/types/match.types";
import {
  buildDefaultScheduleSlots,
  buildTournamentFormatPreview,
  deriveTournamentFormatFromPersistedStages,
  mapPersistedStagesToCompetitionInput,
} from "@/features/tournaments/server/tournament-competition";
import type { DashboardTournamentDetail } from "@/features/tournaments/server/get-dashboard-tournament-by-slug";
import { isGroupedTournamentFormat } from "@/features/tournaments/utils/tournament-format";

type StepStatus = "COMPLETE" | "INCOMPLETE" | "LOCKED";
type GroupStepStatus = "BLOCKED" | "INCOMPLETE" | "COMPLETE" | "INVALID";

export type TournamentSetupState = {
  settings: {
    status: StepStatus;
    isComplete: boolean;
    isLocked: boolean;
    message: string | null;
  };
  groups: {
    status: GroupStepStatus;
    isBlocked: boolean;
    isValid: boolean;
    assignedTeamCount: number;
    expectedTeamCount: number | null;
    existingGroupCount: number;
    expectedGroupCount: number | null;
    expectedTeamsPerGroup: number | null;
    issues: string[];
  };
  structure: {
    readyToGenerate: boolean;
    issues: string[];
    expectedStageCount: number;
    existingStageCount: number;
    configuredSlotCount: number;
    expectedSlotCount: number;
    generatedMatchCount: number;
    expectedMatchCount: number;
  };
  calendar: {
    canSchedule: boolean;
    generatedMatchCount: number;
    scheduledMatchCount: number;
    expectedMatchCount: number;
    status: "BLOCKED" | "INCOMPLETE" | "COMPLETE";
    message: string;
  };
  results: {
    isActive: boolean;
    message: string;
  };
  nextAllowedAction: "Save competition settings" | "Assign groups" | "Generate structure" | "Schedule calendar" | "Enter results";
};

function buildRequiredSlotLabel(expectedTeamsPerGroup: number) {
  return Array.from({ length: expectedTeamsPerGroup }, (_, index) => index + 1).join(", ");
}

function getExpectedStageCount(format: DashboardTournamentDetail["format"]) {
  switch (format) {
    case "GROUPS_THEN_KNOCKOUT":
      return 2;
    default:
      return 1;
  }
}

export function deriveDashboardTournamentSetupState(input: {
  tournament: Pick<
    DashboardTournamentDetail,
    | "format"
    | "expectedTeamCount"
    | "scheduleMaxMatchesPerDay"
    | "scheduleMinimumRestDays"
    | "scheduleSlots"
    | "stages"
  >;
  attachedTeamCount: number;
  groupsSnapshot: TournamentGroupsSnapshot | null;
  matches: MatchSummary[];
}): TournamentSetupState {
  const persistedFormat = deriveTournamentFormatFromPersistedStages(
    input.tournament.stages,
    input.tournament.format,
  );
  const persistedStages = mapPersistedStagesToCompetitionInput(input.tournament.stages);
  const groupStage = persistedStages.find(
    (stage): stage is Extract<(typeof persistedStages)[number], { type: "GROUP_STAGE" }> =>
      stage.type === "GROUP_STAGE",
  );
  const expectedStageCount = getExpectedStageCount(persistedFormat);
  const expectedSlotCount = buildDefaultScheduleSlots().length;
  const settingsComplete =
    input.tournament.expectedTeamCount !== null &&
    input.tournament.scheduleMaxMatchesPerDay !== null &&
    input.tournament.scheduleMinimumRestDays !== null &&
    input.tournament.scheduleSlots.length === expectedSlotCount &&
    input.tournament.stages.length === expectedStageCount &&
    persistedStages.length === expectedStageCount &&
    (!isGroupedTournamentFormat(persistedFormat) ||
      (groupStage !== undefined &&
        groupStage.groupCount > 0 &&
        groupStage.teamsPerGroup > 1 &&
        groupStage.legs > 0));

  const assignmentsExist =
    (input.groupsSnapshot?.assignedTeamCount ?? 0) > 0 ||
    (input.groupsSnapshot?.unassignedTeams.some((team) => team.groupSlot !== null) ?? false);
  const matchesExist = input.matches.length > 0;
  const settingsLockMessage = matchesExist
    ? "Competition settings are locked because matches have already been generated. Clear generated matches before changing competition settings."
    : assignmentsExist
      ? "Competition settings are locked because group assignments already exist. Clear group assignments before changing competition settings."
      : null;
  const settingsStatus: StepStatus = settingsLockMessage
    ? "LOCKED"
    : settingsComplete
      ? "COMPLETE"
      : "INCOMPLETE";

  const groupIssues: string[] = [];
  const expectedTeamCount = input.tournament.expectedTeamCount;
  const expectedGroupCount = groupStage?.groupCount ?? null;
  const expectedTeamsPerGroup = groupStage?.teamsPerGroup ?? null;
  const isGroupedFormat = isGroupedTournamentFormat(persistedFormat);

  if (isGroupedFormat && settingsComplete && input.groupsSnapshot && expectedGroupCount && expectedTeamsPerGroup) {
    if (input.groupsSnapshot.unassignedTeamCount > 0) {
      groupIssues.push(
        `${input.groupsSnapshot.unassignedTeamCount} team${input.groupsSnapshot.unassignedTeamCount === 1 ? " is" : "s are"} currently unassigned.`,
      );
    }

    for (const unassignedTeam of input.groupsSnapshot.unassignedTeams) {
      if (unassignedTeam.groupSlot !== null) {
        groupIssues.push(`Team ${unassignedTeam.name} has a slot value but is not assigned to any group.`);
      }
    }

    for (const group of input.groupsSnapshot.groups) {
      const seenSlots = new Set<number>();
      let hasDuplicateSlot = false;

      for (const team of group.teams) {
        if (team.groupSlot === null) {
          groupIssues.push(`Team ${team.name} has no group slot.`);
          continue;
        }

        if (team.groupSlot < 1 || team.groupSlot > expectedTeamsPerGroup) {
          groupIssues.push(
            `Team ${team.name} has invalid slot ${team.groupSlot}. Expected slot numbers ${buildRequiredSlotLabel(expectedTeamsPerGroup)}.`,
          );
        }

        if (seenSlots.has(team.groupSlot)) {
          hasDuplicateSlot = true;
        } else {
          seenSlots.add(team.groupSlot);
        }
      }

      if (hasDuplicateSlot) {
        groupIssues.push(`${group.name} has duplicate slot numbers.`);
      }

      if (group.teams.length !== expectedTeamsPerGroup) {
        groupIssues.push(
          `${group.name} has ${group.teams.length} team${group.teams.length === 1 ? "" : "s"} but ${expectedTeamsPerGroup} are required.`,
        );
      } else {
        const expectedSlots = new Set(
          Array.from({ length: expectedTeamsPerGroup }, (_, index) => index + 1),
        );
        const currentSlots = new Set(group.teams.map((team) => team.groupSlot).filter((slot): slot is number => slot !== null));

        if (
          currentSlots.size !== expectedSlots.size ||
          Array.from(expectedSlots).some((slot) => !currentSlots.has(slot))
        ) {
          groupIssues.push(
            `${group.name} must use slot numbers ${buildRequiredSlotLabel(expectedTeamsPerGroup)}.`,
          );
        }
      }
    }
  }

  let groupStatus: GroupStepStatus = "BLOCKED";

  if (!isGroupedFormat) {
    groupStatus = "BLOCKED";
  } else if (!settingsComplete) {
    groupStatus = "BLOCKED";
  } else if (!input.groupsSnapshot || expectedGroupCount === null || expectedTeamsPerGroup === null) {
    groupStatus = "BLOCKED";
    groupIssues.push("Current group records are not available yet.");
  } else if (input.groupsSnapshot.existingGroupCount !== expectedGroupCount) {
    groupStatus = "BLOCKED";
    groupIssues.push(`Groups: ${input.groupsSnapshot.existingGroupCount} / ${expectedGroupCount}. Save the current grouped competition settings first.`);
  } else if (input.groupsSnapshot.assignedTeamCount === 0) {
    groupStatus = "INCOMPLETE";
  } else if (groupIssues.length > 0) {
    groupStatus = "INVALID";
  } else {
    groupStatus = "COMPLETE";
  }

  const managedMatches = input.matches.filter((match) => match.stageId !== null);
  const scheduledManagedMatches = managedMatches.filter(
    (match) => match.startsAt !== null && match.endsAt !== null,
  );
  const expectedMatchCount =
    settingsComplete && persistedStages.length > 0
      ? buildTournamentFormatPreview(persistedFormat, {
          scheduleMaxMatchesPerDay: input.tournament.scheduleMaxMatchesPerDay,
          stages: persistedStages,
        }).totalMatchCount
      : 0;

  const structureIssues: string[] = [];

  if (!settingsComplete) {
    structureIssues.push("Save complete competition settings before generating the structure.");
  }

  if (input.tournament.stages.length !== expectedStageCount) {
    structureIssues.push(`Stages: ${input.tournament.stages.length} / ${expectedStageCount}.`);
  }

  if (input.tournament.scheduleSlots.length !== expectedSlotCount) {
    structureIssues.push(`Schedule slots: ${input.tournament.scheduleSlots.length} / ${expectedSlotCount}.`);
  }

  if (
    expectedTeamCount !== null &&
    input.attachedTeamCount !== expectedTeamCount
  ) {
    structureIssues.push(`Attached teams: ${input.attachedTeamCount} / ${expectedTeamCount}.`);
  }

  if (isGroupedFormat) {
    if (!input.groupsSnapshot || expectedGroupCount === null || expectedTeamsPerGroup === null) {
      structureIssues.push("Current group assignments are not available.");
    } else {
      if (groupStatus !== "COMPLETE") {
        structureIssues.push("Current group assignments are not valid yet.");
      }
      if (input.groupsSnapshot.existingGroupCount !== expectedGroupCount) {
        structureIssues.push(`Groups: ${input.groupsSnapshot.existingGroupCount} / ${expectedGroupCount}.`);
      }
      if (
        expectedTeamCount !== null &&
        input.groupsSnapshot.assignedTeamCount !== expectedTeamCount
      ) {
        structureIssues.push(`Assigned teams: ${input.groupsSnapshot.assignedTeamCount} / ${expectedTeamCount}.`);
      }
    }
  }

  if (managedMatches.length > 0) {
    structureIssues.push("Generated matches already exist. Clear generated matches before generating a new structure.");
  }

  const structureReady = structureIssues.length === 0;

  const calendarStatus =
    managedMatches.length === 0
      ? "BLOCKED"
      : scheduledManagedMatches.length === managedMatches.length
        ? "COMPLETE"
        : "INCOMPLETE";

  const calendarMessage =
    managedMatches.length === 0
      ? "Calendar scheduling becomes available after the structure has been generated."
      : scheduledManagedMatches.length === managedMatches.length
        ? "All generated matches have scheduled dates and times."
        : "Some generated matches still need dates and times.";

  const resultsActive = input.matches.length > 0;

  let nextAllowedAction: TournamentSetupState["nextAllowedAction"] = "Enter results";

  if (!settingsComplete) {
    nextAllowedAction = "Save competition settings";
  } else if (isGroupedFormat && groupStatus !== "COMPLETE") {
    nextAllowedAction = "Assign groups";
  } else if (managedMatches.length === 0) {
    nextAllowedAction = "Generate structure";
  } else if (scheduledManagedMatches.length < managedMatches.length) {
    nextAllowedAction = "Schedule calendar";
  }

  return {
    settings: {
      status: settingsStatus,
      isComplete: settingsComplete,
      isLocked: settingsStatus === "LOCKED",
      message: settingsLockMessage,
    },
    groups: {
      status: groupStatus,
      isBlocked: groupStatus === "BLOCKED",
      isValid: groupStatus === "COMPLETE",
      assignedTeamCount: input.groupsSnapshot?.assignedTeamCount ?? 0,
      expectedTeamCount,
      existingGroupCount: input.groupsSnapshot?.existingGroupCount ?? 0,
      expectedGroupCount,
      expectedTeamsPerGroup,
      issues: groupIssues,
    },
    structure: {
      readyToGenerate: structureReady,
      issues: structureIssues,
      expectedStageCount,
      existingStageCount: input.tournament.stages.length,
      configuredSlotCount: input.tournament.scheduleSlots.length,
      expectedSlotCount,
      generatedMatchCount: managedMatches.length,
      expectedMatchCount,
    },
    calendar: {
      canSchedule: managedMatches.length > 0,
      generatedMatchCount: managedMatches.length,
      scheduledMatchCount: scheduledManagedMatches.length,
      expectedMatchCount,
      status: calendarStatus,
      message: calendarMessage,
    },
    results: {
      isActive: resultsActive,
      message: resultsActive
        ? "Results and standings are active."
        : "Results can be entered after matches are generated.",
    },
    nextAllowedAction,
  };
}
