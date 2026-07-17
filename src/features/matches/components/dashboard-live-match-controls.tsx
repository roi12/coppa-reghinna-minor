"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { TeamMark } from "@/components/ui/team-mark";
import { MatchGoalSummary } from "@/features/matches/components/match-goal-summary";
import { MatchLiveIndicator } from "@/features/matches/components/match-live-indicator";
import type {
  MatchGoalSummaryItem,
  MatchLatestEventSummary,
  MatchPlayerEventTimelineItem,
  MatchPlayerEventTypeValue,
  MatchScoreReconciliation,
} from "@/features/matches/types/match-player-events.types";
import type { MatchSummary } from "@/features/matches/types/match.types";
import type { PlayerSummary } from "@/features/players/types/player.types";
import { formatDateTimeLabel } from "@/lib/format-date";

type DashboardLiveMatchControlsProps = {
  match: MatchSummary;
};

type MatchControlState = Pick<
  MatchSummary,
  "status" | "homeScore" | "awayScore" | "scoreVersion" | "lastScoreUpdatedAt"
>;

type DashboardMatchEventContextTransport = {
  match: {
    matchId: string;
    tournamentId: string;
    tournamentSlug: string;
    status: MatchSummary["status"];
    homeScore: number;
    awayScore: number;
    scoreVersion: number;
    lastScoreUpdatedAt: string | null;
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
  events: Array<
    Omit<MatchPlayerEventTimelineItem, "createdAt" | "updatedAt" | "voidedAt"> & {
      createdAt: string;
      updatedAt: string;
      voidedAt: string | null;
    }
  >;
};

type DashboardMatchEventContextState = {
  match: {
    matchId: string;
    tournamentId: string;
    tournamentSlug: string;
    status: MatchSummary["status"];
    homeScore: number;
    awayScore: number;
    scoreVersion: number;
    lastScoreUpdatedAt: Date | null;
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

type MatchMutationResult = MatchControlState & {
  matchId: string;
  tournamentId: string;
  tournamentSlug: string;
  eventId?: string | null;
};

type PlayerEventSheetState =
  | {
      kind: "goal-assignment";
      eventId: string;
      teamId: string;
    }
  | {
      kind: "player-event";
      selectedTeamId: string | null;
      selectedPlayerId: string | null;
      selectedType: MatchPlayerEventTypeValue | null;
      editingEventId: string | null;
    };

function parseOptionalDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function normalizeEventContext(
  payload: DashboardMatchEventContextTransport,
): DashboardMatchEventContextState {
  return {
    match: {
      ...payload.match,
      lastScoreUpdatedAt: parseOptionalDate(payload.match.lastScoreUpdatedAt),
    },
    homePlayers: payload.homePlayers,
    awayPlayers: payload.awayPlayers,
    goalSummary: payload.goalSummary,
    latestEventSummary: payload.latestEventSummary,
    scoreReconciliation: payload.scoreReconciliation,
    events: payload.events.map((event) => ({
      ...event,
      createdAt: new Date(event.createdAt),
      updatedAt: new Date(event.updatedAt),
      voidedAt: parseOptionalDate(event.voidedAt),
    })),
  };
}

function getPlayerLabel(player: PlayerSummary) {
  return player.displayName?.trim().length
    ? player.displayName.trim()
    : `${player.firstName} ${player.lastName}`.trim();
}

function matchesPlayerSearch(player: PlayerSummary, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return true;
  }

  const label = getPlayerLabel(player).toLowerCase();
  const jerseyNumber = player.jerseyNumber?.toLowerCase() ?? "";

  return label.includes(normalizedQuery) || jerseyNumber.includes(normalizedQuery);
}

async function readLatestMatchState(matchId: string): Promise<MatchControlState> {
  const response = await fetch(`/api/dashboard/matches/${matchId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Impossibile aggiornare lo stato della partita.");
  }

  const payload = (await response.json()) as MatchControlState & { lastScoreUpdatedAt: string | null };

  return {
    ...payload,
    lastScoreUpdatedAt: parseOptionalDate(payload.lastScoreUpdatedAt),
  };
}

async function readEventContext(matchId: string): Promise<DashboardMatchEventContextState> {
  const response = await fetch(`/api/dashboard/matches/${matchId}/events`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Impossibile caricare la cronologia eventi.");
  }

  return normalizeEventContext((await response.json()) as DashboardMatchEventContextTransport);
}

async function postMatchAction(
  matchId: string,
  body: Record<string, unknown>,
): Promise<MatchMutationResult> {
  const response = await fetch(`/api/dashboard/matches/${matchId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as
    | (MatchMutationResult & { lastScoreUpdatedAt: string | null })
    | { error?: string };

  if (!response.ok) {
    throw new Error(("error" in payload ? payload.error : undefined) ?? "Operazione non riuscita.");
  }

  return {
    ...payload,
    lastScoreUpdatedAt:
      "lastScoreUpdatedAt" in payload ? parseOptionalDate(payload.lastScoreUpdatedAt) : null,
  } as MatchMutationResult;
}

async function postMatchEvent(
  matchId: string,
  body: Record<string, unknown>,
): Promise<MatchMutationResult> {
  const response = await fetch(`/api/dashboard/matches/${matchId}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as
    | (MatchMutationResult & { lastScoreUpdatedAt: string | null })
    | { error?: string };

  if (!response.ok) {
    throw new Error(("error" in payload ? payload.error : undefined) ?? "Operazione evento non riuscita.");
  }

  return {
    ...payload,
    lastScoreUpdatedAt:
      "lastScoreUpdatedAt" in payload ? parseOptionalDate(payload.lastScoreUpdatedAt) : null,
  } as MatchMutationResult;
}

async function patchMatchEvent(
  matchId: string,
  eventId: string,
  body: Record<string, unknown>,
): Promise<MatchMutationResult> {
  const response = await fetch(`/api/dashboard/matches/${matchId}/events/${eventId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as
    | (MatchMutationResult & { lastScoreUpdatedAt: string | null })
    | { error?: string };

  if (!response.ok) {
    throw new Error(("error" in payload ? payload.error : undefined) ?? "Modifica evento non riuscita.");
  }

  return {
    ...payload,
    lastScoreUpdatedAt:
      "lastScoreUpdatedAt" in payload ? parseOptionalDate(payload.lastScoreUpdatedAt) : null,
  } as MatchMutationResult;
}

async function voidMatchEvent(
  matchId: string,
  eventId: string,
  body: Record<string, unknown>,
): Promise<MatchMutationResult> {
  const response = await fetch(`/api/dashboard/matches/${matchId}/events/${eventId}/void`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as
    | (MatchMutationResult & { lastScoreUpdatedAt: string | null })
    | { error?: string };

  if (!response.ok) {
    throw new Error(("error" in payload ? payload.error : undefined) ?? "Annullamento evento non riuscito.");
  }

  return {
    ...payload,
    lastScoreUpdatedAt:
      "lastScoreUpdatedAt" in payload ? parseOptionalDate(payload.lastScoreUpdatedAt) : null,
  } as MatchMutationResult;
}

function BottomSheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="relative max-h-[88vh] w-full overflow-hidden rounded-t-[2rem] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 pb-4 pt-3">
          <div className="mx-auto h-1.5 w-14 rounded-full bg-slate-200" />
          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
              {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Chiudi
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DashboardLiveMatchControls({ match }: DashboardLiveMatchControlsProps) {
  const [state, setState] = useState<MatchControlState>({
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    scoreVersion: match.scoreVersion,
    lastScoreUpdatedAt: match.lastScoreUpdatedAt,
  });
  const [eventContext, setEventContext] = useState<DashboardMatchEventContextState | null>(null);
  const [homeInput, setHomeInput] = useState(String(match.homeScore));
  const [awayInput, setAwayInput] = useState(String(match.awayScore));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<PlayerEventSheetState | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [correctionsOpen, setCorrectionsOpen] = useState(false);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);

  const syncMatchState = (nextState: MatchControlState) => {
    setState(nextState);
    setHomeInput(String(nextState.homeScore));
    setAwayInput(String(nextState.awayScore));
  };

  const syncFromContext = (context: DashboardMatchEventContextState) => {
    setEventContext(context);
    syncMatchState({
      status: context.match.status,
      homeScore: context.match.homeScore,
      awayScore: context.match.awayScore,
      scoreVersion: context.match.scoreVersion,
      lastScoreUpdatedAt: context.match.lastScoreUpdatedAt,
    });
  };

  const refreshEventContext = async () => {
    const latestContext = await readEventContext(match.id);
    syncFromContext(latestContext);
    return latestContext;
  };

  const goalSummary = eventContext?.goalSummary ?? match.goalSummary;
  const latestEventSummary = eventContext?.latestEventSummary ?? match.latestEventSummary;
  const scoreReconciliation = eventContext?.scoreReconciliation ?? match.scoreReconciliation;
  const events = eventContext?.events ?? [];
  const homePlayers = useMemo(() => eventContext?.homePlayers ?? [], [eventContext?.homePlayers]);
  const awayPlayers = useMemo(() => eventContext?.awayPlayers ?? [], [eventContext?.awayPlayers]);
  const isBusy = pendingLabel !== null;
  const isLive = state.status === "LIVE";
  const isFinished = state.status === "FINISHED";

  const ensureEventContextLoaded = async () => {
    if (eventContext) {
      return eventContext;
    }

    return refreshEventContext();
  };

  const selectedTeamPlayers = useMemo(() => {
    if (!sheetState) {
      return [];
    }

    const selectedTeamId =
      sheetState.kind === "goal-assignment" ? sheetState.teamId : sheetState.selectedTeamId;

    if (!selectedTeamId) {
      return [];
    }

    const sourcePlayers =
      selectedTeamId === eventContext?.match.homeTeamId ? homePlayers : awayPlayers;

    return sourcePlayers.filter((player) => matchesPlayerSearch(player, playerSearch));
  }, [awayPlayers, eventContext?.match.homeTeamId, homePlayers, playerSearch, sheetState]);

  const runTask = async (
    label: string,
    task: () => Promise<void>,
    options?: { preserveFeedback?: boolean },
  ) => {
    setPendingLabel(label);
    setError(null);
    if (!options?.preserveFeedback) {
      setFeedback(null);
    }

    try {
      await task();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Operazione non riuscita.");
    } finally {
      setPendingLabel(null);
    }
  };

  const syncLatestState = async () => {
    const latestState = await readLatestMatchState(match.id);
    syncMatchState(latestState);
  };

  const sendAction = async (
    action:
      | "start"
      | "finish"
      | "return_to_scheduled"
      | "postpone"
      | "cancel"
      | "reopen"
      | "increment_home"
      | "increment_away"
      | "decrement_home"
      | "decrement_away"
      | "set_score"
      | "undo",
    nextPayload?: { homeScore?: number; awayScore?: number; confirmReopen?: boolean },
  ) => {
    await runTask("Aggiornamento partita...", async () => {
      try {
        const result = await postMatchAction(match.id, {
          action,
          expectedScoreVersion: state.scoreVersion,
          ...nextPayload,
        });

        syncMatchState(result);
        await refreshEventContext().catch(syncLatestState);
        setFeedback("Aggiornamento salvato.");
      } catch (requestError) {
        if (requestError instanceof Error && /aggiornat[oa] da un altro/i.test(requestError.message)) {
          await syncLatestState();
          await refreshEventContext().catch(() => null);
        }

        throw requestError;
      }
    });
  };

  const handleFinish = () => {
    if (window.confirm("Confermi la chiusura della partita?")) {
      void sendAction("finish");
    }
  };

  const handleReopen = () => {
    if (window.confirm("Riaprire una partita conclusa è un'azione esplicita. Continuare?")) {
      void sendAction("reopen", { confirmReopen: true });
    }
  };

  const handleSetScore = () => {
    const nextHomeScore = Number(homeInput);
    const nextAwayScore = Number(awayInput);

    if (!Number.isInteger(nextHomeScore) || nextHomeScore < 0) {
      setError("Il punteggio casa deve essere un intero non negativo.");
      return;
    }

    if (!Number.isInteger(nextAwayScore) || nextAwayScore < 0) {
      setError("Il punteggio ospite deve essere un intero non negativo.");
      return;
    }

    void sendAction("set_score", {
      homeScore: nextHomeScore,
      awayScore: nextAwayScore,
    });
  };

  const openGoalAssignmentSheet = (eventId: string, teamId: string) => {
    setPlayerSearch("");
    setSheetState({
      kind: "goal-assignment",
      eventId,
      teamId,
    });
  };

  const openPlayerEventSheet = (
    selectedTeamId: string | null = eventContext?.match.homeTeamId ?? match.homeTeamId,
    editingEventId: string | null = null,
    selectedPlayerId: string | null = null,
    selectedType: MatchPlayerEventTypeValue | null = null,
  ) => {
    setPlayerSearch("");
    setSheetState({
      kind: "player-event",
      selectedTeamId,
      selectedPlayerId,
      selectedType,
      editingEventId,
    });
  };

  const handleOpenPlayerEventSheet = () => {
    void runTask(
      "Caricamento rosa...",
      async () => {
        await ensureEventContextLoaded();
        openPlayerEventSheet();
      },
      { preserveFeedback: true },
    );
  };

  const handleQuickGoal = (teamId: string | null) => {
    if (!teamId) {
      setError("La squadra selezionata non è valida.");
      return;
    }

    void runTask("Registrazione gol...", async () => {
      const result = await postMatchEvent(match.id, {
        type: "GOAL",
        teamId,
        awardedTeamId: teamId,
        playerId: null,
        expectedScoreVersion: state.scoreVersion,
      });

      syncMatchState(result);
      const latestContext = await refreshEventContext().catch(() => null);

      if (result.eventId) {
        openGoalAssignmentSheet(result.eventId, teamId);
      } else if (latestContext) {
        const latestGoal = [...latestContext.events]
          .reverse()
          .find((event) => event.type === "GOAL" && event.playerId === null && event.teamId === teamId && !event.voidedAt);

        if (latestGoal) {
          openGoalAssignmentSheet(latestGoal.id, teamId);
        }
      }

      setFeedback("Gol registrato. Puoi assegnare subito il marcatore.");
    });
  };

  const handleAssignScorer = (playerId: string | null) => {
    if (!sheetState || sheetState.kind !== "goal-assignment") {
      return;
    }

    void runTask("Assegnazione marcatore...", async () => {
      await patchMatchEvent(match.id, sheetState.eventId, {
        playerId,
      });
      await refreshEventContext();
      setSheetState(null);
      setFeedback(
        playerId ? "Marcatore aggiornato." : "Gol lasciato senza marcatore assegnato.",
      );
    });
  };

  const handleCreateOrUpdatePlayerEvent = () => {
    if (!sheetState || sheetState.kind !== "player-event") {
      return;
    }

    if (!sheetState.selectedTeamId) {
      setError("Seleziona una squadra.");
      return;
    }

    if (!sheetState.selectedPlayerId) {
      setError("Seleziona un giocatore.");
      return;
    }

    if (!sheetState.selectedType) {
      setError("Seleziona un evento.");
      return;
    }

    void runTask("Salvataggio evento...", async () => {
      if (sheetState.editingEventId) {
        await patchMatchEvent(match.id, sheetState.editingEventId, {
          playerId: sheetState.selectedPlayerId,
          type: sheetState.selectedType,
        });
      } else {
        const payload: Record<string, unknown> = {
          type: sheetState.selectedType,
          teamId: sheetState.selectedTeamId,
          playerId: sheetState.selectedPlayerId,
        };

        if (sheetState.selectedType === "GOAL") {
          payload.awardedTeamId = sheetState.selectedTeamId;
          payload.expectedScoreVersion = state.scoreVersion;
        }

        if (sheetState.selectedType === "OWN_GOAL") {
          const awardedTeamId =
            sheetState.selectedTeamId === (eventContext?.match.homeTeamId ?? match.homeTeamId)
              ? eventContext?.match.awayTeamId ?? match.awayTeamId
              : eventContext?.match.homeTeamId ?? match.homeTeamId;

          payload.awardedTeamId = awardedTeamId;
          payload.expectedScoreVersion = state.scoreVersion;
        }

        const result = await postMatchEvent(match.id, payload);
        syncMatchState(result);
      }

      await refreshEventContext();
      setSheetState(null);
      setFeedback("Evento giocatore registrato.");
    });
  };

  const handleVoidEvent = (event: MatchPlayerEventTimelineItem) => {
    if (!window.confirm("Confermi l'annullamento di questo evento?")) {
      return;
    }

    void runTask("Annullamento evento...", async () => {
      await voidMatchEvent(match.id, event.id, {
        expectedScoreVersion:
          event.type === "GOAL" || event.type === "OWN_GOAL" ? state.scoreVersion : undefined,
      });
      await refreshEventContext();
      setFeedback("Evento annullato.");
    });
  };

  const handleReconcileMissingGoals = (teamId: string | null) => {
    if (!teamId) {
      return;
    }

    void runTask("Registrazione marcatori mancanti...", async () => {
      await postMatchEvent(match.id, {
        action: "reconcile_missing_goals",
        teamId,
      });
      await refreshEventContext();
      setFeedback("Gol mancanti registrati come marcatori da assegnare.");
    });
  };

  const selectedPlayer =
    sheetState?.kind === "player-event" && sheetState.selectedPlayerId
      ? [...homePlayers, ...awayPlayers].find((player) => player.id === sheetState.selectedPlayerId) ?? null
      : null;

  return (
    <section className="w-full max-w-full min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {match.roundLabel ?? "Partita"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatDateTimeLabel(match.startsAt)}
            {match.locationLabel ? ` · ${match.locationLabel}` : ""}
          </p>
        </div>
        <MatchLiveIndicator status={state.status} />
      </div>

      <div className="mt-4 rounded-[1.75rem] bg-white px-4 py-5 shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="flex items-center gap-3">
            <TeamMark name={match.homeTeamName} />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Casa</p>
              <p className="truncate text-base font-semibold text-slate-950">{match.homeTeamName}</p>
            </div>
          </div>
          <div className="rounded-[1.35rem] bg-slate-950 px-4 py-3 text-center text-white">
            <p className="text-3xl font-semibold tabular-nums sm:text-4xl">
              {state.homeScore} - {state.awayScore}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3">
            <div className="min-w-0 text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Trasferta</p>
              <p className="truncate text-base font-semibold text-slate-950">{match.awayTeamName}</p>
            </div>
            <TeamMark name={match.awayTeamName} />
          </div>
        </div>

        {goalSummary.length > 0 ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <MatchGoalSummary
              items={goalSummary}
              homeTeamId={match.homeTeamId}
              awayTeamId={match.awayTeamId}
            />
          </div>
        ) : null}

        {latestEventSummary ? (
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Ultimo evento: <span className="font-medium text-slate-950">{latestEventSummary.label}</span>
            {latestEventSummary.matchMinute ? ` · ${latestEventSummary.matchMinute}'` : ""}
          </div>
        ) : null}
      </div>

      {scoreReconciliation ? (
        <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Controllo punteggio e marcatori</p>
          <p className="mt-2">
            Casa: punteggio {state.homeScore}, gol registrati {scoreReconciliation.homeRecordedGoals}
            {scoreReconciliation.homeUnassignedGoals > 0
              ? `, ${scoreReconciliation.homeUnassignedGoals} marcatore/i da assegnare`
              : ""}
            .
          </p>
          <p className="mt-1">
            Ospiti: punteggio {state.awayScore}, gol registrati {scoreReconciliation.awayRecordedGoals}
            {scoreReconciliation.awayUnassignedGoals > 0
              ? `, ${scoreReconciliation.awayUnassignedGoals} marcatore/i da assegnare`
              : ""}
            .
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {scoreReconciliation.homeGoalDelta > 0 && isLive && match.homeTeamId ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleReconcileMissingGoals(match.homeTeamId)}
                className="min-h-11 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-50"
              >
                Registra {scoreReconciliation.homeGoalDelta} gol casa mancanti
              </button>
            ) : null}
            {scoreReconciliation.awayGoalDelta > 0 && isLive && match.awayTeamId ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleReconcileMissingGoals(match.awayTeamId)}
                className="min-h-11 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-50"
              >
                Registra {scoreReconciliation.awayGoalDelta} gol ospiti mancanti
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!isLive || isBusy || !match.homeTeamId}
            onClick={() => handleQuickGoal(match.homeTeamId)}
            className="min-h-14 rounded-[1.5rem] bg-red-600 px-5 py-4 text-base font-semibold text-white disabled:opacity-50"
          >
            +1 Gol · {match.homeTeamName}
          </button>
          <button
            type="button"
            disabled={!isLive || isBusy || !match.awayTeamId}
            onClick={() => handleQuickGoal(match.awayTeamId)}
            className="min-h-14 rounded-[1.5rem] bg-red-600 px-5 py-4 text-base font-semibold text-white disabled:opacity-50"
          >
            +1 Gol · {match.awayTeamName}
          </button>
        </div>

          <button
            type="button"
            disabled={!isLive || isBusy}
            onClick={handleOpenPlayerEventSheet}
            className="min-h-12 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900 disabled:opacity-50"
          >
            Evento giocatore
        </button>
      </div>

      <details
        open={correctionsOpen}
        onToggle={(event) => setCorrectionsOpen((event.currentTarget as HTMLDetailsElement).open)}
        className="mt-4 overflow-hidden rounded-[1.5rem] bg-white shadow-sm"
      >
        <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-slate-900">
          Correzioni punteggio
        </summary>
        <div className="border-t border-slate-200 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_auto]">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Correzione casa
              <input
                type="number"
                min="0"
                value={homeInput}
                onChange={(event) => setHomeInput(event.target.value)}
                className="min-h-12 rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Correzione ospite
              <input
                type="number"
                min="0"
                value={awayInput}
                onChange={(event) => setAwayInput(event.target.value)}
                className="min-h-12 rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
              />
            </label>
            <button
              type="button"
              disabled={!isLive || isBusy}
              onClick={handleSetScore}
              className="min-h-12 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Imposta punteggio
            </button>
          </div>
        </div>
      </details>

      <details
        open={historyOpen}
        onToggle={(event) => {
          const isOpen = (event.currentTarget as HTMLDetailsElement).open;
          setHistoryOpen(isOpen);

          if (isOpen && !eventContext) {
            void runTask(
              "Caricamento cronologia...",
              async () => {
                await ensureEventContextLoaded();
              },
              { preserveFeedback: true },
            );
          }
        }}
        className="mt-4 overflow-hidden rounded-[1.5rem] bg-white shadow-sm"
      >
        <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-slate-900">
          Cronologia eventi
        </summary>
        <div className="border-t border-slate-200 px-4 py-4">
          {events.length === 0 ? (
            <p className="text-sm text-slate-600">Nessun evento giocatore registrato al momento.</p>
          ) : (
            <div className="grid gap-3">
              {events.map((event) => (
                <article
                  key={event.id}
                  className={`rounded-[1.35rem] border px-4 py-3 ${
                    event.voidedAt
                      ? "border-slate-200 bg-slate-50 text-slate-500"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{event.label}</p>
                      <p className="mt-1 text-sm text-slate-600">{event.teamName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Ordine #{event.sequence}
                        {typeof event.matchMinute === "number" ? ` · ${event.matchMinute}'` : ""}
                        {event.voidedAt ? " · evento annullato" : ""}
                      </p>
                    </div>
                    {!event.voidedAt ? (
                      <div className="flex shrink-0 flex-col gap-2">
                        {event.type === "GOAL" || event.type === "OWN_GOAL" ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => openGoalAssignmentSheet(event.id, event.teamId)}
                            className="min-h-10 rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                          >
                            {event.playerId ? "Modifica" : "Assegna marcatore"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              openPlayerEventSheet(event.teamId, event.id, event.playerId, event.type)
                            }
                            className="min-h-10 rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                          >
                            Modifica
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleVoidEvent(event)}
                          className="min-h-10 rounded-full border border-red-200 px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-50"
                        >
                          Annulla evento
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </details>

      <details
        open={lifecycleOpen}
        onToggle={(event) => setLifecycleOpen((event.currentTarget as HTMLDetailsElement).open)}
        className="mt-4 overflow-hidden rounded-[1.5rem] bg-white shadow-sm"
      >
        <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-slate-900">
          Stato partita
        </summary>
        <div className="border-t border-slate-200 px-4 py-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={state.status !== "SCHEDULED" || isBusy}
              onClick={() => void sendAction("start")}
              className="min-h-12 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Start Match
            </button>
            <button
              type="button"
              disabled={!isLive || isBusy}
              onClick={handleFinish}
              className="min-h-12 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Finish Match
            </button>
            <button
              type="button"
              disabled={!isLive || isBusy}
              onClick={() => void sendAction("return_to_scheduled")}
              className="min-h-12 rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Return to Scheduled
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void sendAction("postpone")}
              className="min-h-12 rounded-full border border-amber-300 px-5 py-3 text-sm font-medium text-amber-800 disabled:opacity-50"
            >
              Postpone
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void sendAction("cancel")}
              className="min-h-12 rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isFinished || isBusy}
              onClick={handleReopen}
              className="min-h-12 rounded-full border border-red-300 px-5 py-3 text-sm font-medium text-red-700 disabled:opacity-50"
            >
              Reopen Match
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void sendAction("undo")}
              className="min-h-12 rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Undo Last Change
            </button>
          </div>
        </div>
      </details>

      <div className="mt-4 flex flex-col gap-2 text-sm">
        {state.lastScoreUpdatedAt ? (
          <p className="text-slate-500">
            Ultimo aggiornamento: {formatDateTimeLabel(state.lastScoreUpdatedAt)}
          </p>
        ) : null}
        {pendingLabel ? <p className="text-slate-700">{pendingLabel}</p> : null}
        {feedback ? <p className="text-emerald-700">{feedback}</p> : null}
        {error ? <p className="text-red-700">{error}</p> : null}
      </div>

      {sheetState?.kind === "goal-assignment" ? (
        <BottomSheet
          title="Seleziona il marcatore"
          subtitle="Il punteggio è già stato aggiornato. Se chiudi il foglio, il gol resta come marcatore da assegnare."
          onClose={() => {
            setSheetState(null);
            setFeedback("Gol lasciato come marcatore da assegnare.");
          }}
        >
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Cerca giocatore
              <input
                autoFocus
                type="search"
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                placeholder="Nome o numero di maglia"
                className="min-h-12 rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
              />
            </label>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleAssignScorer(null)}
              className="min-h-12 rounded-[1.25rem] border border-slate-300 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-900 disabled:opacity-50"
            >
              Marcatore da assegnare
            </button>

            <div className="grid gap-2">
              {selectedTeamPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleAssignScorer(player.id)}
                  className="min-h-12 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-900 shadow-sm disabled:opacity-50"
                >
                  <span className="font-medium">{getPlayerLabel(player)}</span>
                  {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}
                </button>
              ))}
            </div>
          </div>
        </BottomSheet>
      ) : null}

      {sheetState?.kind === "player-event" ? (
        <BottomSheet
          title="Evento giocatore"
          subtitle="Seleziona squadra, giocatore ed evento. I gol aggiornano anche il punteggio ufficiale."
          onClose={() => setSheetState(null)}
        >
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setSheetState((current) =>
                    current?.kind === "player-event"
                      ? {
                          ...current,
                          selectedTeamId: eventContext?.match.homeTeamId ?? match.homeTeamId,
                          selectedPlayerId: null,
                        }
                      : current,
                  )
                }
                className={`min-h-12 rounded-full px-4 py-3 text-sm font-medium ${
                  sheetState.selectedTeamId === (eventContext?.match.homeTeamId ?? match.homeTeamId)
                    ? "bg-slate-950 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                {match.homeTeamName}
              </button>
              <button
                type="button"
                onClick={() =>
                  setSheetState((current) =>
                    current?.kind === "player-event"
                      ? {
                          ...current,
                          selectedTeamId: eventContext?.match.awayTeamId ?? match.awayTeamId,
                          selectedPlayerId: null,
                        }
                      : current,
                  )
                }
                className={`min-h-12 rounded-full px-4 py-3 text-sm font-medium ${
                  sheetState.selectedTeamId === (eventContext?.match.awayTeamId ?? match.awayTeamId)
                    ? "bg-slate-950 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                {match.awayTeamName}
              </button>
            </div>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Cerca giocatore
              <input
                autoFocus
                type="search"
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                placeholder="Nome o numero di maglia"
                className="min-h-12 rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
              />
            </label>

            <div className="grid gap-2">
              {selectedTeamPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() =>
                    setSheetState((current) =>
                      current?.kind === "player-event"
                        ? {
                            ...current,
                            selectedPlayerId: player.id,
                          }
                        : current,
                    )
                  }
                  className={`min-h-12 rounded-[1.25rem] border px-4 py-3 text-left text-sm shadow-sm ${
                    sheetState.selectedPlayerId === player.id
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <span className="font-medium">{getPlayerLabel(player)}</span>
                  {player.jerseyNumber ? ` · #${player.jerseyNumber}` : ""}
                </button>
              ))}
            </div>

            {selectedPlayer ? (
              <div className="rounded-[1.35rem] bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">
                  {getPlayerLabel(selectedPlayer)}
                  {selectedPlayer.jerseyNumber ? ` · #${selectedPlayer.jerseyNumber}` : ""}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD"] as MatchPlayerEventTypeValue[]).map((type) => {
                    const label =
                      type === "GOAL"
                        ? "Gol"
                        : type === "OWN_GOAL"
                          ? "Autogol"
                          : type === "YELLOW_CARD"
                            ? "Ammonizione"
                            : "Espulsione";

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setSheetState((current) =>
                            current?.kind === "player-event"
                              ? {
                                  ...current,
                                  selectedType: type,
                                }
                              : current,
                          )
                        }
                        className={`min-h-12 rounded-[1.15rem] px-4 py-3 text-sm font-medium ${
                          sheetState.selectedType === type
                            ? "bg-slate-950 text-white"
                            : "border border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleCreateOrUpdatePlayerEvent}
                  className="mt-4 min-h-12 w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {sheetState.editingEventId ? "Aggiorna evento" : "Conferma evento"}
                </button>
              </div>
            ) : null}
          </div>
        </BottomSheet>
      ) : null}
    </section>
  );
}
