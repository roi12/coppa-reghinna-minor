import { cache } from "react";

import type { TournamentFormatValue } from "@/features/tournaments/types/tournament-format.types";
import { deriveTournamentFormatFromPersistedStages } from "@/features/tournaments/server/tournament-competition";
import { prisma } from "@/lib/prisma";

export type DashboardTournamentDetail = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  name: string;
  slug: string;
  sport: string;
  seasonLabel: string;
  format: TournamentFormatValue;
  locationLabel: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  expectedTeamCount: number | null;
  scheduleStartDate: Date | null;
  scheduleMaxMatchesPerDay: number | null;
  scheduleMinimumRestDays: number | null;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED";
  publishedAt: Date | null;
  teamCount: number;
  matchCount: number;
  stages: Array<{
    id: string;
    order: number;
    type: "GROUP_STAGE" | "KNOCKOUT_STAGE";
    name: string;
    isPublic?: boolean;
    groupCount: number | null;
    teamsPerGroup: number | null;
    legs: number | null;
    qualifiersPerGroup: number | null;
    knockoutTeamCount: number | null;
    knockoutRound: string | null;
    includeThirdPlaceMatch: boolean | null;
    stageBreakDaysAfter: number | null;
    configuration: unknown;
  }>;
  scheduleSlots: Array<{
    id: string;
    sequence: number;
    startMinutes: number;
    durationMinutes: number;
  }>;
};

export const getDashboardTournamentBySlug = cache(
  async (slug: string): Promise<DashboardTournamentDetail | null> => {
    const tournament = await prisma.tournament.findUnique({
      where: { slug },
      select: {
        id: true,
        organizationId: true,
        name: true,
        slug: true,
        sport: true,
        seasonLabel: true,
        format: true,
        locationLabel: true,
        startsAt: true,
        endsAt: true,
        expectedTeamCount: true,
        scheduleStartDate: true,
        scheduleMaxMatchesPerDay: true,
        scheduleMinimumRestDays: true,
        status: true,
        publishedAt: true,
        stages: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            type: true,
            name: true,
            isPublic: true,
            groupCount: true,
            teamsPerGroup: true,
            legs: true,
            qualifiersPerGroup: true,
            knockoutTeamCount: true,
            knockoutRound: true,
            includeThirdPlaceMatch: true,
            stageBreakDaysAfter: true,
            configuration: true,
          },
        },
        scheduleSlots: {
          orderBy: { sequence: "asc" },
          select: {
            id: true,
            sequence: true,
            startMinutes: true,
            durationMinutes: true,
          },
        },
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            teams: true,
            matches: true,
          },
        },
      },
    });

    if (!tournament) {
      return null;
    }

    return {
      id: tournament.id,
      organizationId: tournament.organizationId,
      organizationName: tournament.organization.name,
      organizationSlug: tournament.organization.slug,
      name: tournament.name,
      slug: tournament.slug,
      sport: tournament.sport,
      seasonLabel: tournament.seasonLabel,
      format: deriveTournamentFormatFromPersistedStages(tournament.stages, tournament.format),
      locationLabel: tournament.locationLabel,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
      expectedTeamCount: tournament.expectedTeamCount,
      scheduleStartDate: tournament.scheduleStartDate,
      scheduleMaxMatchesPerDay: tournament.scheduleMaxMatchesPerDay,
      scheduleMinimumRestDays: tournament.scheduleMinimumRestDays,
      status: tournament.status,
      publishedAt: tournament.publishedAt,
      teamCount: tournament._count.teams,
      matchCount: tournament._count.matches,
      stages: tournament.stages,
      scheduleSlots: tournament.scheduleSlots,
    };
  },
);
