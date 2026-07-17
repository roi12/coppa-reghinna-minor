import {
  MatchParticipantSourceType,
  MatchStatus,
  TournamentStageType,
} from "@prisma/client";

import { assembleStandingsTable } from "@/features/standings/server/assemble-standings-table";
import { calculateStandings } from "@/features/standings/server/calculate-standings";
import type {
  GroupStandingSummary,
  PreliminaryStandingsMode,
  StandingRow,
} from "@/features/standings/types/standings.types";

type PreliminaryStageDefinition = {
  id: string;
  name: string;
  type: TournamentStageType | "GROUP_STAGE" | "KNOCKOUT_STAGE";
  groupCount: number | null;
  configuration: unknown;
};

type PreliminaryGroupDefinition = {
  id: string;
  name: string;
  sequence: number;
  stageId: string | null;
};

type PreliminaryTeamDefinition = {
  id: string;
  name: string;
  groupId: string | null;
};

type PreliminaryMatchDefinition = {
  id: string;
  stageId: string | null;
  stageType: TournamentStageType | "GROUP_STAGE" | "KNOCKOUT_STAGE" | null;
  groupId: string | null;
  roundLabel: string | null;
  status: MatchStatus | "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED";
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeParticipantSourceType?: MatchParticipantSourceType | null;
  awayParticipantSourceType?: MatchParticipantSourceType | null;
  homeSourceGroupId?: string | null;
  awaySourceGroupId?: string | null;
  homeSourceGroupPosition?: number | null;
  awaySourceGroupPosition?: number | null;
};

type PreliminaryStandingsSnapshot = {
  mode: PreliminaryStandingsMode;
  stageId: string | null;
  stageName: string | null;
  standings: StandingRow[];
  groupStandings: GroupStandingSummary[];
};

export function parseGroupStageConfiguration(configuration: unknown) {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    return {};
  }

  return configuration as Record<string, unknown>;
}

export function readConfiguredStandingsMode(
  stage: Pick<PreliminaryStageDefinition, "configuration">,
): PreliminaryStandingsMode | null {
  const configuration = parseGroupStageConfiguration(stage.configuration);
  const standingsScope = configuration.standingsScope;

  if (standingsScope === "GROUPS") {
    return "GROUPS";
  }

  if (standingsScope === "GLOBAL" || standingsScope === "GLOBAL_TABLE") {
    return "GLOBAL";
  }

  return null;
}

export function inferQualificationStandingsMode(
  matches: Array<
    Pick<
      PreliminaryMatchDefinition,
      | "stageType"
      | "homeParticipantSourceType"
      | "awayParticipantSourceType"
      | "homeSourceGroupId"
      | "awaySourceGroupId"
      | "homeSourceGroupPosition"
      | "awaySourceGroupPosition"
    >
  >,
): PreliminaryStandingsMode | null {
  const qualificationSlots = matches.flatMap((match) => {
    if (match.stageType !== TournamentStageType.KNOCKOUT_STAGE) {
      return [];
    }

    return [
      {
        sourceType: match.homeParticipantSourceType ?? null,
        sourceGroupId: match.homeSourceGroupId ?? null,
        sourceGroupPosition: match.homeSourceGroupPosition ?? null,
      },
      {
        sourceType: match.awayParticipantSourceType ?? null,
        sourceGroupId: match.awaySourceGroupId ?? null,
        sourceGroupPosition: match.awaySourceGroupPosition ?? null,
      },
    ].filter((slot) => slot.sourceType === MatchParticipantSourceType.GROUP_POSITION);
  });

  if (qualificationSlots.length === 0) {
    return null;
  }

  const globalSlots = qualificationSlots.filter(
    (slot) => slot.sourceGroupId === null && Number.isInteger(slot.sourceGroupPosition),
  );

  if (globalSlots.length > 0) {
    return "GLOBAL";
  }

  const groupedSlots = qualificationSlots.filter(
    (slot) => slot.sourceGroupId !== null && Number.isInteger(slot.sourceGroupPosition),
  );

  if (groupedSlots.length === qualificationSlots.length) {
    return "GROUPS";
  }

  return null;
}

export function buildConfiguredStandingsScopeUpdate(args: {
  stage: Pick<PreliminaryStageDefinition, "configuration">;
  mode: PreliminaryStandingsMode;
}) {
  return {
    ...parseGroupStageConfiguration(args.stage.configuration),
    standingsScope: args.mode,
  };
}

function isFinishedPreliminaryMatch(
  match: Pick<
    PreliminaryMatchDefinition,
    "status" | "homeTeamId" | "awayTeamId" | "stageId" | "stageType"
  >,
  stageId: string | null,
) {
  return (
    stageId !== null &&
    match.stageId === stageId &&
    match.stageType === TournamentStageType.GROUP_STAGE &&
    match.status === MatchStatus.FINISHED &&
    match.homeTeamId !== null &&
    match.awayTeamId !== null
  );
}

