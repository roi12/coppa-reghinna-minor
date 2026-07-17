import { cache } from "react";

import { getTournamentStandingsSnapshot } from "@/features/standings/server/get-tournament-standings-snapshot";
import type { GroupStandingSummary } from "@/features/standings/types/standings.types";

export const getTournamentGroupStandings = cache(
  async (tournamentId: string): Promise<GroupStandingSummary[]> => {
    const snapshot = await getTournamentStandingsSnapshot(tournamentId);
    return snapshot.groupStandings;
  },
);
