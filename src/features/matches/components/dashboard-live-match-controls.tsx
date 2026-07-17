"use client";

import { useState, useTransition } from "react";

import { TeamMark } from "@/components/ui/team-mark";
import { MatchLiveIndicator } from "@/features/matches/components/match-live-indicator";
import type { MatchSummary } from "@/features/matches/types/match.types";
import { formatDateTimeLabel } from "@/lib/format-date";

type DashboardLiveMatchControlsProps = {
  match: MatchSummary;
};

type MatchControlState = Pick<
  MatchSummary,
  "status" | "homeScore" | "awayScore" | "scoreVersion" | "lastScoreUpdatedAt"
>;

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

  return (
    <section className="w-full max-w-full min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-5">
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
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">{match.homeTeamName}</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={!isLive || isPending}
              onClick={() => sendAction("decrement_home")}
              className="min-h-12 rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              -1
            </button>
            <button
              type="button"
              disabled={!isLive || isPending}
              onClick={() => sendAction("increment_home")}
              className="min-h-12 flex-1 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              +1 Goal
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">{match.awayTeamName}</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={!isLive || isPending}
              onClick={() => sendAction("decrement_away")}
              className="min-h-12 rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              -1
            </button>
            <button
              type="button"
              disabled={!isLive || isPending}
              onClick={() => sendAction("increment_away")}
              className="min-h-12 flex-1 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              +1 Goal
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] bg-white p-4 shadow-sm">
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
            disabled={!isLive || isPending}
            onClick={handleSetScore}
            className="min-h-12 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Imposta punteggio
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={state.status !== "SCHEDULED" || isPending}
          onClick={() => sendAction("start")}
          className="min-h-12 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Start Match
        </button>
        <button
          type="button"
          disabled={!isLive || isPending}
          onClick={handleFinish}
          className="min-h-12 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Finish Match
        </button>
        <button
          type="button"
          disabled={!isLive || isPending}
          onClick={() => sendAction("return_to_scheduled")}
          className="min-h-12 rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Return to Scheduled
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => sendAction("postpone")}
          className="min-h-12 rounded-full border border-amber-300 px-5 py-3 text-sm font-medium text-amber-800 disabled:opacity-50"
        >
          Postpone
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => sendAction("cancel")}
          className="min-h-12 rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!isFinished || isPending}
          onClick={handleReopen}
          className="min-h-12 rounded-full border border-red-300 px-5 py-3 text-sm font-medium text-red-700 disabled:opacity-50"
        >
          Reopen Match
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => sendAction("undo")}
          className="min-h-12 rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Undo Last Change
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm">
        {state.lastScoreUpdatedAt ? (
          <p className="text-slate-500">
            Ultimo aggiornamento: {formatDateTimeLabel(state.lastScoreUpdatedAt)}
          </p>
        ) : null}
        {feedback ? <p className="text-emerald-700">{feedback}</p> : null}
        {error ? <p className="text-red-700">{error}</p> : null}
      </div>
    </section>
  );
}
