import { MatchParticipantSourceType, MatchStatus, TournamentStageType } from "@prisma/client";

import { calculateStandings } from "@/features/standings/server/calculate-standings";
import { resolvePreliminaryStandingsScope } from "@/features/standings/server/preliminary-standings";
import { mapPersistedStagesToCompetitionInput } from "@/features/tournaments/server/tournament-competition";
import { prisma } from "@/lib/prisma";

function hasAmbiguousRankingAtPosition(
  rows: Array<{
    points: number;
    goalDifference: number;
    goalsFor: number;
    wins: number;
  }>,
  position: number,
) {
  const row = rows[position - 1];

  if (!row) {
    return true;
  }

  const tiedRows = rows.filter(
    (candidate) =>
      candidate.points === row.points &&
      candidate.goalDifference === row.goalDifference &&
      candidate.goalsFor === row.goalsFor &&
      candidate.wins === row.wins,
  );

  return tiedRows.length > 1;
}

export async function resolveTournamentKnockoutParticipants(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      format: true,
      stages: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          type: true,
          name: true,
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
    },
  });

  if (!tournament) {
    throw new Error("Tournament not found.");
  }

  const stageDefinitions = mapPersistedStagesToCompetitionInput(tournament.stages);
  const groupStage = stageDefinitions.find(
    (
      stage,
    ): stage is Extract<(typeof stageDefinitions)[number], { type: "GROUP_STAGE" }> =>
      stage.type === "GROUP_STAGE",
  );
  const preliminaryStage =
    tournament.stages.find((stage) => stage.type === TournamentStageType.GROUP_STAGE) ?? null;
  if (!groupStage || !preliminaryStage) {
    return { updateCount: 0 };
  }
  const scope = resolvePreliminaryStandingsScope({
    tournamentFormat: tournament.format,
    configuration: preliminaryStage?.configuration ?? null,
  });

  const [groups, preliminaryMatches] = await Promise.all([
    prisma.tournamentGroup.findMany({
      where: {
        tournamentId: tournament.id,
        stageId: preliminaryStage?.id ?? undefined,
      },
      orderBy: { sequence: "asc" },
      select: {
        id: true,
      },
    }),
    prisma.match.findMany({
      where: {
        tournamentId: tournament.id,
        stageId: preliminaryStage?.id ?? undefined,
      },
      select: {
        groupId: true,
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
      },
    }),
  ]);

  const resolvedGroupPositions = new Map<string, Map<number, string>>();
  const resolvedGlobalPositions = new Map<number, string>();

  const knockoutMatches = await prisma.match.findMany({
    where: {
      tournamentId: tournament.id,
      stage: {
        type: TournamentStageType.KNOCKOUT_STAGE,
      },
    },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      homeTeamId: true,
      awayTeamId: true,
      homeParticipantLocked: true,
      awayParticipantLocked: true,
      homeParticipantSourceType: true,
      awayParticipantSourceType: true,
      homeSourceGroupId: true,
      awaySourceGroupId: true,
      homeSourceGroupPosition: true,
      awaySourceGroupPosition: true,
      homeSourceMatch: {
        select: {
          status: true,
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
        },
      },
      awaySourceMatch: {
        select: {
          status: true,
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
        },
      },
    },
  });

  if (scope === "GLOBAL") {
    const hasGroupedQualificationSources = knockoutMatches.some(
      (match) =>
        (match.homeParticipantSourceType === MatchParticipantSourceType.GROUP_POSITION &&
          match.homeSourceGroupId !== null) ||
        (match.awayParticipantSourceType === MatchParticipantSourceType.GROUP_POSITION &&
          match.awaySourceGroupId !== null),
    );

    if (hasGroupedQualificationSources) {
      throw new Error(
        "La qualificazione globale non può essere risolta automaticamente perché la fase finale usa ancora posizioni di girone già generate.",
      );
    }

    const allPreliminaryMatchesCompleted =
      preliminaryMatches.length > 0 &&
      preliminaryMatches.every(
        (match) =>
          match.status === MatchStatus.FINISHED &&
          match.homeScore !== null &&
          match.awayScore !== null &&
          match.homeTeamId !== null &&
          match.awayTeamId !== null,
      );

    if (allPreliminaryMatchesCompleted) {
      const rows = calculateStandings(
        preliminaryMatches.map((match) => ({
          homeTeamId: match.homeTeamId as string,
          awayTeamId: match.awayTeamId as string,
          homeTeamName: match.homeTeam?.name ?? "Squadra",
          awayTeamName: match.awayTeam?.name ?? "Squadra",
          homeScore: match.homeScore as number,
          awayScore: match.awayScore as number,
        })),
      );

      const positions = Array.from(
        new Set(
          knockoutMatches.flatMap((match) => [
            match.homeParticipantSourceType === MatchParticipantSourceType.GROUP_POSITION &&
            match.homeSourceGroupId === null &&
            match.homeSourceGroupPosition
              ? match.homeSourceGroupPosition
              : null,
            match.awayParticipantSourceType === MatchParticipantSourceType.GROUP_POSITION &&
            match.awaySourceGroupId === null &&
            match.awaySourceGroupPosition
              ? match.awaySourceGroupPosition
              : null,
          ]),
        ),
      )
        .filter((position): position is number => typeof position === "number")
        .sort((left, right) => left - right);

      for (const position of positions) {
        if (hasAmbiguousRankingAtPosition(rows, position)) {
          continue;
        }

        const row = rows[position - 1];

        if (row) {
          resolvedGlobalPositions.set(position, row.teamId);
        }
      }
    }
  } else {
    for (const group of groups) {
      const groupMatches = preliminaryMatches.filter((match) => match.groupId === group.id);
      const allGroupMatchesCompleted =
        groupMatches.length > 0 &&
        groupMatches.every(
          (match) =>
            match.status === MatchStatus.FINISHED &&
            match.homeScore !== null &&
            match.awayScore !== null &&
            match.homeTeamId !== null &&
            match.awayTeamId !== null,
        );

      if (!allGroupMatchesCompleted) {
        continue;
      }

      const rows = calculateStandings(
        groupMatches.map((match) => ({
          homeTeamId: match.homeTeamId as string,
          awayTeamId: match.awayTeamId as string,
          homeTeamName: match.homeTeam?.name ?? "Squadra",
          awayTeamName: match.awayTeam?.name ?? "Squadra",
          homeScore: match.homeScore as number,
          awayScore: match.awayScore as number,
        })),
      );

      for (let position = 1; position <= (groupStage?.qualifiersPerGroup ?? 0); position += 1) {
        if (hasAmbiguousRankingAtPosition(rows, position)) {
          continue;
        }

        const row = rows[position - 1];

        if (!row) {
          continue;
        }

        const groupPositions = resolvedGroupPositions.get(group.id) ?? new Map<number, string>();
        groupPositions.set(position, row.teamId);
        resolvedGroupPositions.set(group.id, groupPositions);
      }
    }
  }

  let updateCount = 0;

  for (const match of knockoutMatches) {
    const resolveFromSource = (side: "home" | "away") => {
      const sourceType =
        side === "home" ? match.homeParticipantSourceType : match.awayParticipantSourceType;
      const sourceGroupId = side === "home" ? match.homeSourceGroupId : match.awaySourceGroupId;
      const sourceGroupPosition =
        side === "home" ? match.homeSourceGroupPosition : match.awaySourceGroupPosition;
      const sourceMatch = side === "home" ? match.homeSourceMatch : match.awaySourceMatch;

      if (sourceType === MatchParticipantSourceType.GROUP_POSITION) {
        if (!sourceGroupPosition) {
          return null;
        }

        if (scope === "GLOBAL") {
          if (sourceGroupId !== null) {
            throw new Error(
              "La qualificazione globale non può essere risolta automaticamente con sorgenti ancora legate ai gironi.",
            );
          }

          return resolvedGlobalPositions.get(sourceGroupPosition) ?? null;
        }

        if (!sourceGroupId) {
          return null;
        }

        return resolvedGroupPositions.get(sourceGroupId)?.get(sourceGroupPosition) ?? null;
      }

      if (
        (sourceType === MatchParticipantSourceType.MATCH_WINNER ||
          sourceType === MatchParticipantSourceType.MATCH_LOSER) &&
        sourceMatch &&
        sourceMatch.status === MatchStatus.FINISHED &&
        sourceMatch.homeScore !== null &&
        sourceMatch.awayScore !== null &&
        sourceMatch.homeTeamId &&
        sourceMatch.awayTeamId &&
        sourceMatch.homeScore !== sourceMatch.awayScore
      ) {
        const winnerTeamId =
          sourceMatch.homeScore > sourceMatch.awayScore ? sourceMatch.homeTeamId : sourceMatch.awayTeamId;
        const loserTeamId =
          sourceMatch.homeScore > sourceMatch.awayScore ? sourceMatch.awayTeamId : sourceMatch.homeTeamId;

        return sourceType === MatchParticipantSourceType.MATCH_WINNER ? winnerTeamId : loserTeamId;
      }

      return null;
    };

    const nextHomeTeamId = !match.homeParticipantLocked ? resolveFromSource("home") : null;
    const nextAwayTeamId = !match.awayParticipantLocked ? resolveFromSource("away") : null;
    const data: Record<string, string | null> = {};

    if (nextHomeTeamId && match.homeTeamId !== nextHomeTeamId) {
      data.homeTeamId = nextHomeTeamId;
    }

    if (nextAwayTeamId && match.awayTeamId !== nextAwayTeamId) {
      data.awayTeamId = nextAwayTeamId;
    }

    if (Object.keys(data).length === 0) {
      continue;
    }

    await prisma.match.update({
      where: { id: match.id },
      data,
    });
    updateCount += 1;
  }

  return { updateCount };
}
