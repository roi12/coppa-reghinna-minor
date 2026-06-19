import { notFound } from "next/navigation";

import { listTournamentMatches } from "@/features/matches/server/list-tournament-matches";
import { filterPublicTournamentMatches } from "@/features/matches/server/public-match-visibility";
import { getTournamentBySlug } from "@/features/tournaments/server/get-tournament-by-slug";

import { TournamentMatchList } from "./tournament-match-list";

type PublicTournamentCalendarPageProps = {
  slug: string;
};

export async function PublicTournamentCalendarPage({
  slug,
}: PublicTournamentCalendarPageProps) {
  const tournament = await getTournamentBySlug(slug);

  if (!tournament) {
    notFound();
  }

  const matches = filterPublicTournamentMatches(await listTournamentMatches(tournament.id));
  const completedMatches = matches.filter((match) => match.status === "FINAL");
  const scheduledMatches = matches.filter((match) => match.status !== "FINAL");

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Calendario del torneo</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Le partite create automaticamente o inserite a mano sono elencate in ordine
            cronologico. Gli orari sono mostrati in UTC per mantenere un calendario pubblico
            coerente.
          </p>
        </article>

        <div className="grid grid-cols-2 gap-4">
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">In programma</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{scheduledMatches.length}</p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Finali</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{completedMatches.length}</p>
          </article>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">Tutte le partite</h3>
            <p className="mt-1 text-sm text-slate-600">
              Partite finali e partite in programma restano nella stessa sequenza temporale.
            </p>
          </div>
          <span className="text-sm text-slate-500">{matches.length} partite elencate</span>
        </div>

        <div className="mt-5">
          <TournamentMatchList
            matches={matches}
            emptyMessage="Non ci sono ancora partite programmate per questo torneo."
          />
        </div>
      </section>
    </div>
  );
}
