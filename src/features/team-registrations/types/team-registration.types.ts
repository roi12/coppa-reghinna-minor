export const TEAM_REGISTRATION_STATUS_VALUES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const TEAM_REGISTRATION_PLAYER_DOCUMENT_STATUS_VALUES = [
  "MISSING",
  "UPLOADED",
  "PAPER_DELIVERY",
] as const;

export type TeamRegistrationStatusValue = (typeof TEAM_REGISTRATION_STATUS_VALUES)[number];
export type TeamRegistrationPlayerDocumentStatusValue =
  (typeof TEAM_REGISTRATION_PLAYER_DOCUMENT_STATUS_VALUES)[number];

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
  documentStatus: TeamRegistrationPlayerDocumentStatusValue;
  documentFilePath: string | null;
  documentFileName: string | null;
  documentMimeType: string | null;
  documentSizeBytes: number | null;
  documentUploadedAt: Date | null;
  documentMarkedPaperAt: Date | null;
  createdAt: Date;
};

export type TeamRegistrationDetail = TeamRegistrationSummary & {
  reviewedByName: string | null;
  players: TeamRegistrationRosterPlayer[];
};

export type TeamRegistrationManageLinkReveal = {
  managePath: string;
  manageUrl: string;
};

export type TeamRegistrationManageDetail = TeamRegistrationDetail & {
  tournamentSlug: string;
  tournamentName: string;
  captainManageTokenIssuedAt: Date | null;
  captainManageTokenLastUsedAt: Date | null;
  captainManageTokenRevokedAt: Date | null;
};
