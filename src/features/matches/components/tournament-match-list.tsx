import { TeamMark } from "@/components/ui/team-mark";
import { MatchLiveIndicator } from "@/features/matches/components/match-live-indicator";
import type { MatchSummary } from "@/features/matches/types/match.types";
import { formatDateTimeLabel } from "@/lib/format-date";

type TournamentMatchListProps = {
  matches: MatchSummary[];
  emptyMessage: string;
};

export function TournamentMatchList({
  matches,
  emptyMessage,
}: TournamentMatchListProps) {
  if (matches.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/75 p-6 text-sm text-slate-600 shadow-sm">
        <p className="font-medium text-slate-900">Nessun contenuto disponibile al momento.</p>
        <p className="mt-2 leading-6">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4">
      {matches.map((match) => (
        <article
          key={match.id}
          className={`rounded-[1.75rem] border p-4 shadow-sm transition-colors sm:p-5 ${
            match.status === "FINISHED"
              ? "border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)]"
              : match.status === "LIVE"
                ? "border-red-200 bg-[linear-gradient(180deg,#ffffff_0%,#fff1f2_100%)]"
                : match.status === "SCHEDULED"
                  ? "border-sky-200 bg-[linear-gradient(180deg,#ffffff_0%,#eff6ff_100%)]"
                  : "border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {match.roundLabel ?? "Partita"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {formatDateTimeLabel(match.startsAt)}
              </p>
              <p className="text-sm text-slate-500">
                {match.locationLabel ?? "Campo da definire"}
              </p>
            </div>

            <MatchLiveIndicator status={match.status} />
          </div>

          <div className="mt-4 rounded-[1.5rem] bg-white/90 px-4 py-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <div className="flex items-center gap-3">
                <TeamMark name={match.homeTeamName} />
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Casa</p>
                  <p className="mt-1 truncate text-base font-semibold text-slate-950">
                    {match.homeTeamName}
                  </p>
                </div>
              </div>

              <div
                className={`rounded-[1.35rem] px-4 py-3 text-center ${
                  match.status === "LIVE"
                    ? "bg-red-50 text-red-700"
                    : match.status === "FINISHED"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className="text-2xl font-semibold tabular-nums sm:text-3xl">
                  {match.homeScore} - {match.awayScore}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <div className="min-w-0 text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Trasferta</p>
                  <p className="mt-1 truncate text-base font-semibold text-slate-950">
                    {match.awayTeamName}
                  </p>
                </div>
                <TeamMark name={match.awayTeamName} />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm">
            <span className="font-medium text-slate-600">
              {match.status === "FINISHED"
                ? "Risultato finale"
                : match.status === "LIVE"
                  ? "Aggiornamento live"
                  : match.status === "SCHEDULED"
                    ? "Calcio d'inizio"
                    : "Stato partita"}
            </span>
            <span className="font-semibold text-slate-950">
              {match.status === "SCHEDULED"
                ? formatDateTimeLabel(match.startsAt)
                : match.status === "LIVE"
                  ? match.lastScoreUpdatedAt
                    ? `Ultimo aggiornamento ${formatDateTimeLabel(match.lastScoreUpdatedAt)}`
                    : "Diretta in corso"
                  : match.status === "POSTPONED"
                    ? "Rinvio comunicato"
                    : match.status === "CANCELLED"
                      ? "Partita annullata"
                      : `${match.homeScore} - ${match.awayScore}`}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
