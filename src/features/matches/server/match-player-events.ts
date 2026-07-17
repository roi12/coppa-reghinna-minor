import {
  MatchPlayerEventType,
  MatchScoreEventActionType,
  MatchStatus,
  Prisma,
  TournamentStatus,
} from "@prisma/client";

import {
  buildLatestEventSummary,
  buildMatchGoalSummary,
  buildMatchScoreReconciliation,
  buildTournamentScorerStandings,
  getMatchPlayerEventLabel,
} from "@/features/matches/server/match-player-event-utils";
import { publishTournamentMatchUpdate } from "@/features/matches/server/match-live-updates";
import type {
  MatchGoalSummaryItem,
  MatchLatestEventSummary,
  MatchPlayerEventTimelineItem,
  MatchPlayerEventTypeValue,
  MatchScoreReconciliation,
  TournamentScorerStandingRow,
} from "@/features/matches/types/match-player-events.types";
import { listTeamPlayers } from "@/features/players/server/list-team-players";
import type { PlayerSummary } from "@/features/players/types/player.types";
import { revalidateTournamentPaths } from "@/features/tournaments/server/revalidate-tournament-paths";
import { prisma } from "@/lib/prisma";

export class MatchPlayerEventError extends Error {
  constructor(
    message: string,
    readonly code:
      | "MATCH_NOT_FOUND"
      | "EVENT_NOT_FOUND"
      | "INVALID_MATCH_STATE"
      | "INVALID_TEAM"
      | "INVALID_PLAYER"
      | "CONFLICT"
      | "INVALID_EVENT"
      | "INVALID_RECONCILIATION",
  ) {
    super(message);
  }
}

export type MatchPlayerEventMutationResult = {
  matchId: string;
  tournamentId: string;
  tournamentSlug: string;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  scoreVersion: number;
  lastScoreUpdatedAt: Date | null;
  eventId?: string | null;
};

export type DashboardMatchEventContext = {
  match: MatchPlayerEventMutationResult & {
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeTeamName: string;
    awayTeamName: string;
  };
  homePlayers: PlayerSummary[];
  awayPlayers: PlayerSummary[];
  goalSummary: MatchGoalSummaryItem[];
  latestEventSummary: MatchLatestEventSummary | null;
  scoreReconciliation: MatchScoreReconciliation | null;
  events: MatchPlayerEventTimelineItem[];
};

type CreateMatchPlayerEventInput = {
  matchId: string;
  type: MatchPlayerEventTypeValue;
  teamId: string;
  awardedTeamId?: string | null;
  playerId?: string | null;
  expectedScoreVersion?: number;
  matchMinute?: number | null;
  userId?: string | null;
};

type ReconcileMissingGoalsInput = {
  matchId: string;
  teamId: string;
  userId?: string | null;
};

type UpdateMatchPlayerEventInput = {
  matchId: string;
  eventId: string;
  playerId?: string | null;
  type?: MatchPlayerEventTypeValue;
  matchMinute?: number | null;
  userId?: string | null;
};

type VoidMatchPlayerEventInput = {
  matchId: string;
  eventId: string;
  expectedScoreVersion?: number;
  userId?: string | null;
};

const eventSelect = {
  id: true,
  tournamentId: true,
  matchId: true,
  teamId: true,
  awardedTeamId: true,
  playerId: true,
  type: true,
  sequence: true,
  matchMinute: true,
  playerDisplayNameSnapshot: true,
  playerJerseyNumberSnapshot: true,
  teamNameSnapshot: true,
  createdAt: true,
  updatedAt: true,
  voidedAt: true,
} satisfies Prisma.MatchPlayerEventSelect;

type RawEvent = Prisma.MatchPlayerEventGetPayload<{ select: typeof eventSelect }>;

type MatchForEventMutation = {
  id: string;
  tournamentId: string;
  status: MatchStatus;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number;
  awayScore: number;
  scoreVersion: number;
  lastScoreUpdatedAt: Date | null;
  tournament: {
    slug: string;
    status: TournamentStatus;
  };
  homeTeam: {
    id: string;
    name: string;
  } | null;
  awayTeam: {
    id: string;
    name: string;
  } | null;
  stage: {
    isPublic: boolean;
  } | null;
};

