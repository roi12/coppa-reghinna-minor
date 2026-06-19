import { reportTournamentMatchResultAction } from "@/features/matches/server/match-actions";
import type { MatchSummary } from "@/features/matches/types/match.types";
import { formatDateTimeLabel } from "@/lib/format-date";

type DashboardMatchResultsPanelProps = {
  matches: MatchSummary[];
  tournamentSlug: string;
};

export function DashboardMatchResultsPanel({
  matches,
  tournamentSlug,
}: DashboardMatchResultsPanelProps) {
  if (matches.length === 0) {
    return (
      <p className="mt-5 text-sm text-slate-600">
        Non ci sono ancora partite create per questo torneo.
      </p>
    );
  }

  return (
    <div className="mt-5 grid w-full max-w-full min-w-0 gap-4">
      {matches.map((match) => {
        const isCompleted = match.status === "FINAL";
        const isLive = match.status === "LIVE";

        return (
          <section
            key={match.id}
            className="w-full max-w-full min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-5"
          >
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
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                  isCompleted
                    ? "bg-emerald-100 text-emerald-800"
                    : isLive
                      ? "bg-sky-100 text-sky-800"
                      : "bg-amber-100 text-amber-800"
                }`}
              >
                {isCompleted ? "Finale" : isLive ? "In corso" : "In programma"}
              </span>
            </div>

            <div className="mt-4 grid w-full max-w-full min-w-0 gap-3 rounded-2xl bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
              <div className="min-w-0 text-base font-semibold text-slate-950 sm:text-right">
                {match.homeTeamName}
              </div>
              <div
                className={`w-full max-w-full min-w-0 rounded-2xl px-4 py-2 text-center text-sm font-semibold sm:w-auto ${
                  isCompleted ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-900"
                }`}
              >
                {match.homeScore !== null && match.awayScore !== null
                  ? `${match.homeScore} - ${match.awayScore}`
                  : "vs"}
              </div>
              <div className="min-w-0 text-base font-semibold text-slate-950">
                {match.awayTeamName}
              </div>
            </div>

            <form
              action={reportTournamentMatchResultAction}
              className="mt-5 grid w-full max-w-full min-w-0 gap-4"
            >
              <input type="hidden" name="matchId" value={match.id} />
              <input type="hidden" name="tournamentSlug" value={tournamentSlug} />

              <div className="grid w-full max-w-full min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto] xl:items-end">
                <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                  Stato partita
                  <select
                  name="status"
                  defaultValue={match.status}
                  className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                >
                  <option value="SCHEDULED">In programma</option>
                  <option value="LIVE">In corso</option>
                  <option value="FINAL">Finale</option>
                </select>
              </label>
                <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                  Gol squadra casa
                  <input
                    type="number"
                    min="0"
                    name="homeScore"
                    defaultValue={match.homeScore ?? ""}
                    className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                  />
                </label>
                <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                  Gol squadra ospite
                  <input
                    type="number"
                    min="0"
                    name="awayScore"
                    defaultValue={match.awayScore ?? ""}
                    className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full max-w-full min-w-0 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white sm:w-fit xl:justify-self-start"
                >
                  Salva risultato
                </button>
              </div>

              <p className="text-sm text-slate-500">
                Imposta la partita come in corso o finale per registrare il punteggio e aggiornare la vista pubblica.
              </p>
            </form>
          </section>
        );
      })}
    </div>
  );
}
