import Link from "next/link";
import { notFound } from "next/navigation";

import { TournamentMatchList } from "@/features/matches/components/tournament-match-list";
import { listTournamentMatches } from "@/features/matches/server/list-tournament-matches";
import { filterPublicTournamentMatches } from "@/features/matches/server/public-match-visibility";
import { StandingsTable } from "@/features/standings/components/standings-table";
import { getTournamentGroupStandings } from "@/features/standings/server/get-tournament-group-standings";
import { getTournamentStandings } from "@/features/standings/server/get-tournament-standings";
import { getTournamentBySlug } from "@/features/tournaments/server/get-tournament-by-slug";
import { isGroupedTournamentFormat } from "@/features/tournaments/utils/tournament-format";
import { BRAND } from "@/lib/brand";

type PublicTournamentOverviewPageProps = {
  slug: string;
};

export async function PublicTournamentOverviewPage({
  slug,
}: PublicTournamentOverviewPageProps) {
  const tournament = await getTournamentBySlug(slug);

  if (!tournament) {
    notFound();
  }

  const isGroupedTournament = isGroupedTournamentFormat(tournament.format);
  const [matches, standings, groupStandings] = await Promise.all([
    listTournamentMatches(tournament.id),
    isGroupedTournament ? Promise.resolve([]) : getTournamentStandings(tournament.id),
    isGroupedTournament ? getTournamentGroupStandings(tournament.id) : Promise.resolve([]),
  ]);
  const publicMatches = filterPublicTournamentMatches(matches);
  const completedMatches = publicMatches.filter((match) => match.status === "FINAL");
  const upcomingMatches = publicMatches.filter((match) => match.status !== "FINAL");

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {BRAND.appName}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Tutto il torneo, in un colpo d&apos;occhio
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Qui trovi subito calendario, classifica, squadre partecipanti e iscrizioni. Se la fase
            finale non è ancora pubblica, continuerai a vedere solo la fase a gironi.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={`/tournaments/${slug}/register-team`}
              className={`rounded-full px-4 py-2 text-sm font-medium ${BRAND.classes.primaryButton}`}
            >
              Iscrivi la tua squadra
            </Link>
            <Link
              href={`/tournaments/${slug}/calendar`}
              className={`rounded-full px-4 py-2 text-sm font-medium ${BRAND.classes.darkButton}`}
            >
              Calendario
            </Link>
            <Link
              href={`/tournaments/${slug}/teams`}
              className={`rounded-full px-4 py-2 text-sm font-medium ${BRAND.classes.secondaryButton}`}
            >
              Squadre
            </Link>
            <Link
              href={`/tournaments/${slug}/standings`}
              className={`rounded-full px-4 py-2 text-sm font-medium ${BRAND.classes.secondaryButton}`}
            >
              Classifica
            </Link>
          </div>

          {tournament.knockoutStageIsPublic === false ? (
            <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              La fase finale sarà pubblicata dagli organizzatori al momento opportuno.
            </p>
          ) : null}
        </article>

        <div className="grid grid-cols-2 gap-4">
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Squadre pubblicate</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{tournament.teamCount}</p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Partite in programma</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{upcomingMatches.length}</p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Risultati finali</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{completedMatches.length}</p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Località</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">
              {tournament.locationLabel ?? "Da definire"}
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Stato calendario</p>
          <p className="mt-2 text-base font-semibold leading-6 text-slate-950">
            {upcomingMatches.length > 0
              ? `${upcomingMatches.length} partite ancora da giocare`
              : "Nessuna partita in programma pubblicata"}
          </p>
        </article>
        <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Risultati registrati</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {tournament.completedMatchCount}
          </p>
        </article>
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Attività partite</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{publicMatches.length}</p>
          </article>
        <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Voci in classifica</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {isGroupedTournament ? groupStandings.length : standings.length}
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                Quadro partite
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Ultimi risultati e prossime partite già visibili nella pagina pubblica del torneo.
              </p>
            </div>
            <Link
              href={`/tournaments/${slug}/calendar`}
              className="text-sm font-medium text-slate-700 hover:text-slate-950"
            >
              Vai al calendario
            </Link>
          </div>

          <div className="mt-5 grid gap-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Ultimi risultati
              </h3>
              <div className="mt-3">
                <TournamentMatchList
                  matches={completedMatches}
                  emptyMessage="Non ci sono ancora risultati finali pubblicati."
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Prossime partite
              </h3>
              <div className="mt-3">
                <TournamentMatchList
                  matches={upcomingMatches}
                  emptyMessage="Non ci sono ancora partite in programma."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                Classifica
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {isGroupedTournament
                  ? "Per i tornei a gironi la classifica completa e le qualificazioni sono disponibili nella pagina dedicata."
                  : "Ordinata con le regole standard: punti, differenza reti, gol fatti e nome squadra."}
              </p>
            </div>
            <Link
              href={`/tournaments/${slug}/standings`}
              className="text-sm font-medium text-slate-700 hover:text-slate-950"
            >
              Classifica completa
            </Link>
          </div>

          <div className="mt-5">
            {isGroupedTournament ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Le classifiche dei gironi e le qualificazioni alla fase finale sono pubblicate nella
                pagina completa della classifica.
              </div>
            ) : (
              <StandingsTable
                rows={standings}
                emptyMessage="La classifica comparirà appena saranno disponibili risultati finali."
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
