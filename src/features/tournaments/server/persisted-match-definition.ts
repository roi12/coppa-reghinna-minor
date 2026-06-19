import { MatchParticipantSourceType, TournamentStageType } from "@prisma/client";

import type {
  CompetitionMatchDefinition,
  CompetitionParticipantSource,
} from "@/features/tournaments/types/competition.types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function inferPersistedRoundNumber(match: {
  stage: {
    type: TournamentStageType;
  } | null;
  roundLabel: string | null;
  sequence: number | null;
}) {
  if (match.stage?.type === TournamentStageType.GROUP_STAGE) {
    const parsedRoundNumber = match.roundLabel?.match(/Giornata\s+(\d+)/i)?.[1];

    if (parsedRoundNumber) {
      return Number(parsedRoundNumber);
    }
  }

  const normalizedRoundLabel = match.roundLabel?.trim().toUpperCase() ?? "";

  if (normalizedRoundLabel.startsWith("QF")) {
    return 1;
  }

  if (normalizedRoundLabel.startsWith("SF")) {
    return 2;
  }

  if (normalizedRoundLabel === "FINALE" || normalizedRoundLabel === "FINALE 3° POSTO") {
    return 3;
  }

  return match.sequence ?? 1;
}

export type PersistedManagedMatchForScheduling = {
  id: string;
  stageId: string | null;
  sequence: number | null;
  roundLabel: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeParticipantSourceType: MatchParticipantSourceType | null;
  awayParticipantSourceType: MatchParticipantSourceType | null;
  homeSourceTeamId: string | null;
  awaySourceTeamId: string | null;
  homeSourceGroupId: string | null;
  awaySourceGroupId: string | null;
  homeSourceGroupPosition: number | null;
  awaySourceGroupPosition: number | null;
  homeSourceMatchId: string | null;
  awaySourceMatchId: string | null;
  groupId: string | null;
  stage: {
    id: string;
    order: number;
    type: TournamentStageType;
    name: string;
    knockoutRound: string | null;
  } | null;
  homeTeam: {
    name: string;
  } | null;
  awayTeam: {
    name: string;
  } | null;
  homeSourceGroup: {
    name: string;
  } | null;
  awaySourceGroup: {
    name: string;
  } | null;
};

export function mapPersistedMatchToDefinition(
  match: PersistedManagedMatchForScheduling,
): CompetitionMatchDefinition {
  const readSource = (side: "home" | "away"): CompetitionParticipantSource => {
    const participantSourceType =
      side === "home" ? match.homeParticipantSourceType : match.awayParticipantSourceType;
    const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
    const sourceTeamId = side === "home" ? match.homeSourceTeamId : match.awaySourceTeamId;
    const sourceGroupId = side === "home" ? match.homeSourceGroupId : match.awaySourceGroupId;
    const sourceGroupPosition =
      side === "home" ? match.homeSourceGroupPosition : match.awaySourceGroupPosition;
    const sourceMatchId = side === "home" ? match.homeSourceMatchId : match.awaySourceMatchId;
    const sourceTeamName = side === "home" ? match.homeTeam?.name : match.awayTeam?.name;
    const sourceGroupName =
      side === "home" ? match.homeSourceGroup?.name : match.awaySourceGroup?.name;

    switch (participantSourceType) {
      case MatchParticipantSourceType.GROUP_POSITION:
        return {
          type: "GROUP_POSITION",
          groupId: sourceGroupId ?? "",
          groupName: sourceGroupName ?? "Gruppo",
          position: sourceGroupPosition ?? 1,
          label: `${sourceGroupPosition ?? 1}° ${sourceGroupName ?? "Gruppo"}`,
        };
      case MatchParticipantSourceType.MATCH_WINNER:
        return {
          type: "MATCH_WINNER",
          matchKey: sourceMatchId ?? "",
          label: `Vincente ${match.roundLabel ?? "partita"}`,
        };
      case MatchParticipantSourceType.MATCH_LOSER:
        return {
          type: "MATCH_LOSER",
          matchKey: sourceMatchId ?? "",
          label: `Perdente ${match.roundLabel ?? "partita"}`,
        };
      case MatchParticipantSourceType.DIRECT_TEAM:
      default:
        return {
          type: "DIRECT_TEAM",
          teamId: sourceTeamId ?? teamId ?? "",
          label: sourceTeamName ?? "Squadra da definire",
        };
    }
  };

  assert(match.stageId && match.stage, "Managed matches must belong to a stage.");

  return {
    key: match.id,
    format: "SINGLE_ROUND_ROBIN",
    stageId: match.stageId,
    stageOrder: match.stage.order,
    stageType: match.stage.type,
    stageName: match.stage.name,
    groupId: match.groupId,
    groupName: null,
    knockoutRound: (match.stage.knockoutRound as CompetitionMatchDefinition["knockoutRound"]) ?? null,
    roundNumber: inferPersistedRoundNumber(match),
    sequence: match.sequence ?? 1,
    roundLabel: match.roundLabel ?? "Partita",
    home: readSource("home"),
    away: readSource("away"),
  };
}
