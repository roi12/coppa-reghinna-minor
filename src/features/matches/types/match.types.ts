export type MatchSummary = {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  roundLabel: string | null;
  startsAt: Date | null;
  locationLabel: string | null;
  status: "SCHEDULED" | "FINAL";
  homeScore: number | null;
  awayScore: number | null;
};
