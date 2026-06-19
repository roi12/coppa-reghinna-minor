import { cache } from "react";

import type { TournamentFormatValue } from "@/features/tournaments/types/tournament-format.types";
import { normalizeTournamentFormat } from "@/features/tournaments/utils/tournament-format";
import { prisma } from "@/lib/prisma";

export type DashboardTournamentListItem = {
  id: string;
  organizationId: string;
  organizationName: string;
  name: string;
  slug: string;
  sport: string;
  seasonLabel: string;
  format: TournamentFormatValue;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED";
  startsAt: Date | null;
  endsAt: Date | null;
  teamCount: number;
  matchCount: number;
};

export const listDashboardTournaments = cache(async (): Promise<DashboardTournamentListItem[]> => {
  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      organizationId: true,
      name: true,
      slug: true,
      sport: true,
      seasonLabel: true,
      format: true,
      status: true,
      startsAt: true,
      endsAt: true,
      organization: {
        select: {
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

  return tournaments.map((tournament) => ({
    id: tournament.id,
    organizationId: tournament.organizationId,
    organizationName: tournament.organization.name,
    name: tournament.name,
    slug: tournament.slug,
    sport: tournament.sport,
    seasonLabel: tournament.seasonLabel,
    format: normalizeTournamentFormat(tournament.format),
    status: tournament.status,
    startsAt: tournament.startsAt,
    endsAt: tournament.endsAt,
    teamCount: tournament._count.teams,
    matchCount: tournament._count.matches,
  }));
});
