import { MatchStatus } from "@prisma/client";

import { assembleStandingsTable } from "@/features/standings/server/assemble-standings-table";
import { calculateStandings } from "@/features/standings/server/calculate-standings";
import type { GroupStandingSummary, StandingRow } from "@/features/standings/types/standings.types";
import type { PersistedTournamentFormatValue } from "@/features/tournaments/types/tournament-format.types";
import { isGroupedTournamentFormat } from "@/features/tournaments/utils/tournament-format";

export const PRELIMINARY_STANDINGS_SCOPES = ["GLOBAL", "GROUPS"] as const;
export type PreliminaryStandingsScope = (typeof PRELIMINARY_STANDINGS_SCOPES)[number];

export const GLOBAL_PRELIMINARY_STANDINGS_GROUP_ID = "__global__";

type PreliminaryStageConfiguration = Record<string, unknown>;

type PreliminaryStandingTeam = {
  id: string;
  name: string;
};

type PreliminaryStandingGroup = {
  id: string;
  stageId: string | null;
  name: string;
  sequence: number;
  teams: PreliminaryStandingTeam[];
};

type PreliminaryStandingMatch = {
  stageId: string | null;
  groupId: string | null;
  status: MatchStatus | "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED";
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
};

function parsePreliminaryStageConfiguration(configuration: unknown): PreliminaryStageConfiguration {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    return {};
  }

  return configuration as PreliminaryStageConfiguration;
}

function toFinishedStandingMatch(match: PreliminaryStandingMatch) {
  if (
    match.status !== MatchStatus.FINISHED ||
    match.homeScore === null ||
    match.awayScore === null ||
    !match.homeTeamId ||
    !match.awayTeamId ||
    !match.homeTeamName ||
    !match.awayTeamName
  ) {
    return null;
  }

  return {
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  };
}

export function getConfiguredPreliminaryStandingsScope(
  configuration: unknown,
): PreliminaryStandingsScope | null {
  const scope = parsePreliminaryStageConfiguration(configuration).standingsScope;

  if (scope === "GLOBAL" || scope === "GROUPS") {
    return scope;
  }

  return null;
}

export function resolvePreliminaryStandingsScope(args: {
  tournamentFormat: PersistedTournamentFormatValue;
  configuration: unknown;
}): PreliminaryStandingsScope {
  const explicitScope = getConfiguredPreliminaryStandingsScope(args.configuration);

  if (explicitScope) {
    return explicitScope;
  }

  return isGroupedTournamentFormat(args.tournamentFormat) ? "GROUPS" : "GLOBAL";
}

export function getPreliminaryStandingsLabel(scope: PreliminaryStandingsScope) {
  return scope === "GLOBAL" ? "Classifica generale" : "Fase a gironi";
}

export function countFinishedPreliminaryMatches(
  matches: PreliminaryStandingMatch[],
  preliminaryStageId: string | null,
) {
  return matches.filter(
    (match) => match.stageId === preliminaryStageId && toFinishedStandingMatch(match) !== null,
  ).length;
}

export function buildPreliminaryStandings(args: {
  scope: PreliminaryStandingsScope;
  preliminaryStageId: string | null;
  teams: PreliminaryStandingTeam[];
  groups: PreliminaryStandingGroup[];
  matches: PreliminaryStandingMatch[];
}): {
  standings: StandingRow[];
  groupStandings: GroupStandingSummary[];
} {
  if (!args.preliminaryStageId) {
    return {
      standings: assembleStandingsTable([], args.teams),
      groupStandings: [],
    };
  }

  const preliminaryGroups = args.groups
    .filter((group) => group.stageId === args.preliminaryStageId)
    .sort((left, right) => left.sequence - right.sequence);
  const preliminaryMatches = args.matches.filter((match) => match.stageId === args.preliminaryStageId);
  const finishedPreliminaryMatches = preliminaryMatches
    .map(toFinishedStandingMatch)
    .filter(
      (
        match,
      ): match is {
        homeTeamId: string;
        awayTeamId: string;
        homeTeamName: string;
        awayTeamName: string;
        homeScore: number;
        awayScore: number;
      } => match !== null,
    );

  const standings =
    args.scope === "GLOBAL" || args.scope === "GROUPS"
      ? assembleStandingsTable(calculateStandings(finishedPreliminaryMatches), args.teams)
      : assembleStandingsTable([], args.teams);

  const groupStandings = preliminaryGroups.map((group) => {
    const groupFinishedMatches = preliminaryMatches
      .filter((match) => match.groupId === group.id)
      .map(toFinishedStandingMatch)
      .filter(
        (
          match,
        ): match is {
          homeTeamId: string;
          awayTeamId: string;
          homeTeamName: string;
          awayTeamName: string;
          homeScore: number;
          awayScore: number;
        } => match !== null,
      );

    return {
      groupId: group.id,
      groupName: group.name,
      sequence: group.sequence,
      teamCount: group.teams.length,
      playedMatchCount: groupFinishedMatches.length,
      rows: assembleStandingsTable(calculateStandings(groupFinishedMatches), group.teams),
    };
  });

  return {
    standings,
    groupStandings,
  };
}