export function inferPreliminaryStandingsMode(args: {
  stage: PreliminaryStageDefinition | null;
  groups: PreliminaryGroupDefinition[];
  teams: PreliminaryTeamDefinition[];
  matches: PreliminaryMatchDefinition[];
}): PreliminaryStandingsMode {
  if (!args.stage) {
    return "GLOBAL";
  }

  const configuredMode = readConfiguredStandingsMode(args.stage);

  if (configuredMode) {
    return configuredMode;
  }

  const qualificationMode = inferQualificationStandingsMode(args.matches);

  if (qualificationMode) {
    return qualificationMode;
  }

  if ((args.stage.groupCount ?? 0) <= 1) {
    return "GLOBAL";
  }

  const stageGroupIds = new Set(
    args.groups.filter((group) => group.stageId === args.stage?.id).map((group) => group.id),
  );
  const assignedGroupByTeamId = new Map(
    args.teams
      .filter((team) => team.groupId !== null && stageGroupIds.has(team.groupId))
      .map((team) => [team.id, team.groupId] as const),
  );

  if (assignedGroupByTeamId.size === 0) {
    return "GLOBAL";
  }

  const seenGroupIdsByTeamId = new Map<string, Set<string>>();

  for (const match of args.matches) {
    if (match.stageId !== args.stage.id || match.stageType !== TournamentStageType.GROUP_STAGE) {
      continue;
    }

    if (!match.groupId || !stageGroupIds.has(match.groupId)) {
      return "GLOBAL";
    }

    for (const teamId of [match.homeTeamId, match.awayTeamId]) {
      if (!teamId) {
        continue;
      }

      const assignedGroupId = assignedGroupByTeamId.get(teamId);

      if (!assignedGroupId || assignedGroupId !== match.groupId) {
        return "GLOBAL";
      }

      const seenGroupIds = seenGroupIdsByTeamId.get(teamId) ?? new Set<string>();
      seenGroupIds.add(match.groupId);
      seenGroupIdsByTeamId.set(teamId, seenGroupIds);

      if (seenGroupIds.size > 1) {
        return "GLOBAL";
      }
    }
  }

  return "GROUPS";
}

export function buildPreliminaryStandingsSnapshot(args: {
  stages: PreliminaryStageDefinition[];
  groups: PreliminaryGroupDefinition[];
  teams: PreliminaryTeamDefinition[];
  matches: PreliminaryMatchDefinition[];
}): PreliminaryStandingsSnapshot {
  const preliminaryStage =
    args.stages.find((stage) => stage.type === TournamentStageType.GROUP_STAGE) ?? null;
  const mode = inferPreliminaryStandingsMode({
    stage: preliminaryStage,
    groups: args.groups,
    teams: args.teams,
    matches: args.matches,
  });

  if (!preliminaryStage) {
    return {
      mode,
      stageId: null,
      stageName: null,
      standings: assembleStandingsTable([], args.teams),
      groupStandings: [],
    };
  }

  const finishedMatches = args.matches.flatMap((match) => {
    if (!isFinishedPreliminaryMatch(match, preliminaryStage.id)) {
      return [];
    }

    return [
      {
        homeTeamId: match.homeTeamId as string,
        awayTeamId: match.awayTeamId as string,
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
    ];
  });

  const standings = assembleStandingsTable(calculateStandings(finishedMatches), args.teams);

  if (mode === "GLOBAL") {
    return {
      mode,
      stageId: preliminaryStage.id,
      stageName: preliminaryStage.name,
      standings,
      groupStandings: [],
    };
  }

  const teamsByGroupId = new Map<string, PreliminaryTeamDefinition[]>();

  for (const team of args.teams) {
    if (!team.groupId) {
      continue;
    }

    const groupedTeams = teamsByGroupId.get(team.groupId) ?? [];
    groupedTeams.push(team);
    teamsByGroupId.set(team.groupId, groupedTeams);
  }

  const groupStandings = args.groups
    .filter((group) => group.stageId === preliminaryStage.id)
    .map((group) => {
      const groupTeams = teamsByGroupId.get(group.id) ?? [];
      const groupFinishedMatches = args.matches.flatMap((match) => {
        if (!isFinishedPreliminaryMatch(match, preliminaryStage.id) || match.groupId !== group.id) {
          return [];
        }

        return [
          {
            homeTeamId: match.homeTeamId as string,
            awayTeamId: match.awayTeamId as string,
            homeTeamName: match.homeTeamName,
            awayTeamName: match.awayTeamName,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          },
        ];
      });

      return {
        groupId: group.id,
        groupName: group.name,
        sequence: group.sequence,
        teamCount: groupTeams.length,
        playedMatchCount: groupFinishedMatches.length,
        rows: assembleStandingsTable(calculateStandings(groupFinishedMatches), groupTeams),
      };
    });

  return {
    mode,
    stageId: preliminaryStage.id,
    stageName: preliminaryStage.name,
    standings,
    groupStandings,
  };
}

export function getDisplayRoundLabel(args: {
  roundLabel: string | null;
  groupName: string | null;
  standingsMode: PreliminaryStandingsMode;
  stageType: TournamentStageType | "GROUP_STAGE" | "KNOCKOUT_STAGE" | null;
}) {
  if (
    args.standingsMode !== "GLOBAL" ||
    args.stageType !== TournamentStageType.GROUP_STAGE ||
    !args.roundLabel
  ) {
    return args.roundLabel;
  }

  if (!args.groupName) {
    return args.roundLabel;
  }

  const normalizedPrefix = `${args.groupName} · `;

  if (args.roundLabel.startsWith(normalizedPrefix)) {
    return args.roundLabel.slice(normalizedPrefix.length).trim();
  }

  return args.roundLabel;
}
