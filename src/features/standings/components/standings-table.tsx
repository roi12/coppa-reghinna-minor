import type { StandingRow } from "@/features/standings/types/standings.types";

type StandingsTableProps = {
  rows: StandingRow[];
  emptyMessage: string;
};

export function StandingsTable({ rows, emptyMessage }: StandingsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/75 p-6 text-sm text-slate-600 shadow-sm">
        <p className="font-medium text-slate-900">La classifica non è ancora disponibile.</p>
        <p className="mt-2 leading-6">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:hidden">
        {rows.map((row, index) => (
          <article
            key={row.teamId}
            className="rounded-[1.75rem] border border-slate-300 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Posizione #{index + 1}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">{row.teamName}</h3>
              </div>
              <div className="rounded-2xl bg-slate-950 px-3 py-2 text-right text-white">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Punti</p>
                <p className="text-xl font-semibold">{row.points}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-2xl bg-slate-50 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Giocate</p>
                <p className="mt-1 font-semibold text-slate-950">{row.played}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Bilancio</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {row.wins}-{row.draws}-{row.losses}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">DR</p>
                <p className="mt-1 font-semibold text-slate-950">{row.goalDifference}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Gol fatti</p>
                <p className="mt-1 font-semibold text-slate-950">{row.goalsFor}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Gol subiti</p>
                <p className="mt-1 font-semibold text-slate-950">{row.goalsAgainst}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Vittorie</p>
                <p className="mt-1 font-semibold text-slate-950">{row.wins}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-[1.75rem] border border-slate-300 bg-white shadow-sm md:block">
        <table className="min-w-[760px] text-sm text-slate-700">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Squadra</th>
              <th className="px-4 py-3 text-center">P</th>
              <th className="px-4 py-3 text-center">V</th>
              <th className="px-4 py-3 text-center">N</th>
              <th className="px-4 py-3 text-center">S</th>
              <th className="px-4 py-3 text-center">GF</th>
              <th className="px-4 py-3 text-center">GA</th>
              <th className="px-4 py-3 text-center">DR</th>
              <th className="px-4 py-3 text-center">Pt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.teamId} className="border-t border-slate-200">
                <td className="px-4 py-3 font-semibold text-slate-950">{index + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-950">{row.teamName}</td>
                <td className="px-4 py-3 text-center">{row.played}</td>
                <td className="px-4 py-3 text-center">{row.wins}</td>
                <td className="px-4 py-3 text-center">{row.draws}</td>
                <td className="px-4 py-3 text-center">{row.losses}</td>
                <td className="px-4 py-3 text-center">{row.goalsFor}</td>
                <td className="px-4 py-3 text-center">{row.goalsAgainst}</td>
                <td className="px-4 py-3 text-center">{row.goalDifference}</td>
                <td className="px-4 py-3 text-center font-semibold text-slate-950">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
