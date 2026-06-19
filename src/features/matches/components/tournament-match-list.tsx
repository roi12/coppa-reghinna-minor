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
            match.status === "FINAL"
              ? "border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)]"
              : match.status === "LIVE"
                ? "border-sky-200 bg-[linear-gradient(180deg,#ffffff_0%,#eff6ff_100%)]"
              : "border-amber-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffbeb_100%)]"
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

            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                match.status === "FINAL"
                  ? "bg-emerald-100 text-emerald-800"
                  : match.status === "LIVE"
                    ? "bg-sky-100 text-sky-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {match.status === "FINAL" ? "Finale" : match.status === "LIVE" ? "In corso" : "In programma"}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-white/90 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Casa</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">{match.homeTeamName}</p>
                </div>
                <span
                  className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                    match.status === "FINAL"
                      ? "bg-emerald-50 text-emerald-800"
                      : match.status === "LIVE"
                        ? "bg-sky-50 text-sky-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {match.homeScore ?? (match.status === "FINAL" ? "0" : "-")}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-white/90 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Trasferta</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">{match.awayTeamName}</p>
                </div>
                <span
                  className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                    match.status === "FINAL"
                      ? "bg-emerald-50 text-emerald-800"
                      : match.status === "LIVE"
                        ? "bg-sky-50 text-sky-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {match.awayScore ?? (match.status === "FINAL" ? "0" : "-")}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm">
            <span className="font-medium text-slate-600">
              {match.status === "FINAL"
                ? "Risultato"
                : match.status === "LIVE"
                  ? "Diretta"
                  : "Stato partita"}
            </span>
            <span className="font-semibold text-slate-950">
              {match.homeScore !== null && match.awayScore !== null
                ? `${match.homeScore} - ${match.awayScore}`
                : "In attesa del calcio d'inizio"}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
