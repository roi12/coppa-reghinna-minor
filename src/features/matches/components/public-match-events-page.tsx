import Link from "next/link";
import { notFound } from "next/navigation";

import { MatchGoalSummary } from "@/features/matches/components/match-goal-summary";
import { MatchPlayerEventTimeline } from "@/features/matches/components/match-player-event-timeline";
import { TeamMark } from "@/components/ui/team-mark";
import { listPublicMatchPlayerEvents } from "@/features/matches/server/match-player-events";
import { getPublicTournamentLiveState } from "@/features/tournaments/server/get-public-tournament-live-state";
import { formatDateTimeLabel } from "@/lib/format-date";

type PublicMatchEventsPageProps = {
  slug: string;
  matchId: string;
};

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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {match.roundLabel ?? "Partita"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Cronologia eventi
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {formatDateTimeLabel(match.startsAt)}
              {match.locationLabel ? ` · ${match.locationLabel}` : ""}
            </p>
          </div>

          <Link
            href={`/tournaments/${slug}/calendar`}
            className="text-sm font-medium text-slate-700 hover:text-slate-950"
          >
            Torna al calendario
          </Link>
        </div>

        <div className="mt-5 rounded-[1.5rem] bg-slate-50 px-4 py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <div className="flex items-center gap-3">
              <TeamMark name={match.homeTeamName} />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Casa</p>
                <p className="truncate text-base font-semibold text-slate-950">{match.homeTeamName}</p>
              </div>
            </div>
            <div className="rounded-[1.35rem] bg-slate-950 px-4 py-3 text-center text-white">
              <p className="text-3xl font-semibold tabular-nums">
                {match.homeScore} - {match.awayScore}
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

          {match.goalSummary.length > 0 ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <MatchGoalSummary
                items={match.goalSummary}
                homeTeamId={match.homeTeamId}
                awayTeamId={match.awayTeamId}
              />
            </div>
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
