import { MatchStatus } from "@prisma/client";
import { cache } from "react";

import { calculateStandings } from "@/features/standings/server/calculate-standings";
import { assembleStandingsTable } from "@/features/standings/server/assemble-standings-table";
import type { GroupStandingSummary } from "@/features/standings/types/standings.types";
import { prisma } from "@/lib/prisma";

export const getTournamentGroupStandings = cache(
  async (tournamentId: string): Promise<GroupStandingSummary[]> => {
    const groups = await prisma.tournamentGroup.findMany({
      where: { tournamentId },
      orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
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
        matches: {
          where: {
            status: MatchStatus.FINISHED,
          },
          select: {
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

    return groups.map((group) => {
      const teams = group.teams.map((entry) => entry.team);
      const finishedMatches = group.matches
        .map((match) => {
          if (
            !match.homeTeamId ||
            !match.awayTeamId ||
            !match.homeTeam?.name ||
            !match.awayTeam?.name
          ) {
            return null;
          }

          return {
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            homeTeamName: match.homeTeam.name,
            awayTeamName: match.awayTeam.name,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          };
        })
        .filter(
          (match): match is {
            homeTeamId: string;
            awayTeamId: string;
            homeTeamName: string;
            awayTeamName: string;
            homeScore: number;
            awayScore: number;
          } => match !== null,
        );
      const calculatedRows = calculateStandings(finishedMatches);

      return {
        groupId: group.id,
        groupName: group.name,
        sequence: group.sequence,
        teamCount: teams.length,
        playedMatchCount: finishedMatches.length,
        rows: assembleStandingsTable(calculatedRows, teams),
      };
    });
  },
);
