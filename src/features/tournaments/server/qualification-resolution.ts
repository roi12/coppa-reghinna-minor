import { MatchParticipantSourceType, MatchStatus } from "@prisma/client";

import { calculateStandings } from "@/features/standings/server/calculate-standings";
import {
  GLOBAL_PRELIMINARY_STANDINGS_GROUP_ID,
  type PreliminaryStandingsScope,
} from "@/features/standings/server/preliminary-standings";

type QualificationGroupMatch = {
  status: MatchStatus;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: {
    name: string;
  } | null;
  awayTeam: {
    name: string;
  } | null;
};

type QualificationGroupInput = {
  id: string;
  name: string;
  sequence: number;
  matches: QualificationGroupMatch[];
};

type QualificationKnockoutMatch = {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeParticipantLocked: boolean;
  awayParticipantLocked: boolean;
  homeParticipantSourceType: MatchParticipantSourceType | null;
  awayParticipantSourceType: MatchParticipantSourceType | null;
  homeSourceGroupId: string | null;
  awaySourceGroupId: string | null;
  homeSourceGroupPosition: number | null;
  awaySourceGroupPosition: number | null;
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
  roundLabel: string | null;
};

export type QualificationResolutionCandidate = {
  teamId: string;
  teamName: string;
};

export type QualificationResolutionSlot = {
  groupId: string;
  groupName: string;
  groupSequence: number;
  position: number;
  matchId: string;
  matchLabel: string;
  side: "home" | "away";
  locked: boolean;
  currentTeamId: string | null;
  currentTeamName: string | null;
  candidateTeams: QualificationResolutionCandidate[];
};

export type QualificationResolutionSnapshot = {
  unresolvedSlots: QualificationResolutionSlot[];
  warningMessage?: string | null;
};

export type ManualQualificationAssignment = {
  matchId: string;
  side: "home" | "away";
  teamId: string;
};

export type ManualQualificationResolutionPlan = Array<{
  matchId: string;
  side: "home" | "away";
  teamId: string;
}>;

function hasCompletedGroupMatch(match: QualificationGroupMatch) {
  return (
    match.status === MatchStatus.FINISHED &&
    match.homeScore !== null &&
    match.awayScore !== null &&
    match.homeTeamId !== null &&
    match.awayTeamId !== null &&
    match.homeTeam !== null &&
    match.awayTeam !== null
  );
}

function getGroupStandings(group: QualificationGroupInput) {
  const completedMatches = group.matches.filter(hasCompletedGroupMatch);

  if (completedMatches.length !== group.matches.length) {
    return null;
  }

  return calculateStandings(
    completedMatches.map((match) => ({
      homeTeamId: match.homeTeamId as string,
      awayTeamId: match.awayTeamId as string,
      homeTeamName: match.homeTeam?.name ?? "Squadra",
      awayTeamName: match.awayTeam?.name ?? "Squadra",
      homeScore: match.homeScore as number,
      awayScore: match.awayScore as number,
    })),
  );
}

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

function buildCandidateTeams(
  rows: Array<{
    teamId: string;
    teamName: string;
    points: number;
    goalDifference: number;
    goalsFor: number;
    wins: number;
  }>,
  position: number,
) {
  const row = rows[position - 1];

  if (!row) {
    return [];
  }

  return rows
    .filter(
      (candidate) =>
        candidate.points === row.points &&
        candidate.goalDifference === row.goalDifference &&
        candidate.goalsFor === row.goalsFor &&
        candidate.wins === row.wins,
    )
    .map((candidate) => ({
      teamId: candidate.teamId,
      teamName: candidate.teamName,
    }));
}

function buildSlotKey(matchId: string, side: "home" | "away") {
  return `${matchId}:${side}`;
}

