export type TournamentGroupSummary = {
  id: string;
  tournamentId: string;
  name: string;
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
};

export type TournamentGroupTeamSummary = {
  tournamentTeamId: string;
  teamId: string;
  organizationId: string;
  name: string;
  slug: string;
  seed: number | null;
  groupSlot: number | null;
  playerCount: number;
  createdAt: Date;
};

export type TournamentGroupDetail = TournamentGroupSummary & {
  teams: TournamentGroupTeamSummary[];
};

export type TournamentGroupsSnapshot = {
  groups: TournamentGroupDetail[];
  existingGroupCount: number;
  assignedTeamCount: number;
  unassignedTeamCount: number;
  unassignedTeams: TournamentGroupTeamSummary[];
  isUneven: boolean;
};

export type GroupDistributionTeamInput = {
  tournamentTeamId: string;
  teamId: string;
  teamName: string;
  seed: number | null;
  createdAt: Date;
};

export type GroupDistributionAssignment = {
  tournamentTeamId: string;
  teamId: string;
  teamName: string;
  seed: number | null;
  groupSequence: number;
  groupName: string;
  groupSlot: number;
};

export type GroupDistributionPlanGroup = {
  groupSequence: number;
  groupName: string;
  targetSize: number;
  teams: GroupDistributionAssignment[];
};

export type GroupDistributionPlan = {
  groupCount: number;
  totalTeamCount: number;
  isEven: boolean;
  targetGroupSizes: number[];
  groups: GroupDistributionPlanGroup[];
};
