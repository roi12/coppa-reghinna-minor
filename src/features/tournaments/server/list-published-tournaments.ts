import { TournamentStatus } from "@prisma/client";
import { cache } from "react";

import type { TournamentPublicListItem } from "@/features/tournaments/types/tournament.types";
import { normalizeTournamentFormat } from "@/features/tournaments/utils/tournament-format";
import { prisma } from "@/lib/prisma";

export const listPublishedTournaments = cache(async (): Promise<TournamentPublicListItem[]> => {
  const tournaments = await prisma.tournament.findMany({
    where: {
      status: {
        in: [TournamentStatus.PUBLISHED, TournamentStatus.COMPLETED],
      },
    },
    orderBy: [{ startsAt: "asc" }, { name: "asc" }],
    select: {
      id: true,
      organizationId: true,
      name: true,
      slug: true,
      sport: true,
      seasonLabel: true,
      format: true,
      locationLabel: true,
      startsAt: true,
      endsAt: true,
      status: true,
      organization: {
        select: {
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          teams: true,
        },
      },
    },
  });

  const publicStages = await prisma.tournamentStage.findMany({
    where: {
      tournamentId: {
        in: tournaments.map((tournament) => tournament.id),
      },
      isPublic: true,
    },
    select: {
      id: true,
      tournamentId: true,
    },
  });

  const publicStageIdsByTournamentId = new Map<string, string[]>();

  for (const stage of publicStages) {
    const existingIds = publicStageIdsByTournamentId.get(stage.tournamentId) ?? [];
    existingIds.push(stage.id);
    publicStageIdsByTournamentId.set(stage.tournamentId, existingIds);
  }

  const matchCounts = await Promise.all(
    tournaments.map((tournament) => {
      const publicStageIds = publicStageIdsByTournamentId.get(tournament.id) ?? [];

      return prisma.match.count({
        where:
          publicStageIds.length > 0
            ? {
                tournamentId: tournament.id,
                OR: [
                  {
                    stageId: null,
                  },
                  {
                    stageId: {
                      in: publicStageIds,
                    },
                  },
                ],
              }
            : {
                tournamentId: tournament.id,
                stageId: null,
              },
      });
    }),
  );

  return tournaments.map((tournament, index) => ({
    id: tournament.id,
    organizationId: tournament.organizationId,
    name: tournament.name,
    slug: tournament.slug,
    sport: tournament.sport,
    seasonLabel: tournament.seasonLabel,
    format: normalizeTournamentFormat(tournament.format),
    locationLabel: tournament.locationLabel,
    startsAt: tournament.startsAt,
    endsAt: tournament.endsAt,
    status: tournament.status,
    organizationName: tournament.organization.name,
    organizationSlug: tournament.organization.slug,
    teamCount: tournament._count.teams,
    matchCount: matchCounts[index] ?? 0,
  }));
});
