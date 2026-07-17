export type MatchPlayerEventTypeValue = "GOAL" | "OWN_GOAL" | "YELLOW_CARD" | "RED_CARD";

export type MatchGoalSummaryItem = {
  teamId: string | null;
  teamName: string;
  type: "GOAL" | "OWN_GOAL";
  label: string;
  goalCount: number;
  playerId: string | null;
};

export type MatchLatestEventSummary = {
  eventId: string;
  type: MatchPlayerEventTypeValue;
  label: string;
  teamName: string;
  matchMinute: number | null;
};

export type MatchScoreReconciliation = {
  homeRecordedGoals: number;
  awayRecordedGoals: number;
  homeUnassignedGoals: number;
  awayUnassignedGoals: number;
  homeGoalDelta: number;
  awayGoalDelta: number;
};

export type MatchPlayerEventTimelineItem = {
  id: string;
  matchId: string;
  tournamentId: string;
  teamId: string;
  awardedTeamId: string | null;
  playerId: string | null;
  type: MatchPlayerEventTypeValue;
  sequence: number;
  matchMinute: number | null;
  playerDisplayName: string | null;
  playerJerseyNumber: string | null;
  teamName: string;
  createdAt: Date;
  updatedAt: Date;
  voidedAt: Date | null;
  label: string;
};

export type TournamentScorerStandingRow = {
  position: number;
  playerId: string;
  playerName: string;
  teamId: string | null;
  teamName: string;
  goals: number;
  yellowCards: number;
  redCards: number;
};
