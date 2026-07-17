import { notFound } from "next/navigation";

import { TournamentScorerStandings } from "@/features/matches/components/tournament-scorer-standings";
import { listPublicTournamentScorers } from "@/features/matches/server/match-player-events";
import { getTournamentBySlug } from "@/features/tournaments/server/get-tournament-by-slug";

type PublicTournamentScorersPageProps = {
  slug: string;
};

export async function PublicTournamentScorersPage({
  slug,
}: PublicTournamentScorersPageProps) {
  const tournament = await getTournamentBySlug(slug);

  if (!tournament) {
    notFound();
  }

  const scorers = await listPublicTournamentScorers(slug);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Classifica marcatori</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            La classifica ufficiale conta i gol attivi delle partite concluse. Gli autogol e i marcatori non ancora assegnati non vengono sommati al totale personale.
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            In caso di parità l&apos;ordine resta deterministico: gol, nome giocatore, ID giocatore.
          </p>
        </article>

        <div className="grid grid-cols-2 gap-4">
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Giocatori in classifica</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{scorers.length}</p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Capocannoniere</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">
              {scorers[0] ? `${scorers[0].playerName} · ${scorers[0].goals} gol` : "Nessun gol valido registrato"}
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
        <TournamentScorerStandings
          rows={scorers}
          emptyMessage="La classifica marcatori comparirà appena saranno disponibili partite concluse con marcatori assegnati."
        />
      </section>
    </div>
  );
}
