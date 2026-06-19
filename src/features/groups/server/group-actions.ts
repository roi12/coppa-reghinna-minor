"use server";

import { redirect } from "next/navigation";

import { requireOwnerOrAdmin } from "@/features/auth/server/session";
import { configureTournamentGroupsSchema } from "@/features/groups/schemas/configure-tournament-groups.schema";
import { saveTournamentGroupAssignmentsSchema } from "@/features/groups/schemas/save-tournament-group-assignments.schema";
import {
  getGroupAssignmentValidationMessage,
  readGroupAssignmentsFromFormData,
  readRequiredFormValue,
} from "@/features/groups/server/group-assignment-form";
import { buildGroupDistributionPlan } from "@/features/groups/utils/build-group-distribution-plan";
import { revalidateTournamentPaths } from "@/features/tournaments/server/revalidate-tournament-paths";
import { isGroupedTournamentFormat } from "@/features/tournaments/utils/tournament-format";
import { rethrowIfNextRedirectError } from "@/lib/redirect-error";
import { prisma } from "@/lib/prisma";

function redirectWithMessage(path: string, type: "success" | "error", message: string): never {
  const searchParams = new URLSearchParams({
    type,
    message,
  });

  redirect(`${path}?${searchParams.toString()}`);
}

export async function configureTournamentGroupsAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = configureTournamentGroupsSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    tournamentSlug: formData.get("tournamentSlug"),
    groupCount: formData.get("groupCount"),
  });

  if (!parsed.success) {
    return redirectWithMessage("/dashboard", "error", "Choose a valid tournament and group count.");
  }

  const dashboardPath = `/dashboard/tournaments/${parsed.data.tournamentSlug}`;

  try {
    const wasUneven = await prisma.$transaction(async (transaction) => {
      const tournament = await transaction.tournament.findUnique({
        where: { id: parsed.data.tournamentId },
        select: {
          id: true,
          slug: true,
          format: true,
        },
      });

      if (!tournament || tournament.slug !== parsed.data.tournamentSlug) {
        throw new Error("Tournament not found.");
      }

      if (!isGroupedTournamentFormat(tournament.format)) {
        throw new Error("Groups can only be configured for grouped tournaments.");
      }

      const tournamentTeams = await transaction.tournamentTeam.findMany({
        where: { tournamentId: tournament.id },
        orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          teamId: true,
          seed: true,
          createdAt: true,
          team: {
            select: {
              name: true,
            },
          },
        },
      });

      const teamCount = tournamentTeams.length;
      const maxGroupCount = Math.floor(teamCount / 2);

      if (teamCount < 4 || maxGroupCount < 2) {
        throw new Error("At least four attached teams are required before groups can be created.");
      }

      if (parsed.data.groupCount > maxGroupCount) {
        throw new Error(`Choose between 2 and ${maxGroupCount} groups for the current team count.`);
      }

      const distributionPlan = buildGroupDistributionPlan(
        tournamentTeams.map((entry) => ({
          tournamentTeamId: entry.id,
          teamId: entry.teamId,
          teamName: entry.team.name,
          seed: entry.seed,
          createdAt: entry.createdAt,
        })),
        parsed.data.groupCount,
      );

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

      const createdGroups = new Map<number, string>();

      for (const group of distributionPlan.groups) {
        const createdGroup = await transaction.tournamentGroup.create({
          data: {
            tournamentId: tournament.id,
            name: group.groupName,
            sequence: group.groupSequence,
          },
          select: {
            id: true,
            sequence: true,
          },
        });

        createdGroups.set(createdGroup.sequence, createdGroup.id);
      }

      for (const group of distributionPlan.groups) {
        const groupId = createdGroups.get(group.groupSequence);

        if (!groupId) {
          throw new Error("Group setup could not be saved.");
        }

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

      return !distributionPlan.isEven;
    });

    revalidateTournamentPaths(parsed.data.tournamentSlug);

    return redirectWithMessage(
      dashboardPath,
      "success",
      wasUneven
        ? "Groups created. Teams were assigned unevenly based on the current team count."
        : "Groups created and teams assigned.",
    );
  } catch (error) {
    rethrowIfNextRedirectError(error);

    if (error instanceof Error) {
      return redirectWithMessage(dashboardPath, "error", error.message);
    }

    throw error;
  }
}

export async function saveTournamentGroupAssignmentsAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const assignments = readGroupAssignmentsFromFormData(formData);

  const parsed = saveTournamentGroupAssignmentsSchema.safeParse({
    tournamentId: readRequiredFormValue(formData, "tournamentId"),
    tournamentSlug: readRequiredFormValue(formData, "tournamentSlug"),
    assignments,
  });

  if (!parsed.success) {
    const fallbackSlug = readRequiredFormValue(formData, "tournamentSlug");
    const fallbackPath =
      fallbackSlug.trim().length > 0 ? `/dashboard/tournaments/${fallbackSlug}` : "/dashboard";

    return redirectWithMessage(
      fallbackPath,
      "error",
      getGroupAssignmentValidationMessage(parsed.error),
    );
  }

  const dashboardPath = `/dashboard/tournaments/${parsed.data.tournamentSlug}`;

  try {
    await prisma.$transaction(async (transaction) => {
      const tournament = await transaction.tournament.findUnique({
        where: { id: parsed.data.tournamentId },
        select: {
          id: true,
          slug: true,
          format: true,
        },
      });

      if (!tournament || tournament.slug !== parsed.data.tournamentSlug) {
        throw new Error("Tournament not found.");
      }

      if (!isGroupedTournamentFormat(tournament.format)) {
        throw new Error("Groups can only be managed for grouped tournaments.");
      }

      const [tournamentTeams, tournamentGroups] = await Promise.all([
        transaction.tournamentTeam.findMany({
          where: { tournamentId: tournament.id },
          select: {
            id: true,
          },
        }),
        transaction.tournamentGroup.findMany({
          where: { tournamentId: tournament.id },
          select: {
            id: true,
          },
        }),
      ]);

      if (tournamentGroups.length === 0) {
        throw new Error("Create groups before saving manual assignments.");
      }

      const tournamentTeamIds = new Set(tournamentTeams.map((team) => team.id));
      const tournamentGroupIds = new Set(tournamentGroups.map((group) => group.id));

      if (parsed.data.assignments.length !== tournamentTeams.length) {
        throw new Error("Submit assignments for every attached tournament team.");
      }

      const submittedTeamIds = new Set(parsed.data.assignments.map((assignment) => assignment.tournamentTeamId));

      if (submittedTeamIds.size !== tournamentTeams.length) {
        throw new Error("Each attached tournament team must appear exactly once.");
      }

      for (const assignment of parsed.data.assignments) {
        if (!tournamentTeamIds.has(assignment.tournamentTeamId)) {
          throw new Error("One or more submitted teams do not belong to this tournament.");
        }

        if (assignment.groupId && !tournamentGroupIds.has(assignment.groupId)) {
          throw new Error("One or more selected groups do not belong to this tournament.");
        }
      }

      await transaction.tournamentTeam.updateMany({
        where: { tournamentId: tournament.id },
        data: {
          groupId: null,
          groupSlot: null,
        },
      });

      for (const assignment of parsed.data.assignments) {
        if (!assignment.groupId || assignment.groupSlot === null) {
          continue;
        }

        await transaction.tournamentTeam.update({
          where: { id: assignment.tournamentTeamId },
          data: {
            groupId: assignment.groupId,
            groupSlot: assignment.groupSlot,
          },
        });
      }
    });

    revalidateTournamentPaths(parsed.data.tournamentSlug);

    return redirectWithMessage(
      dashboardPath,
      "success",
      "Manual group assignments saved.",
    );
  } catch (error) {
    rethrowIfNextRedirectError(error);

    if (error instanceof Error) {
      return redirectWithMessage(dashboardPath, "error", error.message);
    }

    throw error;
  }
}