function buildCompletedRows(matches: QualificationGroupMatch[]) {
  const completedMatches = matches.filter(hasCompletedGroupMatch);

  if (completedMatches.length !== matches.length) {
    return null;
  }

  return calculateStandings(
    completedMatches.map((match) => ({
      homeTeamId: match.homeTeamId as string,
      awayTeamId: match.awayTeamId as string,
      homeTeamName: match.homeTeam?.name ?? "Squadra",
      awayTeamName: match.awayTeam?.name ?? "Squadra",
      homeScore: match.homeScore as number,
      awayScore: match.awayScore as number,
    })),
  );
}

function getGlobalQualificationPositions(knockoutMatches: QualificationKnockoutMatch[]) {
  const positions = new Set<number>();
  let hasGroupedSources = false;

  for (const match of knockoutMatches) {
    const slotSources = [
      {
        sourceType: match.homeParticipantSourceType,
        sourceGroupId: match.homeSourceGroupId,
        sourceGroupPosition: match.homeSourceGroupPosition,
      },
      {
        sourceType: match.awayParticipantSourceType,
        sourceGroupId: match.awaySourceGroupId,
        sourceGroupPosition: match.awaySourceGroupPosition,
      },
    ];

    for (const source of slotSources) {
      if (source.sourceType !== MatchParticipantSourceType.GROUP_POSITION) {
        continue;
      }

      if (source.sourceGroupId !== null) {
        hasGroupedSources = true;
        continue;
      }

      if (source.sourceGroupPosition) {
        positions.add(source.sourceGroupPosition);
      }
    }
  }

  return {
    hasGroupedSources,
    positions: Array.from(positions.values()).sort((left, right) => left - right),
  };
}

export function buildQualificationResolutionSnapshot(args: {
  scope: PreliminaryStandingsScope;
  groups: QualificationGroupInput[];
  knockoutMatches: QualificationKnockoutMatch[];
  qualifiersPerGroup: number;
}): QualificationResolutionSnapshot {
  if (args.scope === "GLOBAL") {
    const { hasGroupedSources, positions } = getGlobalQualificationPositions(args.knockoutMatches);

    if (hasGroupedSources) {
      return {
        unresolvedSlots: [],
        warningMessage:
          "La fase finale usa ancora posizioni di girone già generate. Per questo torneo la qualificazione globale non può essere reinterpretata automaticamente senza cambiare le sorgenti delle partite.",
      };
    }

    const rows = buildCompletedRows(args.groups.flatMap((group) => group.matches));

    if (!rows) {
      return {
        unresolvedSlots: [],
        warningMessage: null,
      };
    }

    const unresolvedSlots: QualificationResolutionSlot[] = [];

    for (const position of positions) {
      if (!hasAmbiguousRankingAtPosition(rows, position)) {
        continue;
      }

      const candidates = buildCandidateTeams(rows, position);

      for (const match of args.knockoutMatches) {
        const sideSources = [
          {
            side: "home" as const,
            sourceType: match.homeParticipantSourceType,
            sourceGroupId: match.homeSourceGroupId,
            sourceGroupPosition: match.homeSourceGroupPosition,
            currentTeamId: match.homeTeamId,
            currentTeamName: match.homeTeam?.name ?? null,
            locked: match.homeParticipantLocked,
          },
          {
            side: "away" as const,
            sourceType: match.awayParticipantSourceType,
            sourceGroupId: match.awaySourceGroupId,
            sourceGroupPosition: match.awaySourceGroupPosition,
            currentTeamId: match.awayTeamId,
            currentTeamName: match.awayTeam?.name ?? null,
            locked: match.awayParticipantLocked,
          },
        ];

        for (const source of sideSources) {
          if (
            source.sourceType !== MatchParticipantSourceType.GROUP_POSITION ||
            source.sourceGroupId !== null ||
            source.sourceGroupPosition !== position
          ) {
            continue;
          }

          unresolvedSlots.push({
            groupId: GLOBAL_PRELIMINARY_STANDINGS_GROUP_ID,
            groupName: "Classifica generale",
            groupSequence: 1,
            position,
            matchId: match.id,
            matchLabel: match.roundLabel ?? "Partita",
            side: source.side,
            locked: source.locked,
            currentTeamId: source.currentTeamId,
            currentTeamName: source.currentTeamName,
            candidateTeams: candidates,
          });
        }
      }
    }

    return {
      unresolvedSlots,
      warningMessage: null,
    };
  }

  const unresolvedSlots: QualificationResolutionSlot[] = [];

  for (const group of args.groups) {
    const rows = getGroupStandings(group);

    if (!rows) {
      continue;
    }

    for (let position = 1; position <= args.qualifiersPerGroup; position += 1) {
      if (!hasAmbiguousRankingAtPosition(rows, position)) {
        continue;
      }

      const candidates = buildCandidateTeams(rows, position);

      for (const match of args.knockoutMatches) {
        const sideSources = [
          {
            side: "home" as const,
            sourceType: match.homeParticipantSourceType,
            sourceGroupId: match.homeSourceGroupId,
            sourceGroupPosition: match.homeSourceGroupPosition,
            currentTeamId: match.homeTeamId,
            currentTeamName: match.homeTeam?.name ?? null,
            locked: match.homeParticipantLocked,
          },
          {
            side: "away" as const,
            sourceType: match.awayParticipantSourceType,
            sourceGroupId: match.awaySourceGroupId,
            sourceGroupPosition: match.awaySourceGroupPosition,
            currentTeamId: match.awayTeamId,
            currentTeamName: match.awayTeam?.name ?? null,
            locked: match.awayParticipantLocked,
          },
        ];

        for (const source of sideSources) {
          if (
            source.sourceType !== MatchParticipantSourceType.GROUP_POSITION ||
            source.sourceGroupId !== group.id ||
            source.sourceGroupPosition !== position
          ) {
            continue;
          }

          unresolvedSlots.push({
            groupId: group.id,
            groupName: group.name,
            groupSequence: group.sequence,
            position,
            matchId: match.id,
            matchLabel: match.roundLabel ?? "Partita",
            side: source.side,
            locked: source.locked,
            currentTeamId: source.currentTeamId,
            currentTeamName: source.currentTeamName,
            candidateTeams: candidates,
          });
        }
      }
    }
  }

  return {
    unresolvedSlots,
    warningMessage: null,
  };
}

