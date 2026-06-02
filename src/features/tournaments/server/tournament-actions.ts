"use server";

import { Prisma, TournamentStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireOwnerOrAdmin } from "@/features/auth/server/session";
import { createTournamentSchema } from "@/features/tournaments/schemas/create-tournament.schema";
import { updateTournamentSchema } from "@/features/tournaments/schemas/update-tournament.schema";
import { prisma } from "@/lib/prisma";

import { revalidateTournamentPaths } from "./revalidate-tournament-paths";

function parseOptionalDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  return new Date(value);
}

function redirectWithMessage(path: string, type: "success" | "error", message: string): never {
  const searchParams = new URLSearchParams({
    type,
    message,
  });

  redirect(`${path}?${searchParams.toString()}`);
}

export async function createTournamentAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = createTournamentSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    sport: formData.get("sport"),
    seasonLabel: formData.get("seasonLabel"),
    format: formData.get("format"),
    locationLabel: formData.get("locationLabel"),
    startsAt: parseOptionalDate(formData.get("startsAt")),
    endsAt: parseOptionalDate(formData.get("endsAt")),
  });

  if (!parsed.success) {
    return redirectWithMessage("/dashboard/tournaments/new", "error", "Enter valid tournament details.");
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: parsed.data.organizationId },
      select: { id: true },
    });

    if (!organization) {
      return redirectWithMessage(
        "/dashboard/tournaments/new",
        "error",
        "Choose an existing organization.",
      );
    }

    const tournament = await prisma.tournament.create({
      data: {
        ...parsed.data,
        locationLabel: parsed.data.locationLabel || null,
        startsAt: parsed.data.startsAt ?? null,
        endsAt: parsed.data.endsAt ?? null,
        status: TournamentStatus.DRAFT,
      },
    });

    revalidateTournamentPaths(tournament.slug);

    redirectWithMessage(
      `/dashboard/tournaments/${tournament.slug}`,
      "success",
      "Tournament created.",
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return redirectWithMessage(
        "/dashboard/tournaments/new",
        "error",
        "Tournament slug must be unique.",
      );
    }

    throw error;
  }
}

export async function updateTournamentAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = updateTournamentSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    currentSlug: formData.get("currentSlug"),
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    sport: formData.get("sport"),
    seasonLabel: formData.get("seasonLabel"),
    format: formData.get("format"),
    locationLabel: formData.get("locationLabel"),
    startsAt: parseOptionalDate(formData.get("startsAt")),
    endsAt: parseOptionalDate(formData.get("endsAt")),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return redirectWithMessage(
      `/dashboard/tournaments/${String(formData.get("currentSlug") ?? "")}`,
      "error",
      "Enter valid tournament details.",
    );
  }

  try {
    const currentTournament = await prisma.tournament.findUnique({
      where: { id: parsed.data.tournamentId },
      select: { publishedAt: true },
    });

    if (!currentTournament) {
      return redirectWithMessage("/dashboard", "error", "Tournament not found.");
    }

    const tournament = await prisma.tournament.update({
      where: { id: parsed.data.tournamentId },
      data: {
        organizationId: parsed.data.organizationId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        sport: parsed.data.sport,
        seasonLabel: parsed.data.seasonLabel,
        format: parsed.data.format,
        locationLabel: parsed.data.locationLabel || null,
        startsAt: parsed.data.startsAt ?? null,
        endsAt: parsed.data.endsAt ?? null,
        status: parsed.data.status,
        publishedAt:
          parsed.data.status === TournamentStatus.PUBLISHED ||
          parsed.data.status === TournamentStatus.COMPLETED
            ? currentTournament.publishedAt ?? new Date()
            : null,
      },
    });

    revalidateTournamentPaths(tournament.slug, parsed.data.currentSlug);

    redirectWithMessage(
      `/dashboard/tournaments/${tournament.slug}`,
      "success",
      "Tournament updated.",
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return redirectWithMessage(
        `/dashboard/tournaments/${parsed.data.currentSlug}`,
        "error",
        "Tournament slug must be unique.",
      );
    }

    throw error;
  }
}
