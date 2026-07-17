import { TournamentStageType } from "@prisma/client";
import { cache } from "react";

import {
  buildPreliminaryStandings,
  countFinishedPreliminaryMatches,
  getPreliminaryStandingsLabel,
  resolvePreliminaryStandingsScope,
  type PreliminaryStandingsScope,
} from "@/features/standings/server/preliminary-standings";
import type { GroupStandingSummary, StandingRow } from "@/features/standings/types/standings.types";
import { prisma } from "@/lib/prisma";

export type TournamentStandingsSnapshot = {
  preliminaryStageId: string | null;
  preliminaryStandingsMode: PreliminaryStandingsScope;
  preliminaryStandingsLabel: string;
  finishedPreliminaryMatchCount: number;
  standings: StandingRow[];
  groupStandings: GroupStandingSummary[];
};

export const getTournamentStandingsSnapshot = cache(
  async (tournamentId: string): Promise<TournamentStandingsSnapshot | null> => {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        format: true,
        stages: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            configuration: true,
          },
        },
        teams: {
          orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
          select: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        groups: {
          orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            stageId: true,
            name: true,
            sequence: true,
            teams: {
              orderBy: [{ groupSlot: "asc" }, { seed: "asc" }, { createdAt: "asc" }],
              select: {
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        matches: {
          select: {
            stageId: true,
            groupId: true,
            status: true,
            homeTeamId: true,
            awayTeamId: true,
            homeScore: true,
            awayScore: true,
            homeTeam: {
              select: {
                name: true,
              },
            },
            awayTeam: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      return null;
    }

    const preliminaryStage =
      tournament.stages.find((stage) => stage.type === TournamentStageType.GROUP_STAGE) ?? null;
    const preliminaryStandingsMode = resolvePreliminaryStandingsScope({
      tournamentFormat: tournament.format,
      configuration: preliminaryStage?.configuration ?? null,
    });
    const teams = tournament.teams.map((entry) => entry.team);
    const groups = tournament.groups.map((group) => ({
      id: group.id,
      stageId: group.stageId,
      name: group.name,
      sequence: group.sequence,
      teams: group.teams.map((entry) => entry.team),
    }));
    const matches = tournament.matches.map((match) => ({
      stageId: match.stageId,
      groupId: match.groupId,
      status: match.status,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homeTeamName: match.homeTeam?.name ?? null,
      awayTeamName: match.awayTeam?.name ?? null,
    }));
    const { standings, groupStandings } = buildPreliminaryStandings({
      scope: preliminaryStandingsMode,
      preliminaryStageId: preliminaryStage?.id ?? null,
      teams,
      groups,
      matches,
    });

    return {
      preliminaryStageId: preliminaryStage?.id ?? null,
      preliminaryStandingsMode,
      preliminaryStandingsLabel: getPreliminaryStandingsLabel(preliminaryStandingsMode),
      finishedPreliminaryMatchCount: countFinishedPreliminaryMatches(
        matches,
        preliminaryStage?.id ?? null,
      ),
      standings,
      groupStandings,
    };
  },
);
