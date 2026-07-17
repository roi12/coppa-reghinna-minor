export type StandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type PreliminaryStandingsMode = "GLOBAL" | "GROUPS";

export type GroupStandingSummary = {
  groupId: string;
  groupName: string;
  sequence: number;
  teamCount: number;
  playedMatchCount: number;
  rows: StandingRow[];
};