function normalizeMatchEventTimelineItem(event: RawEvent): MatchPlayerEventTimelineItem {
  return {
    id: event.id,
    matchId: event.matchId,
    tournamentId: event.tournamentId,
    teamId: event.teamId,
    awardedTeamId: event.awardedTeamId,
    playerId: event.playerId,
    type: event.type,
    sequence: event.sequence,
    matchMinute: event.matchMinute,
    playerDisplayName: event.playerDisplayNameSnapshot,
    playerJerseyNumber: event.playerJerseyNumberSnapshot,
    teamName: event.teamNameSnapshot,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    voidedAt: event.voidedAt,
    label: getMatchPlayerEventLabel(event),
  };
}

const MATCH_PLAYER_EVENT_SEQUENCE_RETRY_LIMIT = 2;

function getActionTypeForGoalDelta(args: {
  match: Pick<MatchForEventMutation, "homeTeamId" | "awayTeamId">;
  awardedTeamId: string;
  delta: 1 | -1;
}) {
  if (args.awardedTeamId === args.match.homeTeamId) {
    return args.delta === 1
      ? MatchScoreEventActionType.INCREMENT_HOME_SCORE
      : MatchScoreEventActionType.DECREMENT_HOME_SCORE;
  }

  if (args.awardedTeamId === args.match.awayTeamId) {
    return args.delta === 1
      ? MatchScoreEventActionType.INCREMENT_AWAY_SCORE
      : MatchScoreEventActionType.DECREMENT_AWAY_SCORE;
  }

  throw new MatchPlayerEventError("La squadra selezionata non appartiene alla partita.", "INVALID_TEAM");
}

function assertLiveMatch(match: MatchForEventMutation) {
  if (match.status !== MatchStatus.LIVE) {
    throw new MatchPlayerEventError(
      "Gli eventi giocatore possono essere registrati solo mentre la partita è live.",
      "INVALID_MATCH_STATE",
    );
  }
}

function assertParticipatingTeam(match: MatchForEventMutation, teamId: string) {
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    throw new MatchPlayerEventError("La squadra selezionata non appartiene alla partita.", "INVALID_TEAM");
  }
}

function getTeamNameForMatch(match: MatchForEventMutation, teamId: string) {
  if (teamId === match.homeTeamId) {
    return match.homeTeam?.name ?? "Squadra";
  }

  if (teamId === match.awayTeamId) {
    return match.awayTeam?.name ?? "Squadra";
  }

  throw new MatchPlayerEventError("La squadra selezionata non appartiene alla partita.", "INVALID_TEAM");
}

function getOpponentTeamId(match: MatchForEventMutation, teamId: string) {
  assertParticipatingTeam(match, teamId);

  if (teamId === match.homeTeamId) {
    return match.awayTeamId;
  }

  return match.homeTeamId;
}

async function loadMatchForEventMutation(
  transaction: Prisma.TransactionClient,
  matchId: string,
): Promise<MatchForEventMutation> {
  const match = await transaction.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      tournamentId: true,
      status: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      scoreVersion: true,
      lastScoreUpdatedAt: true,
      tournament: {
        select: {
          slug: true,
          status: true,
        },
      },
      homeTeam: {
        select: {
          id: true,
          name: true,
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
        },
      },
      stage: {
        select: {
          isPublic: true,
        },
      },
    },
  });

  if (!match) {
    throw new MatchPlayerEventError("Match not found.", "MATCH_NOT_FOUND");
  }

  return match;
}

