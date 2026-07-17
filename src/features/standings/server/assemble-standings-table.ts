import type { StandingRow } from "@/features/standings/types/standings.types";

type StandingsTeamReference = {
  id: string;
  name: string;
};

function createEmptyStandingRow(team: StandingsTeamReference): StandingRow {
  return {
    teamId: team.id,
    teamName: team.name,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

export function sortStandings(left: StandingRow, right: StandingRow) {
  return (
    right.points - left.points ||
    right.goalDifference - left.goalDifference ||
    right.goalsFor - left.goalsFor ||
    right.wins - left.wins ||
    left.teamName.localeCompare(right.teamName, undefined, { sensitivity: "base" }) ||
    left.teamId.localeCompare(right.teamId)
  );
}

export function assembleStandingsTable(
  calculatedRows: StandingRow[],
  teams: StandingsTeamReference[],
): StandingRow[] {
  const teamIdsWithRows = new Set(calculatedRows.map((row) => row.teamId));
  const emptyRows = teams
    .filter((team) => !teamIdsWithRows.has(team.id))
    .map(createEmptyStandingRow);

  return [...calculatedRows, ...emptyRows].sort(sortStandings);
}
