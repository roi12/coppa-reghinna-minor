import { MatchParticipantSourceType, MatchStatus, TournamentStageType } from "@prisma/client";

import { getTournamentStandingsSnapshot } from "@/features/standings/server/get-tournament-standings-snapshot";
import { mapPersistedStagesToCompetitionInput } from "@/features/tournaments/server/tournament-competition";
import { prisma } from "@/lib/prisma";

function hasAmbiguousRankingAtPosition(
  rows: Array<{
    points: number;
    goalDifference: number;
    goalsFor: number;
    wins: number;
    teamId: string;
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

function buildGlobalQualificationPositions(args: {
  knockoutMatches: Array<{
    id: string;
    roundLabel: string | null;
    homeParticipantSourceType: MatchParticipantSourceType | null;
    awayParticipantSourceType: MatchParticipantSourceType | null;
    homeSourceGroupPosition: number | null;
    awaySourceGroupPosition: number | null;
  }>;
  qualifierCount: number;
}) {
  const slots = args.knockoutMatches.flatMap((match) => [
    {
      matchId: match.id,
      matchLabel: match.roundLabel ?? "Partita",
      side: "home" as const,
      sourceType: match.homeParticipantSourceType,
      explicitPosition: match.homeSourceGroupPosition,
    },
    {
      matchId: match.id,
      matchLabel: match.roundLabel ?? "Partita",
      side: "away" as const,
      sourceType: match.awayParticipantSourceType,
      explicitPosition: match.awaySourceGroupPosition,
    },
  ]).filter((slot) => slot.sourceType === MatchParticipantSourceType.GROUP_POSITION);

  const explicitPositions = slots.map((slot) => slot.explicitPosition);
  const useExplicitPositions =
    explicitPositions.every((position): position is number => Number.isInteger(position) && position !== null) &&
    new Set(explicitPositions).size === explicitPositions.length &&
    explicitPositions.every((position) => position >= 1 && position <= args.qualifierCount);

  const sortedSlots = slots.sort((left, right) => {
    if (useExplicitPositions && left.explicitPosition !== right.explicitPosition) {
      return (left.explicitPosition as number) - (right.explicitPosition as number);
    }

    return (
      left.matchLabel.localeCompare(right.matchLabel, undefined, { numeric: true, sensitivity: "base" }) ||
      left.matchId.localeCompare(right.matchId) ||
      left.side.localeCompare(right.side)
    );
  });

  const positions = new Map<string, number>();
  let fallbackPosition = 1;

  for (const slot of sortedSlots) {
    const position = useExplicitPositions ? (slot.explicitPosition as number) : fallbackPosition++;

    if (position > args.qualifierCount) {
      continue;
    }

    positions.set(`${slot.matchId}:${slot.side}`, position);
  }

  return positions;
}

export async function resolveTournamentKnockoutParticipants(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
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
  const knockoutStage = stageDefinitions.find(
    (
      stage,
    ): stage is Extract<(typeof stageDefinitions)[number], { type: "KNOCKOUT_STAGE" }> =>
      stage.type === "KNOCKOUT_STAGE",
  );

  const standingsSnapshot = await getTournamentStandingsSnapshot(tournamentId);
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
      roundLabel: true,
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

  const resolvedGroupPositions = new Map<string, Map<number, string>>();

  if (standingsSnapshot.mode === "GROUPS" && groupStage && groupStage.qualifiersPerGroup > 0) {
    for (const groupStanding of standingsSnapshot.groupStandings) {
      const groupPositions = new Map<number, string>();

      for (let position = 1; position <= groupStage.qualifiersPerGroup; position += 1) {
        if (hasAmbiguousRankingAtPosition(groupStanding.rows, position)) {
          continue;
        }

        const row = groupStanding.rows[position - 1];

        if (row) {
          groupPositions.set(position, row.teamId);
        }
      }

      resolvedGroupPositions.set(groupStanding.groupId, groupPositions);
    }
  } else if (knockoutStage) {
    const slotPositions = buildGlobalQualificationPositions({
      knockoutMatches: knockoutMatches.map((match) => ({
        id: match.id,
        roundLabel: match.roundLabel,
        homeParticipantSourceType: match.homeParticipantSourceType,
        awayParticipantSourceType: match.awayParticipantSourceType,
        homeSourceGroupPosition: match.homeSourceGroupPosition,
        awaySourceGroupPosition: match.awaySourceGroupPosition,
      })),
      qualifierCount: knockoutStage.knockoutTeamCount,
    });
    const globalPositions = new Map<number, string>();

    for (let position = 1; position <= knockoutStage.knockoutTeamCount; position += 1) {
      if (hasAmbiguousRankingAtPosition(standingsSnapshot.standings, position)) {
        continue;
      }

      const row = standingsSnapshot.standings[position - 1];

      if (row) {
        globalPositions.set(position, row.teamId);
      }
    }

    resolvedGroupPositions.set("global-standings", globalPositions);

    for (const match of knockoutMatches) {
      for (const side of ["home", "away"] as const) {
        const key = `${match.id}:${side}`;
        const position = slotPositions.get(key);

        if (!position) {
          continue;
        }

        if (side === "home") {
          match.homeSourceGroupPosition = position;
        } else {
          match.awaySourceGroupPosition = position;
        }
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

        if (standingsSnapshot.mode === "GLOBAL") {
          return resolvedGroupPositions.get("global-standings")?.get(sourceGroupPosition) ?? null;
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
