import { notFound } from "next/navigation";

import { listTeamPlayers } from "@/features/players/server/list-team-players";
import { PublicTournamentTeamRosterGrid } from "@/features/teams/components/public-tournament-team-roster-grid";
import { listTournamentTeams } from "@/features/teams/server/list-tournament-teams";
import { getTournamentBySlug } from "@/features/tournaments/server/get-tournament-by-slug";

type PublicTournamentTeamsPageProps = {
  slug: string;
  highlightedTeamId?: string | null;
};

export async function PublicTournamentTeamsPage({
  slug,
  highlightedTeamId,
}: PublicTournamentTeamsPageProps) {
  const tournament = await getTournamentBySlug(slug);

  if (!tournament) {
    notFound();
  }

  const teams = await listTournamentTeams(tournament.id);
  const rosters = await Promise.all(
    teams.map(async (team) => ({
      team,
      players: await listTeamPlayers(team.id),
    })),
  );
  const totalPlayers = rosters.reduce((sum, roster) => sum + roster.players.length, 0);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Squadre partecipanti
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Scopri le squadre partecipanti e le loro rose pubbliche.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Le schede mostrano le rose già pubblicate. Anche da mobile puoi controllare rapidamente
            giocatori e numeri di maglia.
          </p>
        </article>

        <div className="grid grid-cols-2 gap-4">
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Squadre</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{rosters.length}</p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Giocatori elencati</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{totalPlayers}</p>
          </article>
        </div>
      </section>

      {rosters.length === 0 ? (
        <section className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/75 p-6 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-900">Non ci sono ancora squadre pubblicate.</p>
          <p className="mt-2 leading-6">
            Torna qui dopo l&apos;approvazione e la pubblicazione delle squadre partecipanti.
          </p>
        </section>
      ) : (
        <PublicTournamentTeamRosterGrid
          rosters={rosters}
          highlightedTeamId={highlightedTeamId}
        />
      )}
    </div>
  );
}
