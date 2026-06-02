"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireOwnerOrAdmin } from "@/features/auth/server/session";
import { addTeamToTournamentSchema } from "@/features/teams/schemas/add-team-to-tournament.schema";
import { createTeamSchema } from "@/features/teams/schemas/create-team.schema";
import { prisma } from "@/lib/prisma";

import { revalidateTournamentPaths } from "@/features/tournaments/server/revalidate-tournament-paths";

function redirectWithMessage(path: string, type: "success" | "error", message: string): never {
  const searchParams = new URLSearchParams({
    type,
    message,
  });

  redirect(`${path}?${searchParams.toString()}`);
}

export async function createTournamentTeamAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const tournamentSlug = String(formData.get("tournamentSlug") ?? "");
  const tournamentId = String(formData.get("tournamentId") ?? "");

  const parsed = createTeamSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return redirectWithMessage(
      `/dashboard/tournaments/${tournamentSlug}`,
      "error",
      "Enter a valid team name and slug.",
    );
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const tournament = await transaction.tournament.findUnique({
        where: { id: tournamentId },
        select: { organizationId: true },
      });

      if (!tournament || tournament.organizationId !== parsed.data.organizationId) {
        throw new Error("Tournament organization mismatch.");
      }

      const team = await transaction.team.create({
        data: parsed.data,
      });

      const highestSeedEntry = await transaction.tournamentTeam.findFirst({
        where: { tournamentId },
        orderBy: { seed: "desc" },
        select: { seed: true },
      });

      await transaction.tournamentTeam.create({
        data: {
          tournamentId,
          teamId: team.id,
          seed: (highestSeedEntry?.seed ?? 0) + 1,
        },
      });
    });

    revalidateTournamentPaths(tournamentSlug);

    redirectWithMessage(`/dashboard/tournaments/${tournamentSlug}`, "success", "Team added.");
  } catch (error) {
    if (error instanceof Error && error.message === "Tournament organization mismatch.") {
      return redirectWithMessage(
        `/dashboard/tournaments/${tournamentSlug}`,
        "error",
        "Choose a valid tournament organization.",
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return redirectWithMessage(
        `/dashboard/tournaments/${tournamentSlug}`,
        "error",
        "Team slug must be unique within the organization.",
      );
    }

    throw error;
  }
}

export async function assignExistingTeamToTournamentAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const tournamentSlug = String(formData.get("tournamentSlug") ?? "");

  const parsed = addTeamToTournamentSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    teamId: formData.get("teamId"),
  });

  if (!parsed.success) {
    return redirectWithMessage(
      `/dashboard/tournaments/${tournamentSlug}`,
      "error",
      "Choose a valid team to add.",
    );
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const [tournament, team] = await Promise.all([
        transaction.tournament.findUnique({
          where: { id: parsed.data.tournamentId },
          select: { organizationId: true },
        }),
        transaction.team.findUnique({
          where: { id: parsed.data.teamId },
          select: { organizationId: true },
        }),
      ]);

      if (!tournament || !team || tournament.organizationId !== team.organizationId) {
        throw new Error("Team organization mismatch.");
      }

      const highestSeedEntry = await transaction.tournamentTeam.findFirst({
        where: { tournamentId: parsed.data.tournamentId },
        orderBy: { seed: "desc" },
        select: { seed: true },
      });

      await transaction.tournamentTeam.create({
        data: {
          tournamentId: parsed.data.tournamentId,
          teamId: parsed.data.teamId,
          seed: (highestSeedEntry?.seed ?? 0) + 1,
        },
      });
    });

    revalidateTournamentPaths(tournamentSlug);

    redirectWithMessage(`/dashboard/tournaments/${tournamentSlug}`, "success", "Team linked to tournament.");
  } catch (error) {
    if (error instanceof Error && error.message === "Team organization mismatch.") {
      return redirectWithMessage(
        `/dashboard/tournaments/${tournamentSlug}`,
        "error",
        "Choose a team from the same organization.",
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return redirectWithMessage(
        `/dashboard/tournaments/${tournamentSlug}`,
        "error",
        "That team is already assigned to this tournament.",
      );
    }

    throw error;
  }
}
