import { cache } from "react";

import type { MatchSummary } from "@/features/matches/types/match.types";
import {
  mapMatchSummary,
  matchSummarySelect,
  sortMatchSummaries,
} from "@/features/matches/server/match-summary";
import { prisma } from "@/lib/prisma";

export const listTournamentMatches = cache(async (tournamentId: string): Promise<MatchSummary[]> => {
  const matches = await prisma.match.findMany({
    where: { tournamentId },
    select: matchSummarySelect,
  });

  return matches.sort(sortMatchSummaries).map(mapMatchSummary);
});
