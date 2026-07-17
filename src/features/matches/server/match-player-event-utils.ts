import type {
  MatchGoalSummaryItem,
  MatchLatestEventSummary,
  MatchPlayerEventTypeValue,
  MatchScoreReconciliation,
  TournamentScorerStandingRow,
} from "@/features/matches/types/match-player-events.types";

type EventSummaryInput = {
  id: string;
  type: MatchPlayerEventTypeValue;
  teamId: string;
  awardedTeamId: string | null;
  playerId: string | null;
  playerDisplayNameSnapshot: string | null;
  playerJerseyNumberSnapshot: string | null;
  teamNameSnapshot: string;
  matchMinute: number | null;
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
  voidedAt: Date | null;
};

type MatchSummaryContext = {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
};

function formatPlayerDisplayName(
  playerDisplayNameSnapshot: string | null,
  playerJerseyNumberSnapshot: string | null,
) {
  const displayName = playerDisplayNameSnapshot?.trim() ?? "";
  const jerseyNumber = playerJerseyNumberSnapshot?.trim() ?? "";

  if (displayName.length === 0 && jerseyNumber.length === 0) {
    return "Marcatore da assegnare";
  }

  if (displayName.length === 0) {
    return `#${jerseyNumber}`;
  }

  return displayName;
}

export function getMatchPlayerEventLabel(event: {
  type: MatchPlayerEventTypeValue;
  playerDisplayNameSnapshot: string | null;
  playerJerseyNumberSnapshot: string | null;
}) {
  const playerLabel = formatPlayerDisplayName(
    event.playerDisplayNameSnapshot,
    event.playerJerseyNumberSnapshot,
  );

  switch (event.type) {
    case "GOAL":
      return playerLabel;
    case "OWN_GOAL":
      return `Autogol · ${playerLabel}`;
    case "YELLOW_CARD":
      return `Ammonizione · ${playerLabel}`;
    case "RED_CARD":
      return `Espulsione · ${playerLabel}`;
  }
}

export function buildMatchGoalSummary(
  events: EventSummaryInput[],
  match: Pick<
    MatchSummaryContext,
    "homeTeamId" | "awayTeamId" | "homeTeamName" | "awayTeamName"
  >,
): MatchGoalSummaryItem[] {
  const activeGoalEvents = events.filter(
    (event) =>
      event.voidedAt === null &&
      (event.type === "GOAL" || event.type === "OWN_GOAL") &&
      event.awardedTeamId !== null,
  );
  const summaryByKey = new Map<string, MatchGoalSummaryItem>();

  for (const event of activeGoalEvents) {
    const teamName =
      event.awardedTeamId === match.homeTeamId
        ? match.homeTeamName
        : event.awardedTeamId === match.awayTeamId
          ? match.awayTeamName
          : event.teamNameSnapshot;
    const label =
      event.type === "OWN_GOAL"
        ? `Autogol · ${formatPlayerDisplayName(
            event.playerDisplayNameSnapshot,
            event.playerJerseyNumberSnapshot,
          )}`
        : formatPlayerDisplayName(
            event.playerDisplayNameSnapshot,
            event.playerJerseyNumberSnapshot,
          );
    const key = [
      event.type,
      event.awardedTeamId,
      event.playerId ?? "unassigned",
      label,
    ].join(":");
    const existing = summaryByKey.get(key);

    if (existing) {
      existing.goalCount += 1;
      continue;
    }

    summaryByKey.set(key, {
      teamId: event.awardedTeamId,
      teamName,
      type: event.type === "OWN_GOAL" ? "OWN_GOAL" : "GOAL",
      label,
      goalCount: 1,
      playerId: event.playerId,
    });
  }

  return Array.from(summaryByKey.values()).sort((left, right) => {
    if (left.teamId === match.homeTeamId && right.teamId !== match.homeTeamId) {
      return -1;
    }

    if (right.teamId === match.homeTeamId && left.teamId !== match.homeTeamId) {
      return 1;
    }

    return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
  });
}

export function buildLatestEventSummary(events: EventSummaryInput[]): MatchLatestEventSummary | null {
  const latestEvent = events
    .filter((event) => event.voidedAt === null)
    .sort((left, right) => right.sequence - left.sequence || right.createdAt.getTime() - left.createdAt.getTime())[0];

  if (!latestEvent) {
    return null;
  }

  return {
    eventId: latestEvent.id,
    type: latestEvent.type,
    label: getMatchPlayerEventLabel(latestEvent),
    teamName: latestEvent.teamNameSnapshot,
    matchMinute: latestEvent.matchMinute,
  };
}

export function buildMatchScoreReconciliation(
  events: EventSummaryInput[],
  match: Pick<MatchSummaryContext, "homeTeamId" | "awayTeamId" | "homeScore" | "awayScore">,
): MatchScoreReconciliation | null {
  if (!match.homeTeamId || !match.awayTeamId) {
    return null;
  }

  const activeGoalEvents = events.filter(
    (event) =>
      event.voidedAt === null &&
      (event.type === "GOAL" || event.type === "OWN_GOAL") &&
      event.awardedTeamId !== null,
  );
  const homeRecordedGoals = activeGoalEvents.filter((event) => event.awardedTeamId === match.homeTeamId).length;
  const awayRecordedGoals = activeGoalEvents.filter((event) => event.awardedTeamId === match.awayTeamId).length;
  const homeUnassignedGoals = activeGoalEvents.filter(
    (event) => event.awardedTeamId === match.homeTeamId && event.playerId === null && event.type === "GOAL",
  ).length;
  const awayUnassignedGoals = activeGoalEvents.filter(
    (event) => event.awardedTeamId === match.awayTeamId && event.playerId === null && event.type === "GOAL",
  ).length;

  return {
    homeRecordedGoals,
    awayRecordedGoals,
    homeUnassignedGoals,
    awayUnassignedGoals,
    homeGoalDelta: match.homeScore - homeRecordedGoals,
    awayGoalDelta: match.awayScore - awayRecordedGoals,
  };
}

type ScorerAggregationInput = {
  playerId: string;
  playerName: string;
  teamId: string | null;
  teamName: string;
  goals: number;
  yellowCards: number;
  redCards: number;
};

export function sortTournamentScorerRows(
  left: ScorerAggregationInput,
  right: ScorerAggregationInput,
) {
  return (
    right.goals - left.goals ||
    left.playerName.localeCompare(right.playerName, undefined, { sensitivity: "base" }) ||
    left.playerId.localeCompare(right.playerId)
  );
}

export function buildTournamentScorerStandings(
  rows: ScorerAggregationInput[],
): TournamentScorerStandingRow[] {
  return rows
    .slice()
    .sort(sortTournamentScorerRows)
    .map((row, index) => ({
      position: index + 1,
      playerId: row.playerId,
      playerName: row.playerName,
      teamId: row.teamId,
      teamName: row.teamName,
      goals: row.goals,
      yellowCards: row.yellowCards,
      redCards: row.redCards,
    }));
}
