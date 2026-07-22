"use client";

import { useEffect, useId, useMemo, useState } from "react";
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
import {
  formatCompactDateTimeLabel,
  formatLocalizedDateTimeLabel,
} from "@/lib/format-date";

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

function comparePlayersForSheet(left: PlayerSummary, right: PlayerSummary) {
  const leftNumber = Number(left.jerseyNumber);
  const rightNumber = Number(right.jerseyNumber);
  const leftHasNumber = Number.isFinite(leftNumber);
  const rightHasNumber = Number.isFinite(rightNumber);

  if (leftHasNumber && rightHasNumber && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  if (leftHasNumber !== rightHasNumber) {
    return leftHasNumber ? -1 : 1;
  }

  return getPlayerLabel(left).localeCompare(getPlayerLabel(right), "it", {
    sensitivity: "base",
  });
}

function getTeamShortLabel(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return parts
      .slice(0, 3)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  return name.trim().slice(0, 3).toUpperCase() || "TEAM";
}

function getEventTypeLabel(type: MatchPlayerEventTypeValue) {
  switch (type) {
    case "GOAL":
      return "Gol";
    case "OWN_GOAL":
      return "Autogol";
    case "YELLOW_CARD":
      return "Ammonizione";
    case "RED_CARD":
      return "Espulsione";
    default:
      return "Evento";
  }
}

function getPlayerEventActionLabel(type: MatchPlayerEventTypeValue | null, isEditing: boolean) {
  if (!type) {
    return "Seleziona evento e giocatore";
  }

  switch (type) {
    case "GOAL":
      return isEditing ? "Aggiorna gol" : "Conferma gol";
    case "OWN_GOAL":
      return isEditing ? "Aggiorna autogol" : "Conferma autogol";
    case "YELLOW_CARD":
      return isEditing ? "Aggiorna cartellino giallo" : "Conferma cartellino giallo";
    case "RED_CARD":
      return isEditing ? "Aggiorna cartellino rosso" : "Conferma cartellino rosso";
    default:
      return isEditing ? "Aggiorna evento" : "Conferma evento";
  }
}

function getFeedbackTone(type: "success" | "error" | "pending") {
  if (type === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (type === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-slate-200 bg-white text-slate-700";
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
  canDismiss = true,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  canDismiss?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousOverscrollBehavior = body.style.overscrollBehavior;

    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "contain";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && canDismiss) {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      body.style.overscrollBehavior = previousOverscrollBehavior;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canDismiss, onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Chiudi"
        onClick={canDismiss ? onClose : undefined}
        className={`absolute inset-0 ${canDismiss ? "" : "pointer-events-none"}`}
      />
      <div className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:max-h-[min(90dvh,52rem)] sm:rounded-[1.75rem]">
        <div className="sticky top-0 z-10 shrink-0 border-b border-slate-200 bg-white px-4 pb-4 pt-3 sm:px-5">
          <div className="mx-auto h-1.5 w-14 rounded-full bg-slate-200" />
          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id={titleId} className="text-lg font-semibold text-slate-950">{title}</h3>
              {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              disabled={!canDismiss}
              onClick={onClose}
              className="min-h-11 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Chiudi
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-5">
          {children}
        </div>
        {footer ? (
          <div className="sticky bottom-0 shrink-0 border-t border-slate-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:px-5">
            {footer}
          </div>
        ) : null}
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
  const [secondaryOpen, setSecondaryOpen] = useState(false);

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
  const homeTeamId = eventContext?.match.homeTeamId ?? match.homeTeamId;
  const awayTeamId = eventContext?.match.awayTeamId ?? match.awayTeamId;
  const isBusy = pendingLabel !== null;
  const isLive = state.status === "LIVE";
  const isFinished = state.status === "FINISHED";

  const ensureEventContextLoaded = async () => {
    if (eventContext) {
      return eventContext;
    }

    return refreshEventContext();
  };

  const closeSheet = () => {
    if (isBusy) {
      return;
    }

    setSheetState(null);
    setPlayerSearch("");
    setError(null);
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
      selectedTeamId === homeTeamId
        ? homePlayers
        : selectedTeamId === awayTeamId
          ? awayPlayers
          : [];

    return sourcePlayers
      .filter((player) => matchesPlayerSearch(player, playerSearch))
      .sort(comparePlayersForSheet);
  }, [awayPlayers, awayTeamId, homePlayers, homeTeamId, playerSearch, sheetState]);

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
  const latestActiveEvent = events.findLast((event) => !event.voidedAt) ?? null;

  const goalAssignmentTeamName =
    sheetState?.kind === "goal-assignment"
      ? sheetState.teamId === homeTeamId
        ? match.homeTeamName
        : match.awayTeamName
      : null;
  const latestEventTeamLabel = latestEventSummary
    ? getTeamShortLabel(latestEventSummary.teamName)
    : null;
  const playerEventSheetState =
    sheetState?.kind === "player-event" ? sheetState : null;
  const canSubmitPlayerEvent = Boolean(
    playerEventSheetState?.selectedTeamId &&
      playerEventSheetState.selectedPlayerId &&
      playerEventSheetState.selectedType,
  );
  const playerEventActionLabel = isBusy
    ? "Invio in corso…"
    : getPlayerEventActionLabel(
        playerEventSheetState?.selectedType ?? null,
        Boolean(playerEventSheetState?.editingEventId),
      );

  const handleEditLatestEvent = () => {
    if (!latestActiveEvent) {
      return;
    }

    if (latestActiveEvent.type === "GOAL" || latestActiveEvent.type === "OWN_GOAL") {
      openGoalAssignmentSheet(latestActiveEvent.id, latestActiveEvent.teamId);
      return;
    }

    openPlayerEventSheet(
      latestActiveEvent.teamId,
      latestActiveEvent.id,
      latestActiveEvent.playerId,
      latestActiveEvent.type,
    );
  };

  return (
    <section className="w-full max-w-full min-w-0 rounded-[1.6rem] border border-slate-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-sm sm:px-5 sm:pb-5 sm:pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {(match.roundLabel ?? "Partita") +
              (match.startsAt ? ` · ${formatCompactDateTimeLabel(match.startsAt)}` : "")}
          </p>
          {match.locationLabel ? (
            <p className="mt-1 text-xs text-slate-500">{match.locationLabel}</p>
          ) : null}
        </div>
        <MatchLiveIndicator status={state.status} />
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <TeamMark name={match.homeTeamName} size="sm" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {getTeamShortLabel(match.homeTeamName)}
              </p>
            </div>
            <p className="mt-2 text-sm font-semibold leading-5 text-slate-950 sm:text-base">
              {match.homeTeamName}
            </p>
          </div>

          <div className="rounded-[1.1rem] bg-slate-950 px-3 py-2 text-center text-white shadow-sm">
            <p className="text-[2rem] font-semibold leading-none tabular-nums sm:text-[2.35rem]">
              {state.homeScore}
              <span className="px-2 text-white/65">—</span>
              {state.awayScore}
            </p>
          </div>

          <div className="min-w-0 text-right">
            <div className="flex items-center justify-end gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {getTeamShortLabel(match.awayTeamName)}
              </p>
              <TeamMark name={match.awayTeamName} size="sm" />
            </div>
            <p className="mt-2 text-sm font-semibold leading-5 text-slate-950 sm:text-base">
              {match.awayTeamName}
            </p>
          </div>
        </div>

        {goalSummary.length > 0 ? (
          <div className="mt-4 border-t border-slate-200 pt-3">
            <MatchGoalSummary
              items={goalSummary}
              homeTeamId={match.homeTeamId}
              awayTeamId={match.awayTeamId}
              compact
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Casa</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-slate-950">{match.homeTeamName}</p>
          </div>
          <button
            type="button"
            disabled={!isLive || isBusy}
            onClick={() => void sendAction("decrement_home")}
            className="min-h-11 min-w-[3.2rem] rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
            aria-label={`Togli un gol a ${match.homeTeamName}`}
          >
            -1
          </button>
          <button
            type="button"
            disabled={!isLive || isBusy || !homeTeamId}
            onClick={() => handleQuickGoal(homeTeamId)}
            className="min-h-11 rounded-full bg-red-600 px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            aria-label={`Aggiungi un gol a ${match.homeTeamName}`}
          >
            + GOL
          </button>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Trasferta</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-slate-950">{match.awayTeamName}</p>
          </div>
          <button
            type="button"
            disabled={!isLive || isBusy}
            onClick={() => void sendAction("decrement_away")}
            className="min-h-11 min-w-[3.2rem] rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
            aria-label={`Togli un gol a ${match.awayTeamName}`}
          >
            -1
          </button>
          <button
            type="button"
            disabled={!isLive || isBusy || !awayTeamId}
            onClick={() => handleQuickGoal(awayTeamId)}
            className="min-h-11 rounded-full bg-red-600 px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            aria-label={`Aggiungi un gol a ${match.awayTeamName}`}
          >
            + GOL
          </button>
        </div>

        <button
          type="button"
          disabled={!isLive || isBusy}
          onClick={handleOpenPlayerEventSheet}
          className="min-h-11 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
        >
          + Evento giocatore
        </button>
      </div>

      {latestEventSummary ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ultimo evento</p>
          <p className="mt-1 text-sm font-medium leading-5 text-slate-950">
            {getEventTypeLabel(latestEventSummary.type)} · {latestEventSummary.label}
            {latestEventTeamLabel ? ` · ${latestEventTeamLabel}` : ""}
            {typeof latestEventSummary.matchMinute === "number"
              ? ` · ${latestEventSummary.matchMinute}'`
              : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {latestActiveEvent ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={handleEditLatestEvent}
                className="min-h-10 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Modifica
              </button>
            ) : null}
            {latestActiveEvent ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleVoidEvent(latestActiveEvent)}
                className="min-h-10 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
              >
                Annulla
              </button>
            ) : null}
            {!latestActiveEvent ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void sendAction("undo")}
                className="min-h-10 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Annulla ultima modifica
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2" aria-live="polite">
        {pendingLabel ? (
          <div className={`rounded-[1rem] border px-3 py-2 text-sm ${getFeedbackTone("pending")}`}>
            {pendingLabel}
          </div>
        ) : null}
        {feedback ? (
          <div className={`rounded-[1rem] border px-3 py-2 text-sm ${getFeedbackTone("success")}`}>
            {feedback}
          </div>
        ) : null}
        {error && !sheetState ? (
          <div className={`rounded-[1rem] border px-3 py-2 text-sm ${getFeedbackTone("error")}`}>
            {error}
          </div>
        ) : null}
      </div>

      {scoreReconciliation ? (
        <div className="mt-4 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <p className="font-semibold">Controllo marcatori e punteggio</p>
          <p className="mt-1 leading-5">
            Casa {state.homeScore} / eventi gol {scoreReconciliation.homeRecordedGoals}
            {scoreReconciliation.homeUnassignedGoals > 0
              ? ` · ${scoreReconciliation.homeUnassignedGoals} da assegnare`
              : ""}
          </p>
          <p className="leading-5">
            Trasferta {state.awayScore} / eventi gol {scoreReconciliation.awayRecordedGoals}
            {scoreReconciliation.awayUnassignedGoals > 0
              ? ` · ${scoreReconciliation.awayUnassignedGoals} da assegnare`
              : ""}
          </p>
          <div className="mt-3 grid gap-2">
            {scoreReconciliation.homeGoalDelta > 0 && isLive && homeTeamId ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleReconcileMissingGoals(homeTeamId)}
                className="min-h-11 rounded-[1rem] border border-amber-300 bg-white px-4 py-2 text-left text-sm font-medium text-amber-900 disabled:opacity-50"
              >
                Registra {scoreReconciliation.homeGoalDelta} gol casa mancanti
              </button>
            ) : null}
            {scoreReconciliation.awayGoalDelta > 0 && isLive && awayTeamId ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleReconcileMissingGoals(awayTeamId)}
                className="min-h-11 rounded-[1rem] border border-amber-300 bg-white px-4 py-2 text-left text-sm font-medium text-amber-900 disabled:opacity-50"
              >
                Registra {scoreReconciliation.awayGoalDelta} gol trasferta mancanti
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {state.status === "SCHEDULED" ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void sendAction("start")}
          className="mt-4 min-h-12 w-full rounded-[1.2rem] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          Avvia partita
        </button>
      ) : null}

      <details
        open={secondaryOpen}
        onToggle={(event) => {
          const isOpen = (event.currentTarget as HTMLDetailsElement).open;
          setSecondaryOpen(isOpen);

          if (isOpen && !eventContext) {
            void runTask(
              "Caricamento azioni aggiuntive...",
              async () => {
                await ensureEventContextLoaded();
              },
              { preserveFeedback: true },
            );
          }
        }}
        className="mt-4 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-50"
      >
        <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-slate-900">
          Altre azioni
        </summary>

        <div className="grid gap-5 border-t border-slate-200 px-4 py-4">
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">Correzione manuale</p>
              <p className="mt-1 text-sm text-slate-600">
                Usa questa sezione solo per riallineare il punteggio ufficiale.
              </p>
            </div>
            {scoreReconciliation &&
            (scoreReconciliation.homeGoalDelta !== 0 ||
              scoreReconciliation.awayGoalDelta !== 0 ||
              scoreReconciliation.homeUnassignedGoals > 0 ||
              scoreReconciliation.awayUnassignedGoals > 0) ? (
              <p className="rounded-[1rem] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Attenzione: il punteggio ufficiale e gli eventi gol non coincidono ancora.
              </p>
            ) : null}
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {match.homeTeamName}
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={homeInput}
                  onChange={(event) => setHomeInput(event.target.value)}
                  className="min-h-11 rounded-[1rem] border border-slate-300 px-3 py-2 text-base text-slate-900"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {match.awayTeamName}
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={awayInput}
                  onChange={(event) => setAwayInput(event.target.value)}
                  className="min-h-11 rounded-[1rem] border border-slate-300 px-3 py-2 text-base text-slate-900"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={!isLive || isBusy}
              onClick={handleSetScore}
              className="min-h-11 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Applica correzione
            </button>
          </div>

          <div className="grid gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-950">Stato partita</p>
              <p className="mt-1 text-sm text-slate-600">
                Azioni amministrative e cambi di stato non usati durante il live scoring principale.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!isLive || isBusy}
                onClick={() => void sendAction("return_to_scheduled")}
                className="min-h-11 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Riporta a programmata
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void sendAction("postpone")}
                className="min-h-11 rounded-full border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 disabled:opacity-50"
              >
                Rinvia partita
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void sendAction("cancel")}
                className="min-h-11 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
              >
                Annulla partita
              </button>
              <button
                type="button"
                disabled={!isFinished || isBusy}
                onClick={handleReopen}
                className="min-h-11 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Riapri partita
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void sendAction("undo")}
                className="min-h-11 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Annulla ultima modifica
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Cronologia eventi</p>
                <p className="mt-1 text-sm text-slate-600">
                  Modifica o annulla gli eventi senza riempire il pannello principale.
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                {events.length} eventi
              </span>
            </div>

            {events.length === 0 ? (
              <p className="rounded-[1rem] bg-white px-3 py-3 text-sm text-slate-600">
                Nessun evento giocatore registrato al momento.
              </p>
            ) : (
              <div className="grid gap-2">
                {events.map((event) => (
                  <article
                    key={event.id}
                    className={`rounded-[1rem] border px-3 py-3 ${
                      event.voidedAt
                        ? "border-slate-200 bg-slate-100 text-slate-500"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-5 text-slate-950">{event.label}</p>
                        <p className="mt-1 text-sm text-slate-600">{event.teamName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          #{event.sequence}
                          {typeof event.matchMinute === "number" ? ` · ${event.matchMinute}'` : ""}
                          {event.voidedAt ? " · annullato" : ""}
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
                              {event.playerId ? "Modifica marcatore" : "Assegna marcatore"}
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
                              Modifica evento
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
        </div>
      </details>

      {isLive ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={handleFinish}
          className="mt-4 min-h-12 w-full rounded-[1.2rem] border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          Termina partita
        </button>
      ) : null}

      {state.lastScoreUpdatedAt ? (
        <p className="mt-3 text-xs text-slate-500">
          Ultimo aggiornamento: {formatLocalizedDateTimeLabel(state.lastScoreUpdatedAt)}
        </p>
      ) : null}

      {sheetState?.kind === "goal-assignment" ? (
        <BottomSheet
          title="Chi ha segnato?"
          subtitle="Il punteggio è già stato aggiornato. Se chiudi il foglio, il gol resta da assegnare."
          canDismiss={!isBusy}
          onClose={() => {
            closeSheet();
            setFeedback("Gol lasciato come marcatore da assegnare.");
          }}
        >
          <div className="grid gap-3 pb-4">
            {goalAssignmentTeamName ? (
              <div className="rounded-[1.15rem] bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Squadra selezionata
                </p>
                <p className="mt-1 text-base font-semibold text-slate-950">{goalAssignmentTeamName}</p>
              </div>
            ) : null}

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Cerca giocatore
              <input
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

            {selectedTeamPlayers.length === 0 ? (
              <p className="rounded-[1.15rem] border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600">
                Nessun giocatore trovato per questa squadra.
              </p>
            ) : (
              <div className="grid gap-2">
                {selectedTeamPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleAssignScorer(player.id)}
                    className="min-h-12 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-900 shadow-sm disabled:opacity-50"
                  >
                    <span className="font-medium">
                      {player.jerseyNumber ? `[${player.jerseyNumber}] ` : ""}
                      {getPlayerLabel(player)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {error ? (
              <p className={`rounded-[1rem] border px-3 py-2 text-sm ${getFeedbackTone("error")}`}>
                {error}
              </p>
            ) : null}
          </div>
        </BottomSheet>
      ) : null}

      {sheetState?.kind === "player-event" ? (
        <BottomSheet
          title="Evento giocatore"
          subtitle="Seleziona squadra, giocatore ed evento. Gol e autogol aggiornano anche il punteggio ufficiale."
          canDismiss={!isBusy}
          onClose={closeSheet}
          footer={
            <div className="grid gap-3">
              {error ? (
                <p className={`rounded-[1rem] border px-3 py-2 text-sm ${getFeedbackTone("error")}`}>
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                disabled={!canSubmitPlayerEvent || isBusy}
                onClick={handleCreateOrUpdatePlayerEvent}
                className="min-h-12 w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {playerEventActionLabel}
              </button>
            </div>
          }
        >
          <div className="grid gap-4 pb-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  setSheetState((current) =>
                    current?.kind === "player-event"
                      ? {
                          ...current,
                          selectedTeamId: homeTeamId,
                          selectedPlayerId: null,
                        }
                      : current,
                  )
                }
                className={`min-h-12 rounded-full px-4 py-3 text-sm font-medium ${
                  sheetState.selectedTeamId === homeTeamId
                    ? "bg-slate-950 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                } disabled:opacity-50`}
              >
                {match.homeTeamName}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  setSheetState((current) =>
                    current?.kind === "player-event"
                      ? {
                          ...current,
                          selectedTeamId: awayTeamId,
                          selectedPlayerId: null,
                        }
                      : current,
                  )
                }
                className={`min-h-12 rounded-full px-4 py-3 text-sm font-medium ${
                  sheetState.selectedTeamId === awayTeamId
                    ? "bg-slate-950 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                } disabled:opacity-50`}
              >
                {match.awayTeamName}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["GOAL", "OWN_GOAL", "YELLOW_CARD", "RED_CARD"] as MatchPlayerEventTypeValue[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={isBusy}
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
                  } disabled:opacity-50`}
                >
                  {getEventTypeLabel(type)}
                </button>
              ))}
            </div>

            <div className="rounded-[1.15rem] bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Squadra selezionata
              </p>
              <p className="mt-1 text-base font-semibold text-slate-950">
                {sheetState.selectedTeamId === homeTeamId ? match.homeTeamName : match.awayTeamName}
              </p>
            </div>

            {selectedPlayer ? (
              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Giocatore selezionato
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {selectedPlayer.jerseyNumber ? `[${selectedPlayer.jerseyNumber}] ` : ""}
                  {getPlayerLabel(selectedPlayer)}
                  {playerEventSheetState?.selectedType
                    ? ` · ${getEventTypeLabel(playerEventSheetState.selectedType)}`
                    : ""}
                </p>
              </div>
            ) : null}

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Cerca giocatore
              <input
                type="search"
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                placeholder="Nome o numero di maglia"
                className="min-h-12 rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900"
              />
            </label>

            {selectedTeamPlayers.length === 0 ? (
              <p className="rounded-[1.15rem] border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600">
                Nessun giocatore trovato per questa squadra.
              </p>
            ) : (
              <div className="grid gap-2">
                {selectedTeamPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    disabled={isBusy}
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
                    } disabled:opacity-50`}
                  >
                    <span className="font-medium">
                      {player.jerseyNumber ? `[${player.jerseyNumber}] ` : ""}
                      {getPlayerLabel(player)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </BottomSheet>
      ) : null}
    </section>
  );
}
