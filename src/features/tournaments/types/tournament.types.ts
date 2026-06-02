import type { TournamentFormatValue } from "@/features/tournaments/types/tournament-format.types";

export type TournamentSummary = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  sport: string;
  seasonLabel: string;
  format: TournamentFormatValue;
};

export type TournamentPublicListItem = TournamentSummary & {
  locationLabel: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED";
  organizationName: string;
  organizationSlug: string;
  teamCount: number;
  matchCount: number;
};

export type TournamentPublicDetail = TournamentPublicListItem & {
  publishedAt: Date | null;
  completedMatchCount: number;
};
