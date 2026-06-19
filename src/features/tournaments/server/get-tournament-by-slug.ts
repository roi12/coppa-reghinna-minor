import { MatchStatus, TournamentStatus } from "@prisma/client";
import { cache } from "react";

import { getKnockoutStageVisibilityState } from "@/features/tournaments/server/tournament-stage-visibility";
import type { TournamentPublicDetail } from "@/features/tournaments/types/tournament.types";
import { normalizeTournamentFormat } from "@/features/tournaments/utils/tournament-format";
import { prisma } from "@/lib/prisma";

export const getTournamentBySlug = cache(
  async (slug: string): Promise<TournamentPublicDetail | null> => {
    const tournament = await prisma.tournament.findUnique({
      where: { slug },
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
        publishedAt: true,
        stages: {
          select: {
            id: true,
            type: true,
            isPublic: true,
          },
        },
        organization: {
          select: {
            slug: true,
            name: true,
          },
        },
        _count: {
          select: {
            teams: true,
          },
        },
      },
    });

    if (!tournament || tournament.status === TournamentStatus.DRAFT) {
      return null;
    }

    const publicStageIds = tournament.stages
      .filter((stage) => stage.isPublic)
      .map((stage) => stage.id);

    const visibleMatchWhere =
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
          };

    const [matchCount, completedMatchCount] = await Promise.all([
      prisma.match.count({
        where: visibleMatchWhere,
      }),
      prisma.match.count({
        where: {
          ...visibleMatchWhere,
          status: MatchStatus.FINAL,
        },
      }),
    ]);
    const visibility = getKnockoutStageVisibilityState(tournament.stages);

    return {
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
      publishedAt: tournament.publishedAt,
      organizationName: tournament.organization.name,
      organizationSlug: tournament.organization.slug,
      teamCount: tournament._count.teams,
      matchCount,
      completedMatchCount,
      knockoutStageIsPublic: visibility.knockoutStageIsPublic,
    };
  },
);
