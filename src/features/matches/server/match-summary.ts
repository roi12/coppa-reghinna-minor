import { MatchParticipantSourceType, type Prisma } from "@prisma/client";

import {
  buildLatestEventSummary,
  buildMatchGoalSummary,
  buildMatchScoreReconciliation,
} from "@/features/matches/server/match-player-event-utils";
import type { MatchSummary } from "@/features/matches/types/match.types";

export const matchSummarySelect = {
  id: true,
  tournamentId: true,
  stageId: true,
  groupId: true,
  homeTeamId: true,
  awayTeamId: true,
  roundLabel: true,
  startsAt: true,
  endsAt: true,
  liveStartedAt: true,
  finishedAt: true,
  lastScoreUpdatedAt: true,
  locationLabel: true,
  status: true,
  homeScore: true,
  awayScore: true,
  scoreVersion: true,
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
  playerEvents: {
    where: {
      voidedAt: null,
    },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      type: true,
      teamId: true,
      awardedTeamId: true,
      playerId: true,
      playerDisplayNameSnapshot: true,
      playerJerseyNumberSnapshot: true,
      teamNameSnapshot: true,
      matchMinute: true,
      sequence: true,
      createdAt: true,
      updatedAt: true,
      voidedAt: true,
    },
  },
} satisfies Prisma.MatchSelect;

type RawMatchSummary = Prisma.MatchGetPayload<{
  select: typeof matchSummarySelect;
}>;

function buildParticipantLabel(match: RawMatchSummary, side: "home" | "away") {
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
      return sourceGroup?.name
        ? `${sourceGroupPosition ?? 1}° ${sourceGroup.name}`
        : `${sourceGroupPosition ?? 1}° classifica generale`;
    case MatchParticipantSourceType.MATCH_WINNER:
      return `Vincente ${sourceMatch?.roundLabel ?? "partita"}`;
    case MatchParticipantSourceType.MATCH_LOSER:
      return `Perdente ${sourceMatch?.roundLabel ?? "partita"}`;
    default:
      return "Squadra da definire";
  }
}

export function sortMatchSummaries(left: RawMatchSummary, right: RawMatchSummary) {
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
}

export function mapMatchSummary(match: RawMatchSummary): MatchSummary {
  const goalSummary = buildMatchGoalSummary(match.playerEvents, {
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeTeamName: buildParticipantLabel(match, "home"),
    awayTeamName: buildParticipantLabel(match, "away"),
  });
  const latestEventSummary = buildLatestEventSummary(match.playerEvents);
  const scoreReconciliation = buildMatchScoreReconciliation(match.playerEvents, {
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  });

  return {
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
    liveStartedAt: match.liveStartedAt,
    finishedAt: match.finishedAt,
    lastScoreUpdatedAt: match.lastScoreUpdatedAt,
    locationLabel: match.locationLabel,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    scoreVersion: match.scoreVersion,
    goalSummary,
    latestEventSummary,
    scoreReconciliation,
  };
}
