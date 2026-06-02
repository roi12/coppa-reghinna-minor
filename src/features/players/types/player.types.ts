export type PlayerSummary = {
  id: string;
  organizationId: string;
  teamId: string | null;
  firstName: string;
  lastName: string;
  displayName: string | null;
  jerseyNumber: string | null;
  role: string | null;
};
