import { notFound } from "next/navigation";

import { listTeamPlayers } from "@/features/players/server/list-team-players";
import { listTournamentTeams } from "@/features/teams/server/list-tournament-teams";
import { getTournamentBySlug } from "@/features/tournaments/server/get-tournament-by-slug";

type PublicTournamentTeamsPageProps = {
  slug: string;
};

export async function PublicTournamentTeamsPage({
  slug,
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
            Consulta le rose pubbliche di tutte le squadre del torneo.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Le schede squadra seguono il seed del torneo quando disponibile. Anche da mobile la
            lista giocatori resta leggibile senza passaggi extra.
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
        <section className="grid gap-4 xl:grid-cols-2">
          {rosters.map(({ team, players }) => (
            <article
              key={team.id}
              className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    {team.seed ? `Testa di serie ${team.seed}` : "Squadra qualificata"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {team.name}
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                  {team.playerCount} giocatori
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {players.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    Nessuna rosa pubblica disponibile per questa squadra.
                  </div>
                ) : (
                  players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-950">
                          {player.displayName ?? `${player.firstName} ${player.lastName}`}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                          {player.firstName} {player.lastName}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700">
                        #{player.jerseyNumber ?? "-"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
