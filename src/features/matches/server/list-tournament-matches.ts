import { MatchParticipantSourceType } from "@prisma/client";
import { cache } from "react";

import type { MatchSummary } from "@/features/matches/types/match.types";
import { prisma } from "@/lib/prisma";

export const listTournamentMatches = cache(async (tournamentId: string): Promise<MatchSummary[]> => {
  const matches = await prisma.match.findMany({
    where: { tournamentId },
    select: {
      id: true,
      tournamentId: true,
      stageId: true,
      groupId: true,
      homeTeamId: true,
      awayTeamId: true,
      roundLabel: true,
      startsAt: true,
      endsAt: true,
      locationLabel: true,
      status: true,
      homeScore: true,
      awayScore: true,
      homeParticipantSourceType: true,
      awayParticipantSourceType: true,
      homeSourceGroupPosition: true,
      awaySourceGroupPosition: true,
      createdAt: true,
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
      homeSourceGroup: {
        select: {
          name: true,
        },
      },
      awaySourceGroup: {
        select: {
          name: true,
        },
      },
      homeSourceMatch: {
        select: {
          roundLabel: true,
        },
      },
      awaySourceMatch: {
        select: {
          roundLabel: true,
        },
      },
      stage: {
        select: {
          type: true,
          isPublic: true,
        },
      },
    },
  });

  function buildParticipantLabel(match: (typeof matches)[number], side: "home" | "away") {
    const team = side === "home" ? match.homeTeam : match.awayTeam;

    if (team?.name) {
      return team.name;
    }

    const sourceType =
      side === "home" ? match.homeParticipantSourceType : match.awayParticipantSourceType;
    const sourceGroup = side === "home" ? match.homeSourceGroup : match.awaySourceGroup;
    const sourceGroupPosition =
      side === "home" ? match.homeSourceGroupPosition : match.awaySourceGroupPosition;
    const sourceMatch = side === "home" ? match.homeSourceMatch : match.awaySourceMatch;

    switch (sourceType) {
      case MatchParticipantSourceType.GROUP_POSITION:
        return `${sourceGroupPosition ?? 1}° ${sourceGroup?.name ?? "Gruppo"}`;
      case MatchParticipantSourceType.MATCH_WINNER:
        return `Vincente ${sourceMatch?.roundLabel ?? "partita"}`;
      case MatchParticipantSourceType.MATCH_LOSER:
        return `Perdente ${sourceMatch?.roundLabel ?? "partita"}`;
      default:
        return "Squadra da definire";
    }
  }

  return matches
    .sort((left, right) => {
      if (left.startsAt && right.startsAt) {
        return left.startsAt.getTime() - right.startsAt.getTime();
      }

      if (left.startsAt) {
        return -1;
      }

      if (right.startsAt) {
        return 1;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    })
    .map((match) => ({
      id: match.id,
      tournamentId: match.tournamentId,
      stageId: match.stageId,
      stageType: match.stage?.type ?? null,
      stageIsPublic: match.stage?.isPublic ?? null,
      groupId: match.groupId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeamName: buildParticipantLabel(match, "home"),
      awayTeamName: buildParticipantLabel(match, "away"),
      roundLabel: match.roundLabel,
      startsAt: match.startsAt,
      endsAt: match.endsAt,
      locationLabel: match.locationLabel,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    }));
});
