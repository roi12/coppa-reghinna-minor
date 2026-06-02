import { cache } from "react";

import type { TournamentFormatValue } from "@/features/tournaments/types/tournament-format.types";
import { prisma } from "@/lib/prisma";

export type DashboardTournamentDetail = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  name: string;
  slug: string;
  sport: string;
  seasonLabel: string;
  format: TournamentFormatValue;
  locationLabel: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED";
  publishedAt: Date | null;
  teamCount: number;
  matchCount: number;
};

export const getDashboardTournamentBySlug = cache(
  async (slug: string): Promise<DashboardTournamentDetail | null> => {
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

    if (!tournament) {
      return null;
    }

    return {
      id: tournament.id,
      organizationId: tournament.organizationId,
      organizationName: tournament.organization.name,
      organizationSlug: tournament.organization.slug,
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
      teamCount: tournament._count.teams,
      matchCount: tournament._count.matches,
    };
  },
);