async function lockMatchRow(
  transaction: Prisma.TransactionClient,
  matchId: string,
) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Match"
    WHERE "id" = ${matchId}
    FOR UPDATE
  `;

  if (rows.length === 0) {
    throw new MatchPlayerEventError("Match not found.", "MATCH_NOT_FOUND");
  }
}

async function loadPlayerSnapshot(
  transaction: Prisma.TransactionClient,
  playerId: string,
  expectedTeamId: string,
  match: MatchForEventMutation,
) {
  const player = await transaction.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      teamId: true,
      displayName: true,
      firstName: true,
      lastName: true,
      jerseyNumber: true,
    },
  });

  if (!player || !player.teamId) {
    throw new MatchPlayerEventError("Il giocatore selezionato non è disponibile.", "INVALID_PLAYER");
  }

  assertParticipatingTeam(match, player.teamId);

  if (player.teamId !== expectedTeamId) {
    throw new MatchPlayerEventError(
      "Il giocatore selezionato non appartiene alla squadra scelta per questo evento.",
      "INVALID_PLAYER",
    );
  }

  return {
    id: player.id,
    teamId: player.teamId,
    displayName:
      player.displayName?.trim().length
        ? player.displayName.trim()
        : `${player.firstName} ${player.lastName}`.trim(),
    jerseyNumber: player.jerseyNumber ?? null,
  };
}

async function getNextEventSequence(
  transaction: Prisma.TransactionClient,
  matchId: string,
) {
  const latestEvent = await transaction.matchPlayerEvent.findFirst({
    where: { matchId },
    orderBy: [{ sequence: "desc" }, { createdAt: "desc" }],
    select: {
      sequence: true,
    },
  });

  return (latestEvent?.sequence ?? 0) + 1;
}

async function loadActiveEvents(
  transaction: Prisma.TransactionClient,
  matchId: string,
): Promise<RawEvent[]> {
  return transaction.matchPlayerEvent.findMany({
    where: {
      matchId,
      voidedAt: null,
    },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    select: eventSelect,
  });
}

function buildNextScoreForAwardedTeam(args: {
  match: MatchForEventMutation;
  awardedTeamId: string;
  delta: 1 | -1;
}) {
  if (args.awardedTeamId === args.match.homeTeamId) {
    const nextHomeScore = args.match.homeScore + args.delta;

    if (nextHomeScore < 0) {
      throw new MatchPlayerEventError("Il punteggio casa non può diventare negativo.", "INVALID_EVENT");
    }

    return {
      homeScore: nextHomeScore,
      awayScore: args.match.awayScore,
    };
  }

  if (args.awardedTeamId === args.match.awayTeamId) {
    const nextAwayScore = args.match.awayScore + args.delta;

    if (nextAwayScore < 0) {
      throw new MatchPlayerEventError("Il punteggio ospite non può diventare negativo.", "INVALID_EVENT");
    }

    return {
      homeScore: args.match.homeScore,
      awayScore: nextAwayScore,
    };
  }

  throw new MatchPlayerEventError("La squadra selezionata non appartiene alla partita.", "INVALID_TEAM");
}

async function updateMatchScoreVersioned(
  transaction: Prisma.TransactionClient,
  args: {
    match: MatchForEventMutation;
    expectedScoreVersion: number;
    nextHomeScore: number;
    nextAwayScore: number;
    userId?: string | null;
  },
) {
  const updateResult = await transaction.match.updateMany({
    where: {
      id: args.match.id,
      scoreVersion: args.expectedScoreVersion,
    },
    data: {
      homeScore: args.nextHomeScore,
      awayScore: args.nextAwayScore,
      lastScoreUpdatedAt: new Date(),
      lastScoreUpdatedByUserId: args.userId ?? null,
      scoreVersion: {
        increment: 1,
      },
    },
  });

  if (updateResult.count !== 1) {
    throw new MatchPlayerEventError(
      "Questa partita è stata aggiornata da un altro organizzatore. Aggiorna i dati prima di riprovare.",
      "CONFLICT",
    );
  }

  const updatedMatch = await transaction.match.findUnique({
    where: { id: args.match.id },
    select: {
      id: true,
      tournamentId: true,
      status: true,
      homeScore: true,
      awayScore: true,
      scoreVersion: true,
      lastScoreUpdatedAt: true,
    },
  });

  if (!updatedMatch) {
    throw new MatchPlayerEventError("Match not found after update.", "MATCH_NOT_FOUND");
  }

  return updatedMatch;
}

async function publishAndRevalidate(result: MatchPlayerEventMutationResult) {
  try {
    revalidateTournamentPaths(result.tournamentSlug);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("static generation store missing")) {
      throw error;
    }
  }

  publishTournamentMatchUpdate({
    tournamentSlug: result.tournamentSlug,
    matchId: result.matchId,
    updatedAt: result.lastScoreUpdatedAt ?? new Date(),
  });
}

function isMatchPlayerEventSequenceConstraintError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const meta = JSON.stringify(error.meta ?? {});
  return (
    meta.includes("MatchPlayerEvent_matchId_sequence_key") ||
    (meta.includes("matchId") && meta.includes("sequence"))
  );
}

async function runMatchPlayerEventMutationWithRetry<Result>(
  operation: (transaction: Prisma.TransactionClient) => Promise<Result>,
) {
  for (let attempt = 0; attempt <= MATCH_PLAYER_EVENT_SEQUENCE_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.$transaction((transaction) => operation(transaction));
    } catch (error) {
      if (
        isMatchPlayerEventSequenceConstraintError(error) &&
        attempt < MATCH_PLAYER_EVENT_SEQUENCE_RETRY_LIMIT
      ) {
        continue;
      }

      if (isMatchPlayerEventSequenceConstraintError(error)) {
        throw new MatchPlayerEventError(
          "Un altro organizzatore sta registrando un evento per questa partita. Riprova tra un istante.",
          "CONFLICT",
        );
      }

      throw error;
    }
  }

  throw new MatchPlayerEventError(
    "Un altro organizzatore sta registrando un evento per questa partita. Riprova tra un istante.",
    "CONFLICT",
  );
}

export async function readDashboardMatchEventContext(
  matchId: string,
): Promise<DashboardMatchEventContext> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      tournamentId: true,
      status: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      scoreVersion: true,
      lastScoreUpdatedAt: true,
      tournament: {
        select: {
          slug: true,
        },
      },
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
      playerEvents: {
        orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
        select: eventSelect,
      },
    },
  });

  if (!match) {
    throw new MatchPlayerEventError("Match not found.", "MATCH_NOT_FOUND");
  }

  const [homePlayers, awayPlayers] = await Promise.all([
    match.homeTeamId ? listTeamPlayers(match.homeTeamId) : Promise.resolve([]),
    match.awayTeamId ? listTeamPlayers(match.awayTeamId) : Promise.resolve([]),
  ]);
  const events = match.playerEvents.map(normalizeMatchEventTimelineItem);

  return {
    match: {
      matchId: match.id,
      tournamentId: match.tournamentId,
      tournamentSlug: match.tournament.slug,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      scoreVersion: match.scoreVersion,
      lastScoreUpdatedAt: match.lastScoreUpdatedAt,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeamName: match.homeTeam?.name ?? "Casa",
      awayTeamName: match.awayTeam?.name ?? "Trasferta",
    },
    homePlayers,
    awayPlayers,
    goalSummary: buildMatchGoalSummary(match.playerEvents, {
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeamName: match.homeTeam?.name ?? "Casa",
      awayTeamName: match.awayTeam?.name ?? "Trasferta",
    }),
    latestEventSummary: buildLatestEventSummary(match.playerEvents),
    scoreReconciliation: buildMatchScoreReconciliation(match.playerEvents, {
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    }),
    events,
  };
}

export async function createMatchPlayerEvent(
  input: CreateMatchPlayerEventInput,
): Promise<MatchPlayerEventMutationResult> {
  const now = new Date();

  const result = await runMatchPlayerEventMutationWithRetry(async (transaction) => {
    await lockMatchRow(transaction, input.matchId);
    const match = await loadMatchForEventMutation(transaction, input.matchId);
    assertLiveMatch(match);
    assertParticipatingTeam(match, input.teamId);

    if (input.type === "YELLOW_CARD" || input.type === "RED_CARD") {
      if (!input.playerId) {
        throw new MatchPlayerEventError("Seleziona un giocatore per registrare il cartellino.", "INVALID_PLAYER");
      }

      const player = await loadPlayerSnapshot(transaction, input.playerId, input.teamId, match);
      const sequence = await getNextEventSequence(transaction, match.id);

      const createdEvent = await transaction.matchPlayerEvent.create({
        data: {
          tournamentId: match.tournamentId,
          matchId: match.id,
          teamId: player.teamId,
          awardedTeamId: null,
          playerId: player.id,
          type: input.type,
          sequence,
          matchMinute: input.matchMinute ?? null,
          playerDisplayNameSnapshot: player.displayName,
          playerJerseyNumberSnapshot: player.jerseyNumber,
          teamNameSnapshot: getTeamNameForMatch(match, player.teamId),
          createdByUserId: input.userId ?? null,
        },
        select: {
          id: true,
        },
      });

      return {
        matchId: match.id,
        tournamentId: match.tournamentId,
        tournamentSlug: match.tournament.slug,
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        scoreVersion: match.scoreVersion,
        lastScoreUpdatedAt: match.lastScoreUpdatedAt,
        eventId: createdEvent.id,
      };
    }

    if (typeof input.expectedScoreVersion !== "number") {
      throw new MatchPlayerEventError("La versione del punteggio è obbligatoria per registrare un gol.", "CONFLICT");
    }

    let awardedTeamId = input.awardedTeamId ?? null;

    if (input.type === "GOAL") {
      if (awardedTeamId === null) {
        awardedTeamId = input.teamId;
      }

      if (awardedTeamId !== input.teamId) {
        throw new MatchPlayerEventError("Per un gol normale la squadra che segna deve coincidere con quella premiata.", "INVALID_EVENT");
      }
    }

    if (input.type === "OWN_GOAL") {
      if (awardedTeamId === null) {
        awardedTeamId = getOpponentTeamId(match, input.teamId);
      }

      if (!awardedTeamId || awardedTeamId === input.teamId) {
        throw new MatchPlayerEventError("Per un autogol la squadra premiata deve essere l'avversaria.", "INVALID_EVENT");
      }
    }

    if (!awardedTeamId) {
      throw new MatchPlayerEventError("La squadra a cui assegnare il gol non è valida.", "INVALID_EVENT");
    }

    let playerSnapshot: Awaited<ReturnType<typeof loadPlayerSnapshot>> | null = null;

    if (input.playerId) {
      playerSnapshot = await loadPlayerSnapshot(transaction, input.playerId, input.teamId, match);
    }

    const nextScore = buildNextScoreForAwardedTeam({
      match,
      awardedTeamId,
      delta: 1,
    });
    const updatedMatch = await updateMatchScoreVersioned(transaction, {
      match,
      expectedScoreVersion: input.expectedScoreVersion,
      nextHomeScore: nextScore.homeScore,
      nextAwayScore: nextScore.awayScore,
      userId: input.userId,
    });
    const sequence = await getNextEventSequence(transaction, match.id);

    const createdEvent = await transaction.matchPlayerEvent.create({
      data: {
        tournamentId: match.tournamentId,
        matchId: match.id,
        teamId: input.teamId,
        awardedTeamId,
        playerId: playerSnapshot?.id ?? null,
        type: input.type,
        sequence,
        matchMinute: input.matchMinute ?? null,
        playerDisplayNameSnapshot: playerSnapshot?.displayName ?? null,
        playerJerseyNumberSnapshot: playerSnapshot?.jerseyNumber ?? null,
        teamNameSnapshot: getTeamNameForMatch(match, input.teamId),
        createdByUserId: input.userId ?? null,
      },
      select: {
        id: true,
      },
    });

    await transaction.matchScoreEvent.create({
      data: {
        matchId: match.id,
        userId: input.userId ?? null,
        actionType: getActionTypeForGoalDelta({
          match,
          awardedTeamId,
          delta: 1,
        }),
        previousStatus: match.status,
        nextStatus: updatedMatch.status,
        previousHomeScore: match.homeScore,
        previousAwayScore: match.awayScore,
        nextHomeScore: updatedMatch.homeScore,
        nextAwayScore: updatedMatch.awayScore,
      },
    });

    return {
      matchId: updatedMatch.id,
      tournamentId: updatedMatch.tournamentId,
      tournamentSlug: match.tournament.slug,
      status: updatedMatch.status,
      homeScore: updatedMatch.homeScore,
      awayScore: updatedMatch.awayScore,
      scoreVersion: updatedMatch.scoreVersion,
      lastScoreUpdatedAt: updatedMatch.lastScoreUpdatedAt ?? now,
      eventId: createdEvent.id,
    };
  });

  await publishAndRevalidate(result);
  return result;
}

export async function reconcileMissingGoals(
  input: ReconcileMissingGoalsInput,
): Promise<MatchPlayerEventMutationResult> {
  const result = await runMatchPlayerEventMutationWithRetry(async (transaction) => {
    await lockMatchRow(transaction, input.matchId);
    const match = await loadMatchForEventMutation(transaction, input.matchId);
    assertLiveMatch(match);
    assertParticipatingTeam(match, input.teamId);

    const activeEvents = await loadActiveEvents(transaction, match.id);
    const reconciliation = buildMatchScoreReconciliation(activeEvents, {
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    });

    if (!reconciliation) {
      throw new MatchPlayerEventError("Impossibile riconciliare i gol di questa partita.", "INVALID_RECONCILIATION");
    }

    const goalDelta =
      input.teamId === match.homeTeamId ? reconciliation.homeGoalDelta : reconciliation.awayGoalDelta;

    if (goalDelta <= 0) {
      throw new MatchPlayerEventError(
        "Non ci sono gol mancanti da registrare per la squadra selezionata.",
        "INVALID_RECONCILIATION",
      );
    }

    let sequence = await getNextEventSequence(transaction, match.id);

    for (let index = 0; index < goalDelta; index += 1) {
      await transaction.matchPlayerEvent.create({
        data: {
          tournamentId: match.tournamentId,
          matchId: match.id,
          teamId: input.teamId,
          awardedTeamId: input.teamId,
          playerId: null,
          type: MatchPlayerEventType.GOAL,
          sequence,
          playerDisplayNameSnapshot: null,
          playerJerseyNumberSnapshot: null,
          teamNameSnapshot: getTeamNameForMatch(match, input.teamId),
          createdByUserId: input.userId ?? null,
        },
      });
      sequence += 1;
    }

    return {
      matchId: match.id,
      tournamentId: match.tournamentId,
      tournamentSlug: match.tournament.slug,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      scoreVersion: match.scoreVersion,
      lastScoreUpdatedAt: match.lastScoreUpdatedAt,
    };
  });

  await publishAndRevalidate(result);
  return result;
}

export async function updateMatchPlayerEvent(
  input: UpdateMatchPlayerEventInput,
): Promise<MatchPlayerEventMutationResult> {
  const result = await prisma.$transaction(async (transaction) => {
    const match = await loadMatchForEventMutation(transaction, input.matchId);
    assertLiveMatch(match);

    const existingEvent = await transaction.matchPlayerEvent.findUnique({
      where: { id: input.eventId },
      select: {
        id: true,
        matchId: true,
        teamId: true,
        awardedTeamId: true,
        playerId: true,
        type: true,
        sequence: true,
        voidedAt: true,
      },
    });

    if (!existingEvent || existingEvent.matchId !== match.id) {
      throw new MatchPlayerEventError("Evento partita non trovato.", "EVENT_NOT_FOUND");
    }

    if (existingEvent.voidedAt) {
      throw new MatchPlayerEventError("Gli eventi annullati non possono essere modificati.", "INVALID_EVENT");
    }

    if (existingEvent.type === MatchPlayerEventType.GOAL || existingEvent.type === MatchPlayerEventType.OWN_GOAL) {
      if (input.type && input.type !== existingEvent.type) {
        throw new MatchPlayerEventError(
          "La modifica del marcatore non può cambiare il tipo del gol già registrato.",
          "INVALID_EVENT",
        );
      }

      let playerSnapshot: Awaited<ReturnType<typeof loadPlayerSnapshot>> | null = null;

      if (input.playerId) {
        playerSnapshot = await loadPlayerSnapshot(transaction, input.playerId, existingEvent.teamId, match);
      }

      await transaction.matchPlayerEvent.update({
        where: { id: existingEvent.id },
        data: {
          playerId: playerSnapshot?.id ?? null,
          playerDisplayNameSnapshot: playerSnapshot?.displayName ?? null,
          playerJerseyNumberSnapshot: playerSnapshot?.jerseyNumber ?? null,
          matchMinute: input.matchMinute ?? null,
          updatedByUserId: input.userId ?? null,
        },
      });
    } else {
      const nextType = input.type;

      if (nextType !== "YELLOW_CARD" && nextType !== "RED_CARD") {
        throw new MatchPlayerEventError("Scegli un cartellino valido per modificare l'evento.", "INVALID_EVENT");
      }

      if (!input.playerId) {
        throw new MatchPlayerEventError("Seleziona un giocatore per modificare il cartellino.", "INVALID_PLAYER");
      }

      const playerId = input.playerId;
      const nextTeamId = await (async () => {
        const player = await transaction.player.findUnique({
          where: { id: playerId },
          select: {
            id: true,
            teamId: true,
            displayName: true,
            firstName: true,
            lastName: true,
            jerseyNumber: true,
          },
        });

        if (!player || !player.teamId) {
          throw new MatchPlayerEventError("Il giocatore selezionato non è disponibile.", "INVALID_PLAYER");
        }

        assertParticipatingTeam(match, player.teamId);

        return {
          id: player.id,
          teamId: player.teamId,
          displayName:
            player.displayName?.trim().length
              ? player.displayName.trim()
              : `${player.firstName} ${player.lastName}`.trim(),
          jerseyNumber: player.jerseyNumber ?? null,
        };
      })();

      await transaction.matchPlayerEvent.update({
        where: { id: existingEvent.id },
        data: {
          playerId: nextTeamId.id,
          teamId: nextTeamId.teamId,
          awardedTeamId: null,
          type: nextType,
          matchMinute: input.matchMinute ?? null,
          playerDisplayNameSnapshot: nextTeamId.displayName,
          playerJerseyNumberSnapshot: nextTeamId.jerseyNumber,
          teamNameSnapshot: getTeamNameForMatch(match, nextTeamId.teamId),
          updatedByUserId: input.userId ?? null,
        },
      });
    }

    return {
      matchId: match.id,
      tournamentId: match.tournamentId,
      tournamentSlug: match.tournament.slug,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      scoreVersion: match.scoreVersion,
      lastScoreUpdatedAt: match.lastScoreUpdatedAt,
    };
  });

  await publishAndRevalidate(result);
  return result;
}

export async function voidMatchPlayerEvent(
  input: VoidMatchPlayerEventInput,
): Promise<MatchPlayerEventMutationResult> {
  const now = new Date();

  const result = await prisma.$transaction(async (transaction) => {
    const match = await loadMatchForEventMutation(transaction, input.matchId);
    assertLiveMatch(match);

    const existingEvent = await transaction.matchPlayerEvent.findUnique({
      where: { id: input.eventId },
      select: {
        id: true,
        matchId: true,
        teamId: true,
        awardedTeamId: true,
        type: true,
        voidedAt: true,
      },
    });

    if (!existingEvent || existingEvent.matchId !== match.id) {
      throw new MatchPlayerEventError("Evento partita non trovato.", "EVENT_NOT_FOUND");
    }

    if (existingEvent.voidedAt) {
      throw new MatchPlayerEventError("Questo evento è già stato annullato.", "INVALID_EVENT");
    }

    if (existingEvent.type === MatchPlayerEventType.GOAL || existingEvent.type === MatchPlayerEventType.OWN_GOAL) {
      if (!existingEvent.awardedTeamId) {
        throw new MatchPlayerEventError("Il gol selezionato non è valido.", "INVALID_EVENT");
      }

      if (typeof input.expectedScoreVersion !== "number") {
        throw new MatchPlayerEventError("La versione del punteggio è obbligatoria per annullare un gol.", "CONFLICT");
      }

      const nextScore = buildNextScoreForAwardedTeam({
        match,
        awardedTeamId: existingEvent.awardedTeamId,
        delta: -1,
      });
      const updatedMatch = await updateMatchScoreVersioned(transaction, {
        match,
        expectedScoreVersion: input.expectedScoreVersion,
        nextHomeScore: nextScore.homeScore,
        nextAwayScore: nextScore.awayScore,
        userId: input.userId,
      });

      await transaction.matchPlayerEvent.update({
        where: { id: existingEvent.id },
        data: {
          voidedAt: now,
          voidedByUserId: input.userId ?? null,
        },
      });

      await transaction.matchScoreEvent.create({
        data: {
          matchId: match.id,
          userId: input.userId ?? null,
          actionType: getActionTypeForGoalDelta({
            match,
            awardedTeamId: existingEvent.awardedTeamId,
            delta: -1,
          }),
          previousStatus: match.status,
          nextStatus: updatedMatch.status,
          previousHomeScore: match.homeScore,
          previousAwayScore: match.awayScore,
          nextHomeScore: updatedMatch.homeScore,
          nextAwayScore: updatedMatch.awayScore,
        },
      });

      return {
        matchId: updatedMatch.id,
        tournamentId: updatedMatch.tournamentId,
        tournamentSlug: match.tournament.slug,
        status: updatedMatch.status,
        homeScore: updatedMatch.homeScore,
        awayScore: updatedMatch.awayScore,
        scoreVersion: updatedMatch.scoreVersion,
        lastScoreUpdatedAt: updatedMatch.lastScoreUpdatedAt ?? now,
      };
    }

    await transaction.matchPlayerEvent.update({
      where: { id: existingEvent.id },
      data: {
        voidedAt: now,
        voidedByUserId: input.userId ?? null,
      },
    });

    return {
      matchId: match.id,
      tournamentId: match.tournamentId,
      tournamentSlug: match.tournament.slug,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      scoreVersion: match.scoreVersion,
      lastScoreUpdatedAt: match.lastScoreUpdatedAt,
    };
  });

  await publishAndRevalidate(result);
  return result;
}

export async function listPublicMatchPlayerEvents(
  slug: string,
  matchId: string,
): Promise<MatchPlayerEventTimelineItem[]> {
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      tournament: {
        slug,
        status: {
          not: TournamentStatus.DRAFT,
        },
      },
      OR: [
        { stageId: null },
        {
          stage: {
            isPublic: true,
          },
        },
      ],
    },
    select: {
      id: true,
      playerEvents: {
        where: {
          voidedAt: null,
        },
        orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
        select: eventSelect,
      },
    },
  });

  if (!match) {
    throw new MatchPlayerEventError("Match not found.", "MATCH_NOT_FOUND");
  }

  return match.playerEvents.map(normalizeMatchEventTimelineItem);
}

export async function listPublicTournamentScorers(
  slug: string,
): Promise<TournamentScorerStandingRow[]> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
    },
  });

  if (!tournament || tournament.status === TournamentStatus.DRAFT) {
    return [];
  }

  const events = await prisma.matchPlayerEvent.findMany({
    where: {
      tournamentId: tournament.id,
      voidedAt: null,
      playerId: {
        not: null,
      },
      match: {
        status: MatchStatus.FINISHED,
        OR: [
          {
            stageId: null,
          },
          {
            stage: {
              isPublic: true,
            },
          },
        ],
      },
    },
    select: {
      id: true,
      playerId: true,
      type: true,
      playerDisplayNameSnapshot: true,
      teamId: true,
      teamNameSnapshot: true,
    },
  });

  const rowsByPlayerId = new Map<
    string,
    {
      playerId: string;
      playerName: string;
      teamId: string | null;
      teamName: string;
      goals: number;
      yellowCards: number;
      redCards: number;
    }
  >();

  for (const event of events) {
    if (!event.playerId) {
      continue;
    }

    const existing = rowsByPlayerId.get(event.playerId) ?? {
      playerId: event.playerId,
      playerName: event.playerDisplayNameSnapshot?.trim() || "Giocatore",
      teamId: event.teamId,
      teamName: event.teamNameSnapshot,
      goals: 0,
      yellowCards: 0,
      redCards: 0,
    };

    if (event.type === MatchPlayerEventType.GOAL) {
      existing.goals += 1;
    }

    if (event.type === MatchPlayerEventType.YELLOW_CARD) {
      existing.yellowCards += 1;
    }

    if (event.type === MatchPlayerEventType.RED_CARD) {
      existing.redCards += 1;
    }

    rowsByPlayerId.set(event.playerId, existing);
  }

  return buildTournamentScorerStandings(
    Array.from(rowsByPlayerId.values()).filter((row) => row.goals > 0 || row.yellowCards > 0 || row.redCards > 0),
  );
}
