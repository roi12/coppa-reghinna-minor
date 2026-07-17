import { DEFAULT_STANDINGS_RULES } from "@/lib/constants/standings";
import type { StandingRow } from "@/features/standings/types/standings.types";

type FinishedMatch = {
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
};

export function calculateStandings(matches: FinishedMatch[]): StandingRow[] {
  const table = new Map<string, StandingRow>();

  const ensureRow = (teamId: string, teamName: string) => {
    if (!table.has(teamId)) {
      table.set(teamId, {
        teamId,
        teamName,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    }

    return table.get(teamId)!;
  };

  for (const match of matches) {
    const home = ensureRow(match.homeTeamId, match.homeTeamName);
    const away = ensureRow(match.awayTeamId, match.awayTeamName);

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.wins += 1;
      away.losses += 1;
      home.points += DEFAULT_STANDINGS_RULES.winPoints;
      away.points += DEFAULT_STANDINGS_RULES.lossPoints;
    } else if (match.homeScore < match.awayScore) {
      away.wins += 1;
      home.losses += 1;
      away.points += DEFAULT_STANDINGS_RULES.winPoints;
      home.points += DEFAULT_STANDINGS_RULES.lossPoints;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += DEFAULT_STANDINGS_RULES.drawPoints;
      away.points += DEFAULT_STANDINGS_RULES.drawPoints;
    }
  }

  return Array.from(table.values())
    .map((row) => ({
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst,
    }))
    .sort((left, right) => {
      return (
        right.points - left.points ||
        right.goalDifference - left.goalDifference ||
        right.goalsFor - left.goalsFor ||
        right.wins - left.wins ||
        left.teamName.localeCompare(right.teamName, undefined, { sensitivity: "base" }) ||
        left.teamId.localeCompare(right.teamId)
      );
    });
}
