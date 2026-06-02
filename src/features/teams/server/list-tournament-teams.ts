import { cache } from "react";

import type { TournamentTeamSummary } from "@/features/teams/types/team.types";
import { prisma } from "@/lib/prisma";

export const listTournamentTeams = cache(async (tournamentId: string): Promise<TournamentTeamSummary[]> => {
  const entries = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
    orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
    select: {
      seed: true,
      team: {
        select: {
          id: true,
          organizationId: true,
          name: true,
          slug: true,
          _count: {
            select: {
              players: true,
            },
          },
        },
      },
    },
  });

  return entries
    .map((entry) => ({
      id: entry.team.id,
      organizationId: entry.team.organizationId,
      name: entry.team.name,
      slug: entry.team.slug,
      seed: entry.seed,
      playerCount: entry.team._count.players,
    }))
    .sort((left, right) => {
      return (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER) || left.name.localeCompare(right.name);
    });
});
