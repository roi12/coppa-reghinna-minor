"use server";

import { MatchParticipantSourceType, MatchStatus, TournamentStageType } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireOwnerOrAdmin } from "@/features/auth/server/session";
import { buildGroupDistributionPlan } from "@/features/groups/utils/build-group-distribution-plan";
import { hasProtectedMatches } from "@/features/tournaments/server/competition-structure-guards";
import { calculateStandings } from "@/features/standings/server/calculate-standings";
import { generateCompetitionStructure } from "@/features/tournaments/server/generate-competition-structure";
import { scheduleCompetition } from "@/features/tournaments/server/schedule-competition";
import {
  mapPersistedStagesToCompetitionInput,
  parseScheduleSlotStartMinutes,
} from "@/features/tournaments/server/tournament-competition";
import {
  buildManualQualificationResolutionPlan,
  type ManualQualificationAssignment,
} from "@/features/tournaments/server/qualification-resolution";
import { getTournamentQualificationResolution } from "@/features/tournaments/server/get-tournament-qualification-resolution";
import { mapPersistedMatchToDefinition } from "@/features/tournaments/server/persisted-match-definition";
import {
  getDefaultTournamentStageVisibility,
  getKnockoutStageVisibilityState,
} from "@/features/tournaments/server/tournament-stage-visibility";
import { manageTournamentCompetitionStructureSchema } from "@/features/tournaments/schemas/manage-tournament-competition-structure.schema";
import {
  saveTournamentCompetitionSettingsSchema,
} from "@/features/tournaments/schemas/save-tournament-competition-settings.schema";
import type {
  CompetitionGroupAssignment,
  CompetitionMatchDefinition,
  CompetitionParticipantSource,
  CompetitionTeamInput,
} from "@/features/tournaments/types/competition.types";
import { normalizeTournamentFormat } from "@/features/tournaments/utils/tournament-format";
import { rethrowIfNextRedirectError } from "@/lib/redirect-error";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

import { revalidateTournamentPaths } from "./revalidate-tournament-paths";
import {
  buildCompetitionSettingsFromParsedInput,
  extractCompetitionSettingsFormInput,
  summarizeCompetitionSettingsFormInput,
  summarizeCompetitionSettingsValidationErrors,
  validateCompetitionSettings,
} from "./competition-settings-form";
import { validateManageCompetitionStructure } from "./competition-structure-form";

function redirectWithMessage(path: string, type: "success" | "error", message: string): never {
  const searchParams = new URLSearchParams({
    type,
    message,
  });

  redirect(`${path}?${searchParams.toString()}`);
}

function buildDashboardPath(tournamentSlug: string) {
  return `/dashboard/tournaments/${tournamentSlug}`;
}

const toggleTournamentFinalPhaseVisibilitySchema = z.object({
  tournamentId: z.string().cuid(),
  tournamentSlug: z.string().trim().min(1),
  isPublic: z.enum(["true", "false"]).transform((value) => value === "true"),
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function buildTeamInputs(
  tournamentTeams: Array<{
    id: string;
    seed: number | null;
    createdAt: Date;
    team: {
      id: string;
      name: string;
    };
  }>,
): CompetitionTeamInput[] {
  return tournamentTeams.map((entry) => ({
    tournamentTeamId: entry.id,
    teamId: entry.team.id,
    teamName: entry.team.name,
    seed: entry.seed,
    createdAt: entry.createdAt,
  }));
}

function buildGroupAssignments(
  tournamentTeams: Array<{
    id: string;
    seed: number | null;
    createdAt: Date;
    groupId: string | null;
    groupSlot: number | null;
    team: {
      id: string;
      name: string;
    };
  }>,
  groups: Array<{
    id: string;
    name: string;
    sequence: number;
  }>,
): CompetitionGroupAssignment[] {
  const groupsById = new Map(groups.map((group) => [group.id, group]));

  return tournamentTeams.flatMap((entry) => {
    if (!entry.groupId || entry.groupSlot === null) {
      return [];
    }

    const group = groupsById.get(entry.groupId);

    if (!group) {
      return [];
    }

    return [
      {
        tournamentTeamId: entry.id,
        teamId: entry.team.id,
        teamName: entry.team.name,
        seed: entry.seed,
        createdAt: entry.createdAt,
        groupId: group.id,
        groupName: group.name,
        groupSequence: group.sequence,
        groupSlot: entry.groupSlot,
      },
    ];
  });
}

async function ensureTournamentExists(tournamentId: string, tournamentSlug: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      slug: true,
      name: true,
      format: true,
      expectedTeamCount: true,
      scheduleStartDate: true,
      scheduleMaxMatchesPerDay: true,
      scheduleMinimumRestDays: true,
      teams: {
        orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          seed: true,
          createdAt: true,
          groupId: true,
          groupSlot: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      groups: {
        orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          sequence: true,
        },
      },
      stages: {
        orderBy: { order: "asc" },
      },
      scheduleSlots: {
        orderBy: { sequence: "asc" },
      },
    },
  });

  if (!tournament || tournament.slug !== tournamentSlug) {
    throw new Error("Tournament not found.");
  }

  return tournament;
}

