"use client";

import { useState, useTransition } from "react";

import { TeamMark } from "@/components/ui/team-mark";
import { MatchLiveIndicator } from "@/features/matches/components/match-live-indicator";
import type { MatchSummary } from "@/features/matches/types/match.types";
import { parseOptionalDate } from "@/lib/parse-date";

type DashboardLiveMatchControlsProps = {
  match: MatchSummary;
};

type MatchControlState = Pick<
  MatchSummary,
  "status" | "homeScore" | "awayScore" | "scoreVersion" | "lastScoreUpdatedAt"
>;

const organizerDateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Rome",
});

const primaryGoalButtonClass =
  "min-h-11 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition enabled:hover:bg-red-500 disabled:opacity-50";
const secondaryActionButtonClass =
  "min-h-11 rounded-full border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition enabled:hover:border-slate-400 enabled:hover:bg-slate-50 disabled:opacity-50";
const utilityActionButtonClass =
  "min-h-10 rounded-full border px-3.5 py-2 text-sm font-medium transition disabled:opacity-50";

async function readLatestMatchState(matchId: string): Promise<MatchControlState> {
  const response = await fetch(`/api/dashboard/matches/${matchId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to refresh the latest match state.");
  }

  const payload = (await response.json()) as MatchControlState;

  return {
    ...payload,
    lastScoreUpdatedAt: payload.lastScoreUpdatedAt ? new Date(payload.lastScoreUpdatedAt) : null,
  };
}

function buildTeamAbbreviation(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.slice(0, 3))
    .join(" ")
    .toUpperCase();
}

function formatOrganizerMatchDateTime(date: Date | string | null | undefined) {
  const validDate = parseOptionalDate(date);

  return validDate ? organizerDateTimeFormatter.format(validDate).replace(",", " •") : "Data da definire";
}

export function DashboardLiveMatchControls({ match }: DashboardLiveMatchControlsProps) {
  const [state, setState] = useState<MatchControlState>({
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    scoreVersion: match.scoreVersion,
    lastScoreUpdatedAt: match.lastScoreUpdatedAt,
  });
  const [homeInput, setHomeInput] = useState(String(match.homeScore));
  const [awayInput, setAwayInput] = useState(String(match.awayScore));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const syncLatestState = async () => {
    const latestState = await readLatestMatchState(match.id);
    setState(latestState);
    setHomeInput(String(latestState.homeScore));
    setAwayInput(String(latestState.awayScore));
  };

  const sendAction = (
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
    setFeedback(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/matches/${match.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            expectedScoreVersion: state.scoreVersion,
            ...nextPayload,
          }),
        });

        const payload = (await response.json()) as
          | (MatchControlState & { lastScoreUpdatedAt: string | null })
          | { error?: string; code?: string };

        if (!response.ok) {
          if (response.status === 409) {
            await syncLatestState();
          }

          throw new Error(("error" in payload ? payload.error : undefined) ?? "Unable to update the match.");
        }

        const nextState = {
          ...payload,
          lastScoreUpdatedAt:
            "lastScoreUpdatedAt" in payload && payload.lastScoreUpdatedAt
              ? new Date(payload.lastScoreUpdatedAt)
              : null,
        } as MatchControlState;

        setState(nextState);
        setHomeInput(String(nextState.homeScore));
        setAwayInput(String(nextState.awayScore));
        setFeedback("Aggiornamento salvato.");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to update the match.");
      }
    });
  };

  const handleFinish = () => {
    if (window.confirm("Confermi la chiusura della partita?")) {
      sendAction("finish");
    }
  };

  const handleReopen = () => {
    if (window.confirm("Riaprire una partita conclusa è un'azione esplicita. Continuare?")) {
      sendAction("reopen", { confirmReopen: true });
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

    sendAction("set_score", {
      homeScore: nextHomeScore,
      awayScore: nextAwayScore,
    });
  };

  const isLive = state.status === "LIVE";
  const isFinished = state.status === "FINISHED";
  const homeAbbreviation = buildTeamAbbreviation(match.homeTeamName);
  const awayAbbreviation = buildTeamAbbreviation(match.awayTeamName);

  return (
    <section className="w-full max-w-full min-w-0 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {match.roundLabel ?? "Partita"}
          </p>
          <p className="text-sm font-medium leading-5 text-slate-900">
            {formatOrganizerMatchDateTime(match.startsAt)}
          </p>
          <p className="truncate text-xs leading-5 text-slate-500">
            {match.locationLabel ?? "Campo da definire"}
          </p>
        </div>

        <div className="shrink-0">
          <MatchLiveIndicator status={state.status} />
        </div>
      </div>

      <div className="mt-3 rounded-[1.5rem] bg-white px-3.5 py-4 shadow-sm sm:px-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <TeamMark name={match.homeTeamName} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Casa
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">{homeAbbreviation}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950 px-3.5 py-2 text-center text-white shadow-sm">
            <p className="text-[1.65rem] font-semibold leading-none tabular-nums sm:text-4xl">
              {state.homeScore} - {state.awayScore}
            </p>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2.5">
            <div className="min-w-0 text-right">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Trasferta
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">{awayAbbreviation}</p>
            </div>
            <TeamMark name={match.awayTeamName} size="sm" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm leading-5">
          <p className="min-w-0 text-left font-medium text-slate-800">{match.homeTeamName}</p>
          <p className="min-w-0 text-right font-medium text-slate-800">{match.awayTeamName}</p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs sm:text-sm">
          <span className="font-medium uppercase tracking-[0.14em] text-slate-500">
            {match.status === "FINISHED"
              ? "Finale"
              : match.status === "LIVE"
                ? "Aggiornamento"
                : match.status === "SCHEDULED"
                  ? "Calcio d'inizio"
                  : "Stato partita"}
          </span>
          <span className="min-w-0 truncate text-right font-semibold text-slate-900">
            {match.status === "SCHEDULED"
              ? formatOrganizerMatchDateTime(match.startsAt)
              : match.status === "LIVE"
                ? state.lastScoreUpdatedAt
                  ? `Agg. ${formatOrganizerMatchDateTime(state.lastScoreUpdatedAt)}`
                  : "Diretta in corso"
                : match.status === "POSTPONED"
                  ? "Partita rinviata"
                  : match.status === "CANCELLED"
                    ? "Partita annullata"
                    : `${state.homeScore} - ${state.awayScore}`}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        <div className="rounded-[1.35rem] bg-white px-3.5 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Casa</p>
              <p className="truncate text-sm font-semibold text-slate-900">{match.homeTeamName}</p>
            </div>
            <button
              type="button"
              disabled={!isLive || isPending}
              onClick={() => sendAction("decrement_home")}
              className={`${secondaryActionButtonClass} shrink-0`}
            >
              -1
            </button>
            <button
              type="button"
              disabled={!isLive || isPending}
              onClick={() => sendAction("increment_home")}
              className={`${primaryGoalButtonClass} min-w-[7.75rem] shrink-0`}
            >
              +1 Goal
            </button>
          </div>
        </div>

        <div className="rounded-[1.35rem] bg-white px-3.5 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Trasferta
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">{match.awayTeamName}</p>
            </div>
            <button
              type="button"
              disabled={!isLive || isPending}
              onClick={() => sendAction("decrement_away")}
              className={`${secondaryActionButtonClass} shrink-0`}
            >
              -1
            </button>
            <button
              type="button"
              disabled={!isLive || isPending}
              onClick={() => sendAction("increment_away")}
              className={`${primaryGoalButtonClass} min-w-[7.75rem] shrink-0`}
            >
              +1 Goal
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-[1.35rem] bg-white px-3.5 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Correzione rapida
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Usa questi campi solo per rettifiche manuali del punteggio.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="grid gap-1.5 text-xs font-medium text-slate-600">
            Casa
            <input
              type="number"
              min="0"
              value={homeInput}
              onChange={(event) => setHomeInput(event.target.value)}
              className="min-h-10 rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-600">
            Ospite
            <input
              type="number"
              min="0"
              value={awayInput}
              onChange={(event) => setAwayInput(event.target.value)}
              className="min-h-10 rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <button
            type="button"
            disabled={!isLive || isPending}
            onClick={handleSetScore}
            className="min-h-10 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition enabled:hover:bg-slate-800 disabled:opacity-50"
          >
            Applica
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
        <button
          type="button"
          disabled={state.status !== "SCHEDULED" || isPending}
          onClick={() => sendAction("start")}
          className="min-h-11 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-emerald-500 disabled:opacity-50"
        >
          Start Match
        </button>
        <button
          type="button"
          disabled={!isLive || isPending}
          onClick={handleFinish}
          className="min-h-11 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-slate-800 disabled:opacity-50"
        >
          Finish Match
        </button>
        <button
          type="button"
          disabled={!isLive || isPending}
          onClick={() => sendAction("return_to_scheduled")}
          className={secondaryActionButtonClass}
        >
          Return to Scheduled
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => sendAction("postpone")}
          className={`${utilityActionButtonClass} border-amber-300 text-amber-800 enabled:hover:bg-amber-50`}
        >
          Postpone
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => sendAction("cancel")}
          className={`${utilityActionButtonClass} border-slate-300 text-slate-700 enabled:hover:bg-slate-50`}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!isFinished || isPending}
          onClick={handleReopen}
          className={`${utilityActionButtonClass} border-red-300 text-red-700 enabled:hover:bg-red-50`}
        >
          Reopen Match
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => sendAction("undo")}
          className={`${utilityActionButtonClass} col-span-2 border-slate-300 text-slate-700 enabled:hover:bg-slate-50 sm:col-auto`}
        >
          Undo Last Change
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 text-xs sm:text-sm">
        {state.lastScoreUpdatedAt ? (
          <p className="text-slate-500">
            Ultimo aggiornamento: {formatOrganizerMatchDateTime(state.lastScoreUpdatedAt)}
          </p>
        ) : null}
        {feedback ? <p className="text-emerald-700">{feedback}</p> : null}
        {error ? <p className="text-red-700">{error}</p> : null}
      </div>
    </section>
  );
}
