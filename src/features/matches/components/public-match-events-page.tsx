import Link from "next/link";
import { notFound } from "next/navigation";

import { MatchGoalSummary } from "@/features/matches/components/match-goal-summary";
import { MatchPlayerEventTimeline } from "@/features/matches/components/match-player-event-timeline";
import { TeamMark } from "@/components/ui/team-mark";
import { listPublicMatchPlayerEvents } from "@/features/matches/server/match-player-events";
import { getPublicTournamentLiveState } from "@/features/tournaments/server/get-public-tournament-live-state";
import {
  formatCompactDateTimeLabel,
  formatLocalizedDateTimeLabel,
} from "@/lib/format-date";

type PublicMatchEventsPageProps = {
  slug: string;
  matchId: string;
};

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

export async function PublicMatchEventsPage({
  slug,
  matchId,
}: PublicMatchEventsPageProps) {
  const state = await getPublicTournamentLiveState(slug);

  if (!state) {
    notFound();
  }

  const match = state.matches.find((entry) => entry.id === matchId);

  if (!match) {
    notFound();
  }

  const events = await listPublicMatchPlayerEvents(slug, matchId).catch(() => null);

  if (!events) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {(match.roundLabel ?? "Partita") +
                (match.startsAt ? ` · ${formatCompactDateTimeLabel(match.startsAt)}` : "")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Cronologia eventi
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {match.locationLabel ?? "Campo da definire"}
            </p>
          </div>

          <Link
            href={`/tournaments/${slug}/calendar`}
            className="text-sm font-medium text-slate-700 hover:text-slate-950"
          >
            Torna al calendario
          </Link>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-3 py-4 sm:px-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
            <div className="grid justify-items-start gap-2">
              <TeamMark name={match.homeTeamName} size="sm" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {getTeamShortLabel(match.homeTeamName)}
                </p>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-950">
                  {match.homeTeamName}
                </p>
              </div>
            </div>

            <div className="rounded-[1.15rem] bg-slate-950 px-3 py-2.5 text-center text-white">
              <p className="text-[2rem] font-semibold leading-none tabular-nums sm:text-3xl">
                {match.homeScore}
                <span className="px-2 text-white/65">-</span>
                {match.awayScore}
              </p>
            </div>

            <div className="grid justify-items-end gap-2 text-right">
              <TeamMark name={match.awayTeamName} size="sm" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {getTeamShortLabel(match.awayTeamName)}
                </p>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-950">
                  {match.awayTeamName}
                </p>
              </div>
            </div>
          </div>

          {match.goalSummary.length > 0 ? (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <MatchGoalSummary
                items={match.goalSummary}
                homeTeamId={match.homeTeamId}
                awayTeamId={match.awayTeamId}
                compact
              />
            </div>
          ) : null}

          {match.lastScoreUpdatedAt ? (
            <p className="mt-3 text-xs text-slate-500">
              Ultimo aggiornamento: {formatLocalizedDateTimeLabel(match.lastScoreUpdatedAt)}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">Timeline completa</h3>
            <p className="mt-1 text-sm text-slate-600">
              Sono mostrati solo gli eventi attivi, nell&apos;ordine in cui sono stati registrati.
            </p>
          </div>
          <span className="text-sm text-slate-500">{events.length} eventi</span>
        </div>

        <div className="mt-5">
          <MatchPlayerEventTimeline
            events={events}
            emptyMessage="Questa partita non ha ancora una cronologia pubblica disponibile."
          />
        </div>
      </section>
    </div>
  );
}
