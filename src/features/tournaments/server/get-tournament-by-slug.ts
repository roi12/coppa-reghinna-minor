import { MatchStatus, TournamentStatus } from "@prisma/client";
import { cache } from "react";

import type { TournamentPublicDetail } from "@/features/tournaments/types/tournament.types";
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
        organization: {
          select: {
            slug: true,
            name: true,
          },
        },
        _count: {
          select: {
            teams: true,
            matches: true,
          },
        },
      },
    });

    if (!tournament || tournament.status === TournamentStatus.DRAFT) {
      return null;
    }

    const completedMatchCount = await prisma.match.count({
      where: {
        tournamentId: tournament.id,
        status: MatchStatus.FINAL,
      },
    });

    return {
      id: tournament.id,
      organizationId: tournament.organizationId,
      name: tournament.name,
      slug: tournament.slug,
      sport: tournament.sport,
      seasonLabel: tournament.seasonLabel,
      format: tournament.format,
      locationLabel: tournament.locationLabel,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
      status: tournament.status,
      publishedAt: tournament.publishedAt,
      organizationName: tournament.organization.name,
      organizationSlug: tournament.organization.slug,
      teamCount: tournament._count.teams,
      matchCount: tournament._count.matches,
      completedMatchCount,
    };
  },
);
