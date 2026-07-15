"use server";

import { MatchStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireOwnerOrAdmin } from "@/features/auth/server/session";
import { generateGroupStageMatchesSchema } from "@/features/matches/schemas/generate-group-stage-matches.schema";
import { createMatchSchema } from "@/features/matches/schemas/create-match.schema";
import { generateRoundRobinCalendarSchema } from "@/features/matches/schemas/generate-round-robin-calendar.schema";
import { reportMatchResultSchema } from "@/features/matches/schemas/report-match-result.schema";
import {
  buildGroupStageCalendar,
  buildMatchPairKey,
  buildSingleRoundRobinCalendar,
} from "@/features/matches/server/generate-round-robin-calendar";
import { getMatchParticipantValidationError } from "@/features/matches/server/match-result-guards";
import { prisma } from "@/lib/prisma";

import { revalidateTournamentPaths } from "@/features/tournaments/server/revalidate-tournament-paths";

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

export async function createTournamentMatchAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const tournamentSlug = String(formData.get("tournamentSlug") ?? "");

  const parsed = createMatchSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    homeTeamId: formData.get("homeTeamId"),
    awayTeamId: formData.get("awayTeamId"),
    roundLabel: formData.get("roundLabel"),
    startsAt: parseOptionalDate(formData.get("startsAt")),
    locationLabel: formData.get("locationLabel"),
  });

  if (!parsed.success) {
    return redirectWithMessage(
      `/dashboard/tournaments/${tournamentSlug}`,
      "error",
      "Enter valid match details.",
    );
  }

  if (parsed.data.homeTeamId === parsed.data.awayTeamId) {
    return redirectWithMessage(
      `/dashboard/tournaments/${tournamentSlug}`,
      "error",
      "Home and away teams must be different.",
    );
  }

  const participantCount = await prisma.tournamentTeam.count({
    where: {
      tournamentId: parsed.data.tournamentId,
      teamId: {
        in: [parsed.data.homeTeamId, parsed.data.awayTeamId],
      },
    },
  });

  if (participantCount !== 2) {
    return redirectWithMessage(
      `/dashboard/tournaments/${tournamentSlug}`,
      "error",
      "Choose teams that belong to this tournament.",
    );
  }

  await prisma.match.create({
    data: {
      tournamentId: parsed.data.tournamentId,
      homeTeamId: parsed.data.homeTeamId,
      awayTeamId: parsed.data.awayTeamId,
      roundLabel: parsed.data.roundLabel || null,
      startsAt: parsed.data.startsAt ?? null,
      locationLabel: parsed.data.locationLabel || null,
      status: MatchStatus.SCHEDULED,
    },
  });

  revalidateTournamentPaths(tournamentSlug);

  redirectWithMessage(`/dashboard/tournaments/${tournamentSlug}`, "success", "Match created.");
}

export async function reportTournamentMatchResultAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const tournamentSlug = String(formData.get("tournamentSlug") ?? "");

  const parsed = reportMatchResultSchema.safeParse({
    matchId: formData.get("matchId"),
    status: formData.get("status"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
  });

  if (!parsed.success) {
    return redirectWithMessage(
      `/dashboard/tournaments/${tournamentSlug}`,
      "error",
      "Enter valid result details for the selected match.",
    );
  }

  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      tournament: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!match || match.tournament.slug !== tournamentSlug) {
    return redirectWithMessage(
      `/dashboard/tournaments/${tournamentSlug}`,
      "error",
      "Match not found for this tournament.",
    );
  }

  const participantValidationError = getMatchParticipantValidationError(match);
  const hasScoreInputs =
    typeof parsed.data.homeScore === "number" || typeof parsed.data.awayScore === "number";

  if (
    (parsed.data.status === "LIVE" || parsed.data.status === "FINISHED" || hasScoreInputs) &&
    participantValidationError
  ) {
    return redirectWithMessage(
      `/dashboard/tournaments/${tournamentSlug}`,
      "error",
      participantValidationError,
    );
  }

  if (parsed.data.status === "SCHEDULED" && hasScoreInputs) {
    return redirectWithMessage(
      `/dashboard/tournaments/${tournamentSlug}`,
      "error",
      "Per registrare un punteggio, imposta la partita come live o completata.",
    );
  }

  await prisma.match.update({
    where: { id: parsed.data.matchId },
    data: {
      status:
        parsed.data.status === "FINISHED"
          ? MatchStatus.FINISHED
          : parsed.data.status === "LIVE"
            ? MatchStatus.LIVE
            : MatchStatus.SCHEDULED,
      homeScore:
        parsed.data.status === "FINISHED" || parsed.data.status === "LIVE"
          ? parsed.data.homeScore ?? 0
          : 0,
      awayScore:
        parsed.data.status === "FINISHED" || parsed.data.status === "LIVE"
          ? parsed.data.awayScore ?? 0
          : 0,
    },
  });

  revalidateTournamentPaths(tournamentSlug);

  redirectWithMessage(`/dashboard/tournaments/${tournamentSlug}`, "success", "Match result saved.");
}

export async function generateTournamentRoundRobinCalendarAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = generateRoundRobinCalendarSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    tournamentSlug: formData.get("tournamentSlug"),
    startDate: formData.get("startDate"),
    intervalDays: formData.get("intervalDays"),
    defaultMatchTime: formData.get("defaultMatchTime"),
    generationMode: formData.get("generationMode"),
  });

  if (!parsed.success) {
    return redirectWithMessage(
      `/dashboard/tournaments/${String(formData.get("tournamentSlug") ?? "")}`,
      "error",
      "Enter valid calendar generation details.",
    );
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: parsed.data.tournamentId },
    select: {
      slug: true,
      format: true,
      teams: {
        orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
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

  if (!tournament || tournament.slug !== parsed.data.tournamentSlug) {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "error",
      "Tournament not found for calendar generation.",
    );
  }

  if (tournament.format !== "ROUND_ROBIN") {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "error",
      "Automatic calendar generation is only available for round-robin tournaments.",
    );
  }

  const teams = tournament.teams.map((entry) => entry.team);

  if (teams.length < 2) {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "error",
      "Attach at least two teams before generating a calendar.",
    );
  }

  const generatedMatches = buildSingleRoundRobinCalendar({
    teams,
    startDate: parsed.data.startDate,
    intervalDays: parsed.data.intervalDays,
    defaultMatchTime: parsed.data.defaultMatchTime || undefined,
  });

  const generationResult = await prisma.$transaction(async (transaction) => {
    let deletedCount = 0;

    if (parsed.data.generationMode === "REPLACE_SCHEDULED") {
      const deleteResult = await transaction.match.deleteMany({
        where: {
          tournamentId: parsed.data.tournamentId,
          status: MatchStatus.SCHEDULED,
        },
      });

      deletedCount = deleteResult.count;
    }

    const existingMatches = await transaction.match.findMany({
      where: {
        tournamentId: parsed.data.tournamentId,
      },
      select: {
        homeTeamId: true,
        awayTeamId: true,
      },
    });

    const existingPairKeys = new Set(
      existingMatches.flatMap((match) =>
        match.homeTeamId && match.awayTeamId
          ? [buildMatchPairKey(match.homeTeamId, match.awayTeamId)]
          : [],
      ),
    );

    const matchesToCreate = generatedMatches
      .filter(
        (match) => !existingPairKeys.has(buildMatchPairKey(match.homeTeamId, match.awayTeamId)),
      )
      .map((match) => ({
        tournamentId: parsed.data.tournamentId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        roundLabel: match.roundLabel,
        startsAt: match.startsAt,
        locationLabel: null,
        status: MatchStatus.SCHEDULED,
        homeScore: 0,
        awayScore: 0,
      }));

    if (matchesToCreate.length > 0) {
      await transaction.match.createMany({
        data: matchesToCreate,
      });
    }

    return {
      deletedCount,
      createdCount: matchesToCreate.length,
      skippedCount: generatedMatches.length - matchesToCreate.length,
    };
  });

  revalidateTournamentPaths(parsed.data.tournamentSlug);

  if (generationResult.createdCount === 0) {
    if (generationResult.deletedCount > 0) {
      return redirectWithMessage(
        `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
        "success",
        `Removed ${generationResult.deletedCount} scheduled match(es). Completed results already cover the round robin.`,
      );
    }

    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "error",
      "No new matches were generated. Existing matches already cover the round robin.",
    );
  }

  if (
    parsed.data.generationMode === "REPLACE_SCHEDULED" &&
    generationResult.deletedCount > 0 &&
    generationResult.skippedCount > 0
  ) {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "success",
      `Rebuilt ${generationResult.createdCount} scheduled match(es), removed ${generationResult.deletedCount}, and kept ${generationResult.skippedCount} completed pairing(s).`,
    );
  }

  if (parsed.data.generationMode === "REPLACE_SCHEDULED" && generationResult.deletedCount > 0) {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "success",
      `Rebuilt ${generationResult.createdCount} scheduled match(es) after removing ${generationResult.deletedCount} existing scheduled match(es).`,
    );
  }

  if (generationResult.skippedCount > 0) {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "success",
      `Generated ${generationResult.createdCount} matches and preserved ${generationResult.skippedCount} existing pairing(s).`,
    );
  }

  redirectWithMessage(
    `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
    "success",
    "Round-robin calendar generated.",
  );
}

export async function generateGroupStageMatchesAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = generateGroupStageMatchesSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    tournamentSlug: formData.get("tournamentSlug"),
    startDate: formData.get("startDate"),
    intervalDays: formData.get("intervalDays"),
    defaultMatchTime: formData.get("defaultMatchTime"),
    generationMode: formData.get("generationMode"),
  });

  if (!parsed.success) {
    return redirectWithMessage(
      `/dashboard/tournaments/${String(formData.get("tournamentSlug") ?? "")}`,
      "error",
      "Enter valid group-stage generation details.",
    );
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: parsed.data.tournamentId },
    select: {
      slug: true,
      format: true,
      groups: {
        orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          sequence: true,
          teams: {
            orderBy: [{ groupSlot: "asc" }, { seed: "asc" }, { createdAt: "asc" }],
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
      },
    },
  });

  if (!tournament || tournament.slug !== parsed.data.tournamentSlug) {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "error",
      "Tournament not found for group-stage generation.",
    );
  }

  if (tournament.format !== "GROUPS_PLUS_KNOCKOUT") {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "error",
      "Automatic group-stage generation is only available for groups plus knockout tournaments.",
    );
  }

  if (tournament.groups.length === 0) {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "error",
      "Create tournament groups before generating group-stage matches.",
    );
  }

  const underfilledGroup = tournament.groups.find((group) => group.teams.length < 2);

  if (underfilledGroup) {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "error",
      `${underfilledGroup.name} needs at least two assigned teams before matches can be generated.`,
    );
  }

  const generatedMatches = buildGroupStageCalendar({
    groups: tournament.groups.map((group) => ({
      groupId: group.id,
      groupName: group.name,
      teams: group.teams.map((entry) => entry.team),
    })),
    startDate: parsed.data.startDate,
    intervalDays: parsed.data.intervalDays,
    defaultMatchTime: parsed.data.defaultMatchTime || undefined,
  });

  const groupRoundPrefixes = tournament.groups.map((group) => `${group.name} - `);
  const currentGroupIds = tournament.groups.map((group) => group.id);

  const generationResult = await prisma.$transaction(async (transaction) => {
    let deletedCount = 0;

    if (parsed.data.generationMode === "REPLACE_SCHEDULED_GROUP_STAGE") {
      const deleteResult = await transaction.match.deleteMany({
        where: {
          tournamentId: parsed.data.tournamentId,
          status: MatchStatus.SCHEDULED,
          OR: [
            {
              groupId: {
                in: currentGroupIds,
              },
            },
            ...groupRoundPrefixes.map((prefix) => ({
              roundLabel: {
                startsWith: prefix,
              },
            })),
          ],
        },
      });

      deletedCount = deleteResult.count;
    }

    const existingMatches = await transaction.match.findMany({
      where: {
        tournamentId: parsed.data.tournamentId,
      },
      select: {
        homeTeamId: true,
        awayTeamId: true,
      },
    });

    const existingPairKeys = new Set(
      existingMatches.flatMap((match) =>
        match.homeTeamId && match.awayTeamId
          ? [buildMatchPairKey(match.homeTeamId, match.awayTeamId)]
          : [],
      ),
    );

    const matchesToCreate = generatedMatches
      .filter(
        (match) => !existingPairKeys.has(buildMatchPairKey(match.homeTeamId, match.awayTeamId)),
      )
      .map((match) => ({
        tournamentId: parsed.data.tournamentId,
        groupId: match.groupId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        roundLabel: match.roundLabel,
        startsAt: match.startsAt,
        locationLabel: null,
        status: MatchStatus.SCHEDULED,
        homeScore: 0,
        awayScore: 0,
      }));

    if (matchesToCreate.length > 0) {
      await transaction.match.createMany({
        data: matchesToCreate,
      });
    }

    return {
      deletedCount,
      createdCount: matchesToCreate.length,
      skippedCount: generatedMatches.length - matchesToCreate.length,
    };
  });

  revalidateTournamentPaths(parsed.data.tournamentSlug);

  if (generationResult.createdCount === 0) {
    if (generationResult.deletedCount > 0) {
      return redirectWithMessage(
        `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
        "success",
        `Removed ${generationResult.deletedCount} scheduled group-stage match(es). Completed results already cover the configured groups.`,
      );
    }

    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "error",
      "No new group-stage matches were generated. Existing matches already cover the configured groups.",
    );
  }

  if (
    parsed.data.generationMode === "REPLACE_SCHEDULED_GROUP_STAGE" &&
    generationResult.deletedCount > 0 &&
    generationResult.skippedCount > 0
  ) {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "success",
      `Rebuilt ${generationResult.createdCount} group-stage match(es), removed ${generationResult.deletedCount}, and kept ${generationResult.skippedCount} completed pairing(s).`,
    );
  }

  if (
    parsed.data.generationMode === "REPLACE_SCHEDULED_GROUP_STAGE" &&
    generationResult.deletedCount > 0
  ) {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "success",
      `Rebuilt ${generationResult.createdCount} group-stage match(es) after removing ${generationResult.deletedCount} scheduled group-stage match(es).`,
    );
  }

  if (generationResult.skippedCount > 0) {
    return redirectWithMessage(
      `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
      "success",
      `Generated ${generationResult.createdCount} group-stage matches and preserved ${generationResult.skippedCount} existing pairing(s).`,
    );
  }

  redirectWithMessage(
    `/dashboard/tournaments/${parsed.data.tournamentSlug}`,
    "success",
    "Group-stage matches generated.",
  );
}