function buildMatchWriteData(
  match: CompetitionMatchDefinition,
  createdMatchIdsByKey: Map<string, string>,
) {
  const baseData = {
    stageId: match.stageId,
    groupId: match.groupId,
    sequence: match.sequence,
    roundLabel: match.roundLabel,
    startsAt: null,
    endsAt: null,
    locationLabel: null,
    status: MatchStatus.SCHEDULED,
    homeScore: null,
    awayScore: null,
  };

  const applySource = (
    side: "home" | "away",
    source: CompetitionParticipantSource,
  ) => {
    switch (source.type) {
      case "DIRECT_TEAM":
        return {
          [`${side}TeamId`]: source.teamId,
          [`${side}ParticipantSourceType`]: MatchParticipantSourceType.DIRECT_TEAM,
          [`${side}SourceTeamId`]: source.teamId,
        };
      case "GROUP_POSITION":
        return {
          [`${side}TeamId`]: null,
          [`${side}ParticipantSourceType`]: MatchParticipantSourceType.GROUP_POSITION,
          [`${side}SourceGroupId`]: source.groupId,
          [`${side}SourceGroupPosition`]: source.position,
        };
      case "MATCH_WINNER":
        return {
          [`${side}TeamId`]: null,
          [`${side}ParticipantSourceType`]: MatchParticipantSourceType.MATCH_WINNER,
          [`${side}SourceMatchId`]: createdMatchIdsByKey.get(source.matchKey) ?? null,
        };
      case "MATCH_LOSER":
        return {
          [`${side}TeamId`]: null,
          [`${side}ParticipantSourceType`]: MatchParticipantSourceType.MATCH_LOSER,
          [`${side}SourceMatchId`]: createdMatchIdsByKey.get(source.matchKey) ?? null,
        };
    }
  };

  return {
    ...baseData,
    ...applySource("home", match.home),
    ...applySource("away", match.away),
  };
}

function hasAmbiguousRankingAtPosition(
  rows: Array<{
    points: number;
    goalDifference: number;
    goalsFor: number;
  }>,
  position: number,
) {
  const row = rows[position - 1];

  if (!row) {
    return true;
  }

  const tiedRows = rows.filter(
    (candidate) =>
      candidate.points === row.points &&
      candidate.goalDifference === row.goalDifference &&
      candidate.goalsFor === row.goalsFor,
  );

  return tiedRows.length > 1;
}

export async function saveTournamentCompetitionSettingsAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const rawInput = extractCompetitionSettingsFormInput(formData);
  const parsed = saveTournamentCompetitionSettingsSchema.safeParse(rawInput);

  const dashboardPath = buildDashboardPath(String(formData.get("tournamentSlug") ?? ""));

  if (!parsed.success) {
    if (process.env.NODE_ENV !== "production") {
      console.error("saveTournamentCompetitionSettingsAction validation failed", {
        payload: summarizeCompetitionSettingsFormInput(rawInput),
        fieldErrors: summarizeCompetitionSettingsValidationErrors(parsed.error),
      });
    }

    return redirectWithMessage(dashboardPath, "error", "Enter a valid competition configuration.");
  }

  try {
    const settings = buildCompetitionSettingsFromParsedInput(parsed.data);
    validateCompetitionSettings(settings);

    await prisma.$transaction(async (transaction) => {
      const tournament = await transaction.tournament.findUnique({
        where: { id: parsed.data.tournamentId },
        select: {
          id: true,
          slug: true,
          matches: {
            where: {
              stageId: {
                not: null,
              },
            },
            select: {
              id: true,
            },
            take: 1,
          },
        },
      });

      if (!tournament || tournament.slug !== parsed.data.tournamentSlug) {
        throw new Error("Tournament not found.");
      }

      if (tournament.matches.length > 0) {
        throw new Error("Competition settings cannot change while generated stage-managed matches still exist.");
      }

      await transaction.tournament.update({
        where: { id: tournament.id },
        data: {
          format: parsed.data.format,
          expectedTeamCount: settings.expectedTeamCount,
          scheduleStartDate: settings.scheduleStartDate,
          scheduleMaxMatchesPerDay: settings.scheduleMaxMatchesPerDay,
          scheduleMinimumRestDays: settings.scheduleMinimumRestDays,
        },
      });

      await transaction.tournamentScheduleSlot.deleteMany({
        where: { tournamentId: tournament.id },
      });

      await transaction.tournamentStage.deleteMany({
        where: { tournamentId: tournament.id },
      });

      for (const [index, slot] of settings.scheduleSlots.entries()) {
        await transaction.tournamentScheduleSlot.create({
          data: {
            tournamentId: tournament.id,
            sequence: index + 1,
            startMinutes: parseScheduleSlotStartMinutes(slot.startTime),
            durationMinutes: slot.durationMinutes,
          },
        });
      }

      const createdStages: Array<{ id: string; type: TournamentStageType; order: number }> = [];

      for (const stage of settings.stages) {
        const createdStage = await transaction.tournamentStage.create({
          data: {
            tournamentId: tournament.id,
            order: stage.order,
            type: stage.type,
            name: stage.name,
            isPublic: getDefaultTournamentStageVisibility(stage.type),
            groupCount: stage.type === "GROUP_STAGE" ? stage.groupCount : null,
            teamsPerGroup: stage.type === "GROUP_STAGE" ? stage.teamsPerGroup : null,
            legs: stage.type === "GROUP_STAGE" ? stage.legs : null,
            qualifiersPerGroup: stage.type === "GROUP_STAGE" ? stage.qualifiersPerGroup : null,
            knockoutTeamCount: stage.type === "KNOCKOUT_STAGE" ? stage.knockoutTeamCount : null,
            knockoutRound: stage.type === "KNOCKOUT_STAGE" ? stage.knockoutRound : null,
            includeThirdPlaceMatch:
              stage.type === "KNOCKOUT_STAGE" ? stage.includeThirdPlaceMatch : null,
            stageBreakDaysAfter: stage.stageBreakDaysAfter,
            configuration:
              stage.type === "KNOCKOUT_STAGE" ? { pairingRule: stage.pairingRule } : undefined,
          },
          select: {
            id: true,
            type: true,
            order: true,
          },
        });

        createdStages.push(createdStage);
      }

      const groupedStage = settings.stages.find((stage) => stage.type === "GROUP_STAGE");

      if (!groupedStage || groupedStage.groupCount <= 1) {
        await transaction.tournamentTeam.updateMany({
          where: { tournamentId: tournament.id },
          data: {
            groupId: null,
            groupSlot: null,
          },
        });

        await transaction.tournamentGroup.deleteMany({
          where: { tournamentId: tournament.id },
        });

        return;
      }

      const createdGroupStage = createdStages.find((stage) => stage.type === TournamentStageType.GROUP_STAGE);

      assert(createdGroupStage, "Group stage could not be persisted.");

      await transaction.tournamentTeam.updateMany({
        where: { tournamentId: tournament.id },
        data: {
          groupId: null,
          groupSlot: null,
        },
      });

      await transaction.tournamentGroup.deleteMany({
        where: { tournamentId: tournament.id },
      });

      for (let sequence = 1; sequence <= groupedStage.groupCount; sequence += 1) {
        await transaction.tournamentGroup.create({
          data: {
            tournamentId: tournament.id,
            stageId: createdGroupStage.id,
            name: `Group ${String.fromCharCode(64 + sequence)}`,
            sequence,
          },
        });
      }
    });

    revalidateTournamentPaths(parsed.data.tournamentSlug);

    return redirectWithMessage(dashboardPath, "success", "Competition settings saved.");
  } catch (error) {
    rethrowIfNextRedirectError(error);

    if (error instanceof Error) {
      return redirectWithMessage(dashboardPath, "error", error.message);
    }

    throw error;
  }
}

