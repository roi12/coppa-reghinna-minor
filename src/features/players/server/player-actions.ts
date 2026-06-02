"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireOwnerOrAdmin } from "@/features/auth/server/session";
import { createPlayerSchema } from "@/features/players/schemas/create-player.schema";
import { prisma } from "@/lib/prisma";

import { revalidateTournamentPaths } from "@/features/tournaments/server/revalidate-tournament-paths";

function redirectWithMessage(path: string, type: "success" | "error", message: string): never {
  const searchParams = new URLSearchParams({
    type,
    message,
  });

  redirect(`${path}?${searchParams.toString()}`);
}

function readRequiredFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function readOptionalFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

function getPlayerValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Enter valid player details.";
}

export async function createTeamPlayerAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const tournamentSlug = readRequiredFormValue(formData, "tournamentSlug");

  const parsed = createPlayerSchema.safeParse({
    organizationId: readRequiredFormValue(formData, "organizationId"),
    teamId: readRequiredFormValue(formData, "teamId"),
    firstName: readRequiredFormValue(formData, "firstName"),
    lastName: readRequiredFormValue(formData, "lastName"),
    displayName: readOptionalFormValue(formData, "displayName"),
    email: readOptionalFormValue(formData, "email"),
    jerseyNumber: readOptionalFormValue(formData, "jerseyNumber"),
  });

  if (!parsed.success) {
    return redirectWithMessage(
      `/dashboard/tournaments/${tournamentSlug}`,
      "error",
      getPlayerValidationMessage(parsed.error),
    );
  }

  const team = await prisma.team.findUnique({
    where: { id: parsed.data.teamId },
    select: { organizationId: true },
  });

  if (!team || team.organizationId !== parsed.data.organizationId) {
    return redirectWithMessage(
      `/dashboard/tournaments/${tournamentSlug}`,
      "error",
      "Choose a valid team for this player.",
    );
  }

  await prisma.player.create({
    data: {
      organizationId: parsed.data.organizationId,
      teamId: parsed.data.teamId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      displayName: parsed.data.displayName || null,
      email: parsed.data.email || null,
      jerseyNumber: parsed.data.jerseyNumber || null,
    },
  });

  revalidateTournamentPaths(tournamentSlug);

  redirectWithMessage(`/dashboard/tournaments/${tournamentSlug}`, "success", "Player added.");
}
