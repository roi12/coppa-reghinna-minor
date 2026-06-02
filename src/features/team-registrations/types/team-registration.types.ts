export const TEAM_REGISTRATION_STATUS_VALUES = ["PENDING", "APPROVED", "REJECTED"] as const;

export type TeamRegistrationStatusValue = (typeof TEAM_REGISTRATION_STATUS_VALUES)[number];

export type TeamRegistrationPlayerInput = {
  firstName: string;
  lastName: string;
  jerseyNumber: string;
  role?: string;
  sortOrder: number;
};

export type TeamRegistrationSubmissionInput = {
  tournamentId: string;
  captainFirstName: string;
  captainLastName: string;
  captainEmail: string;
  captainPhone: string;
  teamName: string;
  notes?: string;
  players: TeamRegistrationPlayerInput[];
};

export type TeamRegistrationSummary = {
  id: string;
  tournamentId: string;
  teamId: string | null;
  captainFirstName: string;
  captainLastName: string;
  captainEmail: string;
  captainPhone: string;
  teamName: string;
  notes: string | null;
  status: TeamRegistrationStatusValue;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TeamRegistrationRosterPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string;
  role: string | null;
  sortOrder: number;
  createdAt: Date;
};

export type TeamRegistrationDetail = TeamRegistrationSummary & {
  reviewedByName: string | null;
  players: TeamRegistrationRosterPlayer[];
};