export async function toggleTournamentFinalPhaseVisibilityAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = toggleTournamentFinalPhaseVisibilitySchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    tournamentSlug: formData.get("tournamentSlug"),
    isPublic: formData.get("isPublic"),
  });

  const dashboardPath = buildDashboardPath(String(formData.get("tournamentSlug") ?? ""));

  if (!parsed.success) {
    return redirectWithMessage(
      dashboardPath,
      "error",
      "Choose a valid tournament before changing public visibility.",
    );
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: parsed.data.tournamentId },
      select: {
        id: true,
        slug: true,
        stages: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            isPublic: true,
          },
        },
      },
    });

    if (!tournament || tournament.slug !== parsed.data.tournamentSlug) {
      throw new Error("Tournament not found.");
    }

    const visibility = getKnockoutStageVisibilityState(tournament.stages);

    if (!visibility.hasKnockoutStage || visibility.knockoutStageIds.length === 0) {
      throw new Error("No final phase is configured for this tournament.");
    }

    await prisma.tournamentStage.updateMany({
      where: {
        tournamentId: tournament.id,
        type: TournamentStageType.KNOCKOUT_STAGE,
      },
      data: {
        isPublic: parsed.data.isPublic,
      },
    });

    revalidateTournamentPaths(parsed.data.tournamentSlug);

    return redirectWithMessage(
      dashboardPath,
      "success",
      parsed.data.isPublic
        ? "Final phase is now visible on public pages."
        : "Final phase is now hidden from public pages.",
    );
  } catch (error) {
    rethrowIfNextRedirectError(error);

    if (error instanceof Error) {
      return redirectWithMessage(dashboardPath, "error", error.message);
    }

    throw error;
  }
}

export async function generateTournamentCompetitionStructureAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = validateManageCompetitionStructure(formData);

  const dashboardPath = buildDashboardPath(String(formData.get("tournamentSlug") ?? ""));

  if (!parsed.success) {
    return redirectWithMessage(dashboardPath, "error", "Choose a valid tournament to generate.");
  }

  try {
    const tournament = await ensureTournamentExists(parsed.data.tournamentId, parsed.data.tournamentSlug);
    const format = normalizeTournamentFormat(tournament.format);

    if (tournament.stages.length === 0) {
      throw new Error("Save the competition settings before generating the structure.");
    }

    const allMatches = await prisma.match.findMany({
      where: { tournamentId: tournament.id },
      select: {
        id: true,
        stageId: true,
        status: true,
        homeScore: true,
        awayScore: true,
      },
    });

    const managedMatches = allMatches.filter((match) => match.stageId !== null);
    const legacyMatches = allMatches.filter((match) => match.stageId === null);

    if (managedMatches.length > 0) {
      if (parsed.data.replacementMode !== "REPLACE_MANAGED_SCHEDULED") {
        throw new Error("Generated structure already exists. Use the explicit replacement mode only before results are recorded.");
      }

      if (hasProtectedMatches(managedMatches)) {
        throw new Error("Generated structure cannot be replaced because some managed matches are live or completed.");
      }
    }

    if (legacyMatches.length > 0) {
      if (parsed.data.replacementMode !== "REPLACE_LEGACY_SCHEDULED") {
        throw new Error("Legacy matches already exist for this tournament. Replacement requires explicit confirmation.");
      }

      if (process.env.APP_ENV !== "local" || tournament.slug !== "coppa-reghinna-minor-2026") {
        throw new Error("Legacy match replacement is allowed only for the local Coppa Reghinna Minor test tournament.");
      }

      if (hasProtectedMatches(legacyMatches)) {
        throw new Error("Legacy matches cannot be replaced because some are live or completed.");
      }
    }

    const teams = buildTeamInputs(tournament.teams);
    const stages = mapPersistedStagesToCompetitionInput(tournament.stages);
    const groupAssignments = buildGroupAssignments(tournament.teams, tournament.groups);
    const generatedStructure = generateCompetitionStructure({
      format,
      teams,
      stages,
      groupAssignments,
    });

    await prisma.$transaction(async (transaction) => {
      if (managedMatches.length > 0) {
        await transaction.match.deleteMany({
          where: {
            tournamentId: tournament.id,
            stageId: {
              not: null,
            },
            status: MatchStatus.SCHEDULED,
          },
        });
      }

      if (legacyMatches.length > 0 && parsed.data.replacementMode === "REPLACE_LEGACY_SCHEDULED") {
        await transaction.match.deleteMany({
          where: {
            tournamentId: tournament.id,
            stageId: null,
            status: MatchStatus.SCHEDULED,
          },
        });
      }

      const createdMatchIdsByKey = new Map<string, string>();

      for (const match of generatedStructure.matches) {
        const createdMatch = await transaction.match.create({
          data: {
            tournamentId: tournament.id,
            ...buildMatchWriteData(match, createdMatchIdsByKey),
          },
          select: {
            id: true,
          },
        });

        createdMatchIdsByKey.set(match.key, createdMatch.id);
      }
    });

    revalidateTournamentPaths(parsed.data.tournamentSlug);

    return redirectWithMessage(
      dashboardPath,
      "success",
      `Competition structure generated: ${generatedStructure.preview.totalMatchCount} matches created without scheduling.`,
    );
  } catch (error) {
    rethrowIfNextRedirectError(error);

    if (error instanceof Error) {
      return redirectWithMessage(dashboardPath, "error", error.message);
    }

    throw error;
  }
}

export async function rescheduleTournamentCompetitionAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = manageTournamentCompetitionStructureSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    tournamentSlug: formData.get("tournamentSlug"),
  });

  const dashboardPath = buildDashboardPath(String(formData.get("tournamentSlug") ?? ""));

  if (!parsed.success) {
    return redirectWithMessage(dashboardPath, "error", "Choose a valid tournament to reschedule.");
  }

  try {
    const tournament = await ensureTournamentExists(parsed.data.tournamentId, parsed.data.tournamentSlug);

    assert(tournament.scheduleStartDate, "Set a schedule start date before rescheduling matches.");
    assert(
      tournament.scheduleMaxMatchesPerDay && tournament.scheduleMaxMatchesPerDay > 0,
      "Set the maximum matches per day before rescheduling.",
    );
    assert(tournament.scheduleSlots.length > 0, "Configure at least one daily slot before rescheduling.");

    const scheduledManagedMatches = await prisma.match.findMany({
      where: {
        tournamentId: tournament.id,
        stageId: {
          not: null,
        },
        status: MatchStatus.SCHEDULED,
      },
      orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        stageId: true,
        sequence: true,
        roundLabel: true,
        homeTeamId: true,
        awayTeamId: true,
        homeParticipantSourceType: true,
        awayParticipantSourceType: true,
        homeSourceTeamId: true,
        awaySourceTeamId: true,
        homeSourceGroupId: true,
        awaySourceGroupId: true,
        homeSourceGroupPosition: true,
        awaySourceGroupPosition: true,
        homeSourceMatchId: true,
        awaySourceMatchId: true,
        groupId: true,
        stage: {
          select: {
            id: true,
            order: true,
            type: true,
            name: true,
            knockoutRound: true,
          },
        },
        homeTeam: {
          select: {
            name: true,
          },
        },
        awayTeam: {
          select: {
            name: true,
          },
        },
        homeSourceGroup: {
          select: {
            name: true,
          },
        },
        awaySourceGroup: {
          select: {
            name: true,
          },
        },
      },
    });

    if (scheduledManagedMatches.length === 0) {
      throw new Error("No generated scheduled matches were found for this tournament.");
    }

    const stageDefinitions = mapPersistedStagesToCompetitionInput(tournament.stages);
    const stageBreakDaysByStageId = Object.fromEntries(
      stageDefinitions.map((stage) => [stage.stageId, stage.stageBreakDaysAfter]),
    );

    const scheduledDefinitions = scheduledManagedMatches.map((match) => mapPersistedMatchToDefinition(match));
    const scheduledMatches = scheduleCompetition(scheduledDefinitions, {
      startDate: tournament.scheduleStartDate,
      maxMatchesPerDay: tournament.scheduleMaxMatchesPerDay,
      minimumRestDays: tournament.scheduleMinimumRestDays ?? 0,
      slots: tournament.scheduleSlots.map((slot) => ({
        sequence: slot.sequence,
        startMinutes: slot.startMinutes,
        durationMinutes: slot.durationMinutes,
      })),
      stageBreakDaysByStageId,
    });

    await prisma.$transaction(
      scheduledMatches.map((match) =>
        prisma.match.update({
          where: { id: match.key },
          data: {
            startsAt: match.startsAt,
            endsAt: match.endsAt,
          },
        }),
      ),
    );

    revalidateTournamentPaths(parsed.data.tournamentSlug);

    return redirectWithMessage(
      dashboardPath,
      "success",
      `Rescheduled ${scheduledMatches.length} generated match(es) using the saved calendar settings.`,
    );
  } catch (error) {
    rethrowIfNextRedirectError(error);

    if (error instanceof Error) {
      return redirectWithMessage(dashboardPath, "error", error.message);
    }

    throw error;
  }
}

export async function deleteTournamentCompetitionStructureAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = manageTournamentCompetitionStructureSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    tournamentSlug: formData.get("tournamentSlug"),
  });

  const dashboardPath = buildDashboardPath(String(formData.get("tournamentSlug") ?? ""));

  if (!parsed.success) {
    return redirectWithMessage(dashboardPath, "error", "Choose a valid tournament structure to delete.");
  }

  try {
    const tournament = await ensureTournamentExists(parsed.data.tournamentId, parsed.data.tournamentSlug);
    const managedMatches = await prisma.match.findMany({
      where: {
        tournamentId: tournament.id,
        stageId: {
          not: null,
        },
      },
      select: {
        id: true,
        status: true,
        homeScore: true,
        awayScore: true,
      },
    });

    if (managedMatches.length === 0) {
      throw new Error("No generated stage-managed structure exists for this tournament.");
    }

    if (hasProtectedMatches(managedMatches)) {
      throw new Error("Generated structure cannot be deleted because some managed matches are live or completed.");
    }

    const deleteResult = await prisma.match.deleteMany({
      where: {
        tournamentId: tournament.id,
        stageId: {
          not: null,
        },
        status: MatchStatus.SCHEDULED,
      },
    });

    revalidateTournamentPaths(parsed.data.tournamentSlug);

    return redirectWithMessage(
      dashboardPath,
      "success",
      `Deleted ${deleteResult.count} generated scheduled match(es).`,
    );
  } catch (error) {
    rethrowIfNextRedirectError(error);

    if (error instanceof Error) {
      return redirectWithMessage(dashboardPath, "error", error.message);
    }

    throw error;
  }
}

export async function autoAssignTournamentGroupsAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const tournamentSlug = String(formData.get("tournamentSlug") ?? "");
  const useRandomizedAssignment = String(formData.get("assignmentMode") ?? "") === "RANDOMIZE";
  const dashboardPath = buildDashboardPath(tournamentSlug);

  try {
    const tournament = await ensureTournamentExists(tournamentId, tournamentSlug);
    const groupStage = mapPersistedStagesToCompetitionInput(tournament.stages).find(
      (
        stage,
      ): stage is Extract<ReturnType<typeof mapPersistedStagesToCompetitionInput>[number], { type: "GROUP_STAGE" }> =>
        stage.type === "GROUP_STAGE" && stage.groupCount > 1,
    );

    if (!groupStage) {
      throw new Error("Save a grouped competition configuration before creating group assignments.");
    }

    const teamInputs = buildTeamInputs(tournament.teams);

    if (teamInputs.length !== groupStage.groupCount * groupStage.teamsPerGroup) {
      throw new Error("The attached tournament team count does not match the configured grouped format.");
    }

    const groups = tournament.groups
      .slice()
      .sort((left, right) => left.sequence - right.sequence);

    if (groups.length !== groupStage.groupCount) {
      throw new Error("The persisted group count does not match the configured grouped format.");
    }

    const sourceTeams = useRandomizedAssignment
      ? [...teamInputs].sort(() => Math.random() - 0.5)
      : teamInputs;
    const distributionPlan = buildGroupDistributionPlan(sourceTeams, groupStage.groupCount);

    await prisma.$transaction(async (transaction) => {
      for (const group of groups) {
        await transaction.tournamentTeam.updateMany({
          where: {
            tournamentId,
            groupId: group.id,
          },
          data: {
            groupId: null,
            groupSlot: null,
          },
        });
      }

      const groupsBySequence = new Map(groups.map((group) => [group.sequence, group.id]));

      for (const group of distributionPlan.groups) {
        const groupId = groupsBySequence.get(group.groupSequence);

        assert(groupId, "A configured group could not be found.");

        for (const assignment of group.teams) {
          await transaction.tournamentTeam.update({
            where: { id: assignment.tournamentTeamId },
            data: {
              groupId,
              groupSlot: assignment.groupSlot,
            },
          });
        }
      }
    });

    revalidateTournamentPaths(tournamentSlug);

    return redirectWithMessage(
      dashboardPath,
      "success",
      useRandomizedAssignment ? "Groups randomized and assigned." : "Groups assigned using seeded distribution.",
    );
  } catch (error) {
    rethrowIfNextRedirectError(error);

    if (error instanceof Error) {
      return redirectWithMessage(dashboardPath, "error", error.message);
    }

    throw error;
  }
}

export async function resolveTournamentKnockoutParticipantsAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = manageTournamentCompetitionStructureSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    tournamentSlug: formData.get("tournamentSlug"),
  });

  const dashboardPath = buildDashboardPath(String(formData.get("tournamentSlug") ?? ""));

  if (!parsed.success) {
    return redirectWithMessage(dashboardPath, "error", "Choose a valid tournament to resolve.");
  }

  try {
    const tournament = await ensureTournamentExists(parsed.data.tournamentId, parsed.data.tournamentSlug);
    const stageDefinitions = mapPersistedStagesToCompetitionInput(tournament.stages);
    const groupStage = stageDefinitions.find(
      (
        stage,
      ): stage is Extract<(typeof stageDefinitions)[number], { type: "GROUP_STAGE" }> =>
        stage.type === "GROUP_STAGE" && stage.groupCount > 1,
    );

    if (!groupStage) {
      throw new Error("No grouped qualification stage is configured for this tournament.");
    }

    const groups = await prisma.tournamentGroup.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { sequence: "asc" },
      select: {
        id: true,
        name: true,
        matches: {
          where: {
            stage: {
              type: TournamentStageType.GROUP_STAGE,
            },
          },
          select: {
            status: true,
            homeScore: true,
            awayScore: true,
            homeTeamId: true,
            awayTeamId: true,
            homeTeam: {
              select: {
                name: true,
              },
            },
            awayTeam: {
              select: {
                name: true,
              },
            },
          },
        },
        teams: {
          where: {
            groupId: {
              not: null,
            },
          },
          select: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const resolvedGroupPositions = new Map<string, Map<number, string>>();

    for (const group of groups) {
      const allGroupMatchesCompleted = group.matches.every(
        (match) =>
          match.status === MatchStatus.FINAL &&
          match.homeScore !== null &&
          match.awayScore !== null &&
          match.homeTeamId !== null &&
          match.awayTeamId !== null,
      );

      if (!allGroupMatchesCompleted) {
        continue;
      }

      const rows = calculateStandings(
        group.matches.map((match) => ({
          homeTeamId: match.homeTeamId as string,
          awayTeamId: match.awayTeamId as string,
          homeTeamName: match.homeTeam?.name ?? "Squadra",
          awayTeamName: match.awayTeam?.name ?? "Squadra",
          homeScore: match.homeScore as number,
          awayScore: match.awayScore as number,
        })),
      );

      for (let position = 1; position <= groupStage.qualifiersPerGroup; position += 1) {
        if (hasAmbiguousRankingAtPosition(rows, position)) {
          continue;
        }

        const row = rows[position - 1];

        if (!row) {
          continue;
        }

        const groupPositions = resolvedGroupPositions.get(group.id) ?? new Map<number, string>();
        groupPositions.set(position, row.teamId);
        resolvedGroupPositions.set(group.id, groupPositions);
      }
    }

    const knockoutMatches = await prisma.match.findMany({
      where: {
        tournamentId: tournament.id,
        stage: {
          type: TournamentStageType.KNOCKOUT_STAGE,
        },
      },
      orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        homeParticipantLocked: true,
        awayParticipantLocked: true,
        homeParticipantSourceType: true,
        awayParticipantSourceType: true,
        homeSourceGroupId: true,
        awaySourceGroupId: true,
        homeSourceGroupPosition: true,
        awaySourceGroupPosition: true,
        homeSourceMatchId: true,
        awaySourceMatchId: true,
        homeSourceMatch: {
          select: {
            id: true,
            status: true,
            homeTeamId: true,
            awayTeamId: true,
            homeScore: true,
            awayScore: true,
          },
        },
        awaySourceMatch: {
          select: {
            id: true,
            status: true,
            homeTeamId: true,
            awayTeamId: true,
            homeScore: true,
            awayScore: true,
          },
        },
      },
    });

    let updateCount = 0;

    for (const match of knockoutMatches) {
      const resolveFromSource = (
        side: "home" | "away",
      ) => {
        const sourceType =
          side === "home" ? match.homeParticipantSourceType : match.awayParticipantSourceType;
        const sourceGroupId = side === "home" ? match.homeSourceGroupId : match.awaySourceGroupId;
        const sourceGroupPosition =
          side === "home" ? match.homeSourceGroupPosition : match.awaySourceGroupPosition;
        const sourceMatch = side === "home" ? match.homeSourceMatch : match.awaySourceMatch;

        if (sourceType === MatchParticipantSourceType.GROUP_POSITION) {
          if (!sourceGroupId || !sourceGroupPosition) {
            return null;
          }

          return resolvedGroupPositions.get(sourceGroupId)?.get(sourceGroupPosition) ?? null;
        }

        if (
          (sourceType === MatchParticipantSourceType.MATCH_WINNER ||
            sourceType === MatchParticipantSourceType.MATCH_LOSER) &&
          sourceMatch &&
          sourceMatch.status === MatchStatus.FINAL &&
          sourceMatch.homeScore !== null &&
          sourceMatch.awayScore !== null &&
          sourceMatch.homeTeamId &&
          sourceMatch.awayTeamId &&
          sourceMatch.homeScore !== sourceMatch.awayScore
        ) {
          const winnerTeamId =
            sourceMatch.homeScore > sourceMatch.awayScore ? sourceMatch.homeTeamId : sourceMatch.awayTeamId;
          const loserTeamId =
            sourceMatch.homeScore > sourceMatch.awayScore ? sourceMatch.awayTeamId : sourceMatch.homeTeamId;

          return sourceType === MatchParticipantSourceType.MATCH_WINNER ? winnerTeamId : loserTeamId;
        }

        return null;
      };

      const nextHomeTeamId = !match.homeParticipantLocked ? resolveFromSource("home") : null;
      const nextAwayTeamId = !match.awayParticipantLocked ? resolveFromSource("away") : null;
      const data: Record<string, string | null> = {};

      if (nextHomeTeamId && match.homeTeamId !== nextHomeTeamId) {
        data.homeTeamId = nextHomeTeamId;
      }

      if (nextAwayTeamId && match.awayTeamId !== nextAwayTeamId) {
        data.awayTeamId = nextAwayTeamId;
      }

      if (Object.keys(data).length === 0) {
        continue;
      }

      await prisma.match.update({
        where: { id: match.id },
        data,
      });
      updateCount += 1;
    }

    revalidateTournamentPaths(parsed.data.tournamentSlug);

    return redirectWithMessage(
      dashboardPath,
      "success",
      updateCount === 0
        ? "No knockout participants were auto-resolved. Check group completion, ties, or upstream results."
        : `Resolved participants for ${updateCount} knockout match(es).`,
    );
  } catch (error) {
    rethrowIfNextRedirectError(error);

    if (error instanceof Error) {
      return redirectWithMessage(dashboardPath, "error", error.message);
    }

    throw error;
  }
}

