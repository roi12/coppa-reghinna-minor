import { cache } from "react";

import { buildPreliminaryStandingsSnapshot } from "@/features/standings/server/preliminary-standings";
import { prisma } from "@/lib/prisma";

export const getTournamentStandingsSnapshot = cache(async (tournamentId: string) => {
  const [stages, groups, tournamentTeams, matches] = await Promise.all([
    prisma.tournamentStage.findMany({
      where: { tournamentId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        groupCount: true,
        configuration: true,
      },
    }),
    prisma.tournamentGroup.findMany({
      where: { tournamentId },
      orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        sequence: true,
        stageId: true,
      },
    }),
    prisma.tournamentTeam.findMany({
      where: { tournamentId },
      orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
      select: {
        groupId: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.match.findMany({
      where: { tournamentId },
      select: {
        id: true,
        stageId: true,
        groupId: true,
        roundLabel: true,
        status: true,
        homeScore: true,
        awayScore: true,
        homeTeamId: true,
        awayTeamId: true,
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
        stage: {
          select: {
            type: true,
          },
        },
      },
    }),
  ]);

  return buildPreliminaryStandingsSnapshot({
    stages,
    groups,
    teams: tournamentTeams.map((entry) => ({
      id: entry.team.id,
      name: entry.team.name,
      groupId: entry.groupId,
    })),
    matches: matches.map((match) => ({
      id: match.id,
      stageId: match.stageId,
      stageType: match.stage?.type ?? null,
      groupId: match.groupId,
      roundLabel: match.roundLabel,
      status: match.status,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeamName: match.homeTeam?.name ?? "Squadra",
      awayTeamName: match.awayTeam?.name ?? "Squadra",
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    })),
  });
});
