import { cache } from "react";

import type { MatchSummary } from "@/features/matches/types/match.types";
import { prisma } from "@/lib/prisma";

export const listTournamentMatches = cache(async (tournamentId: string): Promise<MatchSummary[]> => {
  const matches = await prisma.match.findMany({
    where: { tournamentId },
    select: {
      id: true,
      tournamentId: true,
      homeTeamId: true,
      awayTeamId: true,
      roundLabel: true,
      startsAt: true,
      locationLabel: true,
      status: true,
      homeScore: true,
      awayScore: true,
      createdAt: true,
      homeTeam: {
        select: {
          name: true,
        },
      },
      awayTeam: {
        select: {
          name: true,
        },
      },
    },
  });

  return matches
    .sort((left, right) => {
      if (left.startsAt && right.startsAt) {
        return left.startsAt.getTime() - right.startsAt.getTime();
      }

      if (left.startsAt) {
        return -1;
      }

      if (right.startsAt) {
        return 1;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    })
    .map((match) => ({
      id: match.id,
      tournamentId: match.tournamentId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
      roundLabel: match.roundLabel,
      startsAt: match.startsAt,
      locationLabel: match.locationLabel,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    }));
});