export async function manuallyResolveTournamentKnockoutParticipantsAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const tournamentSlug = String(formData.get("tournamentSlug") ?? "");
  const confirmation = String(formData.get("manualConfirmation") ?? "");
  const dashboardPath = buildDashboardPath(tournamentSlug);

  if (confirmation !== "CONFIRMED") {
    return redirectWithMessage(
      dashboardPath,
      "error",
      "Conferma la risoluzione manuale prima di salvare le qualificazioni.",
    );
  }

  const assignmentMatchIds = formData.getAll("assignmentMatchId").map((value) => String(value ?? ""));
  const assignmentSides = formData.getAll("assignmentSide").map((value) => String(value ?? ""));
  const assignmentTeamIds = formData.getAll("assignmentTeamId").map((value) => String(value ?? ""));

  if (
    assignmentMatchIds.length !== assignmentSides.length ||
    assignmentMatchIds.length !== assignmentTeamIds.length
  ) {
    return redirectWithMessage(
      dashboardPath,
      "error",
      "Completa tutte le assegnazioni manuali prima di confermare.",
    );
  }

  if (assignmentMatchIds.length === 0) {
    return redirectWithMessage(
      dashboardPath,
      "error",
      "Non ci sono posizioni da risolvere manualmente.",
    );
  }

  try {
    const tournament = await ensureTournamentExists(tournamentId, tournamentSlug);
    const snapshot = await getTournamentQualificationResolution(tournament.id);

    if (snapshot.unresolvedSlots.length === 0) {
      throw new Error("Nessuna posizione qualificante richiede una risoluzione manuale.");
    }

    const assignments: ManualQualificationAssignment[] = assignmentMatchIds.map((matchId, index) => {
      const side = assignmentSides[index];

      if (side !== "home" && side !== "away") {
        throw new Error("La posizione selezionata non è valida.");
      }

      const teamId = assignmentTeamIds[index] ?? "";

      if (teamId.trim().length === 0) {
        throw new Error("Seleziona una squadra per ogni posizione qualificante.");
      }

      return {
        matchId,
        side,
        teamId,
      };
    });

    const plan = buildManualQualificationResolutionPlan(snapshot, assignments);

    await prisma.$transaction(async (transaction) => {
      for (const step of plan) {
        await transaction.match.update({
          where: { id: step.matchId },
          data:
            step.side === "home"
              ? {
                  homeTeamId: step.teamId,
                  homeParticipantLocked: true,
                }
              : {
                  awayTeamId: step.teamId,
                  awayParticipantLocked: true,
                },
        });
      }
    });

    revalidateTournamentPaths(tournamentSlug);

    return redirectWithMessage(
      dashboardPath,
      "success",
      `Risolte manualmente ${plan.length} posizioni qualificanti.`,
    );
  } catch (error) {
    rethrowIfNextRedirectError(error);

    if (error instanceof Error) {
      return redirectWithMessage(dashboardPath, "error", error.message);
    }

    throw error;
  }
}
