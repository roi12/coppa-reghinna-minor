import { cache } from "react";

import type { MatchSummary } from "@/features/matches/types/match.types";
import {
  mapMatchSummary,
  matchSummarySelect,
  sortMatchSummaries,
} from "@/features/matches/server/match-summary";
import { getTournamentStandingsSnapshot } from "@/features/standings/server/get-tournament-standings-snapshot";
import { getDisplayRoundLabel } from "@/features/standings/server/preliminary-standings";
import { prisma } from "@/lib/prisma";

export const listTournamentMatches = cache(async (tournamentId: string): Promise<MatchSummary[]> => {
  const [matches, standingsSnapshot] = await Promise.all([
    prisma.match.findMany({
      where: { tournamentId },
      select: matchSummarySelect,
    }),
    getTournamentStandingsSnapshot(tournamentId),
  ]);

  return matches.sort(sortMatchSummaries).map((match) => {
    const summary = mapMatchSummary(match);

    return {
      ...summary,
      roundLabel: getDisplayRoundLabel({
        roundLabel: summary.roundLabel,
        groupName: summary.groupName ?? null,
        standingsMode: standingsSnapshot.mode,
        stageType: summary.stageType ?? null,
      }),
    };
  });
});
