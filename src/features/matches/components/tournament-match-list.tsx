import { TeamMark } from "@/components/ui/team-mark";
import { MatchLiveIndicator } from "@/features/matches/components/match-live-indicator";
import type { MatchSummary } from "@/features/matches/types/match.types";
import { parseOptionalDate } from "@/lib/parse-date";

type TournamentMatchListProps = {
  matches: MatchSummary[];
  emptyMessage: string;
};

const publicDateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Rome",
});

function formatPublicMatchDateTime(date: Date | string | null | undefined) {
  const validDate = parseOptionalDate(date);

  return validDate ? publicDateTimeFormatter.format(validDate).replace(",", " •") : "Data da definire";
}

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
      {matches.map((match) => {
        return (
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
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {match.roundLabel ?? "Partita"}
                </p>
                <p className="mt-1 text-sm font-medium leading-5 text-slate-900">
                  {formatPublicMatchDateTime(match.startsAt)}
                </p>
                <p className="truncate text-xs leading-5 text-slate-500">
                  {match.locationLabel ?? "Campo da definire"}
                </p>
              </div>

              <div className="shrink-0">
                <MatchLiveIndicator status={match.status} />
              </div>
            </div>

            <div className="mt-3 rounded-[1.5rem] bg-white/90 px-3.5 py-4 sm:px-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5 sm:gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <TeamMark name={match.homeTeamName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Casa
                    </p>
                  </div>
                </div>

                <div
                  className={`rounded-2xl px-3.5 py-2 text-center ${
                    match.status === "LIVE"
                      ? "bg-red-50 text-red-700"
                      : match.status === "FINISHED"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <p className="text-[1.65rem] font-semibold leading-none tabular-nums sm:text-3xl">
                    {match.homeScore} - {match.awayScore}
                  </p>
                </div>

                <div className="flex min-w-0 items-center justify-end gap-2.5">
                  <div className="min-w-0 text-right">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Trasferta
                    </p>
                  </div>
                  <TeamMark name={match.awayTeamName} size="sm" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm leading-5">
                <p className="min-w-0 text-left font-medium text-slate-800">{match.homeTeamName}</p>
                <p className="min-w-0 text-right font-medium text-slate-800">{match.awayTeamName}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3.5 py-2.5 text-xs sm:px-4 sm:text-sm">
              <span className="font-medium uppercase tracking-[0.14em] text-slate-500">
                {match.status === "FINISHED"
                  ? "Finale"
                  : match.status === "LIVE"
                    ? "Aggiornamento"
                    : match.status === "SCHEDULED"
                      ? "Calcio d'inizio"
                      : "Stato partita"}
              </span>
              <span className="min-w-0 truncate text-right font-semibold text-slate-950">
                {match.status === "SCHEDULED"
                  ? formatPublicMatchDateTime(match.startsAt)
                  : match.status === "LIVE"
                    ? match.lastScoreUpdatedAt
                      ? `Agg. ${formatPublicMatchDateTime(match.lastScoreUpdatedAt)}`
                      : "Diretta in corso"
                    : match.status === "POSTPONED"
                      ? "Rinvio comunicato"
                      : match.status === "CANCELLED"
                        ? "Partita annullata"
                        : `${match.homeScore} - ${match.awayScore}`}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
