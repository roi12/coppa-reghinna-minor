import { TournamentStatus } from "@prisma/client";
import { cache } from "react";

import type { TournamentPublicListItem } from "@/features/tournaments/types/tournament.types";
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
          matches: true,
        },
      },
    },
  });

  return tournaments.map((tournament) => ({
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
    organizationName: tournament.organization.name,
    organizationSlug: tournament.organization.slug,
    teamCount: tournament._count.teams,
    matchCount: tournament._count.matches,
  }));
});