export function buildManualQualificationResolutionPlan(
  snapshot: QualificationResolutionSnapshot,
  assignments: ManualQualificationAssignment[],
) {
  const slotMap = new Map(snapshot.unresolvedSlots.map((slot) => [buildSlotKey(slot.matchId, slot.side), slot]));
  const seenTeams = new Set<string>();
  const seenSlots = new Set<string>();

  const plan = assignments.map((assignment) => {
    const slotKey = buildSlotKey(assignment.matchId, assignment.side);
    const slot = slotMap.get(slotKey);

    if (!slot) {
      throw new Error("La posizione selezionata non è più disponibile per la risoluzione manuale.");
    }

    if (seenSlots.has(slotKey)) {
      throw new Error("La stessa posizione qualificante non può essere assegnata più di una volta.");
    }

    const candidate = slot.candidateTeams.find((team) => team.teamId === assignment.teamId);

    if (!candidate) {
      throw new Error("La squadra selezionata non appartiene al pareggio da risolvere.");
    }

    if (seenTeams.has(assignment.teamId)) {
      throw new Error("La stessa squadra non può essere assegnata a più posizioni qualificanti.");
    }

    if (slot.currentTeamId && slot.currentTeamId !== assignment.teamId) {
      throw new Error("Una posizione già assegnata non può essere modificata senza prima sbloccarla.");
    }

    if (slot.locked && slot.currentTeamId !== assignment.teamId) {
      throw new Error("Una posizione già confermata non può essere sovrascritta.");
    }

    seenTeams.add(assignment.teamId);
    seenSlots.add(slotKey);

    return {
      matchId: assignment.matchId,
      side: assignment.side,
      teamId: candidate.teamId,
    };
  });

  return plan;
}
