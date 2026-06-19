export type MatchSummary = {
  id: string;
  tournamentId: string;
  stageId: string | null;
  stageType?: "GROUP_STAGE" | "KNOCKOUT_STAGE" | null;
  stageIsPublic?: boolean | null;
  groupId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  roundLabel: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  locationLabel: string | null;
  status: "SCHEDULED" | "LIVE" | "FINAL";
  homeScore: number | null;
  awayScore: number | null;
};
