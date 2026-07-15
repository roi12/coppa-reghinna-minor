import type { StandingRow } from "@/features/standings/types/standings.types";
import { listTournamentMatches } from "@/features/matches/server/list-tournament-matches";
import { assembleStandingsTable } from "@/features/standings/server/assemble-standings-table";
import { calculateStandings } from "@/features/standings/server/calculate-standings";
import { listTournamentTeams } from "@/features/teams/server/list-tournament-teams";

export async function getTournamentStandings(tournamentId: string): Promise<StandingRow[]> {
  const [matches, teams] = await Promise.all([
    listTournamentMatches(tournamentId),
    listTournamentTeams(tournamentId),
  ]);

  const finishedMatches = matches.flatMap((match) => {
    if (
      match.status !== "FINISHED" ||
      match.homeScore === null ||
      match.awayScore === null ||
      !match.homeTeamId ||
      !match.awayTeamId
    ) {
      return [];
    }

    return [
      {
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
    ];
  });

  const calculatedRows = calculateStandings(finishedMatches);

  return assembleStandingsTable(calculatedRows, teams);
}
