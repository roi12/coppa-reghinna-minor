"use server";

import { MatchParticipantSourceType, TournamentStageType } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireOwnerOrAdmin } from "@/features/auth/server/session";
import { getPreliminaryStandingsLabel } from "@/features/standings/server/preliminary-standings";
import {
  updateTournamentPreliminaryStandingsScopeSchema,
  type UpdateTournamentPreliminaryStandingsScopeInput,
} from "@/features/tournaments/schemas/update-tournament-preliminary-standings-scope.schema";
import { rethrowIfNextRedirectError } from "@/lib/redirect-error";
import { prisma } from "@/lib/prisma";

import { revalidateTournamentPaths } from "./revalidate-tournament-paths";

type PreliminaryStandingsScopePersistenceClient = {
  tournament: {
    findUnique: typeof prisma.tournament.findUnique;
  };
  match: {
    findMany: typeof prisma.match.findMany;
  };
  tournamentStage: {
    update: typeof prisma.tournamentStage.update;
  };
};

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

function parseStageConfiguration(configuration: unknown) {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    return {};
  }

  return configuration as Record<string, unknown>;
}

async function assertGlobalQualificationScopeCompatibility(
  client: PreliminaryStandingsScopePersistenceClient,
  tournamentId: string,
) {
  const knockoutMatches = await client.match.findMany({
    where: {
      tournamentId,
      stage: {
        type: TournamentStageType.KNOCKOUT_STAGE,
      },
      OR: [
        {
          homeParticipantSourceType: MatchParticipantSourceType.GROUP_POSITION,
        },
        {
          awayParticipantSourceType: MatchParticipantSourceType.GROUP_POSITION,
        },
      ],
    },
    select: {
      id: true,
      homeParticipantSourceType: true,
      awayParticipantSourceType: true,
      homeSourceGroupId: true,
      awaySourceGroupId: true,
    },
  });

  const hasGroupedQualificationSources = knockoutMatches.some(
    (match) =>
      (match.homeParticipantSourceType === MatchParticipantSourceType.GROUP_POSITION &&
        match.homeSourceGroupId !== null) ||
      (match.awayParticipantSourceType === MatchParticipantSourceType.GROUP_POSITION &&
        match.awaySourceGroupId !== null),
  );

  if (hasGroupedQualificationSources) {
    throw new Error(
      "La classifica generale non può essere attivata finché la fase finale usa posizioni di girone già generate. Calendario e partite non sono stati modificati.",
    );
  }
}

export async function setTournamentPreliminaryStandingsScope(
  input: UpdateTournamentPreliminaryStandingsScopeInput,
  client: PreliminaryStandingsScopePersistenceClient = prisma,
) {
  const tournament = await client.tournament.findUnique({
    where: { id: input.tournamentId },
    select: {
      id: true,
      slug: true,
      stages: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          configuration: true,
        },
      },
    },
  });

  if (!tournament || tournament.slug !== input.tournamentSlug) {
    throw new Error("Tournament not found.");
  }

  const preliminaryStage =
    tournament.stages.find((stage) => stage.type === TournamentStageType.GROUP_STAGE) ?? null;

  if (!preliminaryStage) {
    throw new Error("Nessuna fase preliminare configurata per questo torneo.");
  }

  if (input.standingsScope === "GLOBAL") {
    await assertGlobalQualificationScopeCompatibility(client, tournament.id);
  }

  await client.tournamentStage.update({
    where: { id: preliminaryStage.id },
    data: {
      configuration: {
        ...parseStageConfiguration(preliminaryStage.configuration),
        standingsScope: input.standingsScope,
      },
    },
  });

  return {
    tournamentSlug: tournament.slug,
    successMessage: `Formato classifica preliminare aggiornato: ${getPreliminaryStandingsLabel(input.standingsScope)}.`,
  };
}

export async function updateTournamentPreliminaryStandingsScopeAction(formData: FormData) {
  await requireOwnerOrAdmin();

  const parsed = updateTournamentPreliminaryStandingsScopeSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    tournamentSlug: formData.get("tournamentSlug"),
    standingsScope: formData.get("standingsScope"),
  });
  const fallbackSlug = String(formData.get("tournamentSlug") ?? "");
  const dashboardPath =
    fallbackSlug.trim().length > 0 ? buildDashboardPath(fallbackSlug) : "/dashboard";

  if (!parsed.success) {
    return redirectWithMessage(
      dashboardPath,
      "error",
      "Seleziona un formato classifica preliminare valido.",
    );
  }

  try {
    const result = await setTournamentPreliminaryStandingsScope(parsed.data);

    revalidateTournamentPaths(result.tournamentSlug);

    return redirectWithMessage(
      buildDashboardPath(result.tournamentSlug),
      "success",
      result.successMessage,
    );
  } catch (error) {
    rethrowIfNextRedirectError(error);

    if (error instanceof Error) {
      return redirectWithMessage(buildDashboardPath(parsed.data.tournamentSlug), "error", error.message);
    }

    throw error;
  }
}
