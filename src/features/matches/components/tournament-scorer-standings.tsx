import type { TournamentScorerStandingRow } from "@/features/matches/types/match-player-events.types";

type TournamentScorerStandingsProps = {
  rows: TournamentScorerStandingRow[];
  emptyMessage: string;
};

export function TournamentScorerStandings({
  rows,
  emptyMessage,
}: TournamentScorerStandingsProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/75 p-6 text-sm text-slate-600 shadow-sm">
        <p className="font-medium text-slate-900">La classifica marcatori non è ancora disponibile.</p>
        <p className="mt-2 leading-6">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <article
            key={row.playerId}
            className="rounded-[1.35rem] border border-slate-300 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Posizione
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-950">
                    {row.position}
                  </span>
                  <h3 className="min-w-0 text-base font-semibold text-slate-950">{row.playerName}</h3>
                </div>
                <p className="mt-2 text-sm text-slate-600">{row.teamName}</p>
              </div>
              <div className="rounded-[1rem] bg-slate-950 px-3 py-2 text-center text-white">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Gol</p>
                <p className="text-xl font-semibold">{row.goals}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium">
                Ammonizioni {row.yellowCards}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium">
                Espulsioni {row.redCards}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-[1.75rem] border border-slate-300 bg-white shadow-sm md:block">
        <table className="min-w-[680px] text-sm text-slate-700">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Giocatore</th>
              <th className="px-4 py-3 text-left">Squadra</th>
              <th className="px-4 py-3 text-center">Gol</th>
              <th className="px-4 py-3 text-center">Ammon.</th>
              <th className="px-4 py-3 text-center">Espuls.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId} className="border-t border-slate-200">
                <td className="px-4 py-3 font-semibold text-slate-950">{row.position}</td>
                <td className="px-4 py-3 font-medium text-slate-950">{row.playerName}</td>
                <td className="px-4 py-3">{row.teamName}</td>
                <td className="px-4 py-3 text-center font-semibold text-slate-950">{row.goals}</td>
                <td className="px-4 py-3 text-center">{row.yellowCards}</td>
                <td className="px-4 py-3 text-center">{row.redCards}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
