export type TeamSummary = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
};

export type TournamentTeamSummary = TeamSummary & {
  seed: number | null;
  playerCount: number;
};
