import type { StandingRow } from "@/features/standings/types/standings.types";
import { getTournamentStandingsSnapshot } from "@/features/standings/server/get-tournament-standings-snapshot";

export async function getTournamentStandings(tournamentId: string): Promise<StandingRow[]> {
  const snapshot = await getTournamentStandingsSnapshot(tournamentId);
  return snapshot?.standings ?? [];
}
