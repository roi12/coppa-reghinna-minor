import { notFound } from "next/navigation";

import { StandingsTable } from "@/features/standings/components/standings-table";
import { getTournamentGroupStandings } from "@/features/standings/server/get-tournament-group-standings";
import { getTournamentStandings } from "@/features/standings/server/get-tournament-standings";
import { getTournamentBySlug } from "@/features/tournaments/server/get-tournament-by-slug";
import { isGroupedTournamentFormat } from "@/features/tournaments/utils/tournament-format";

type PublicTournamentStandingsPageProps = {
  slug: string;
};

export async function PublicTournamentStandingsPage({
  slug,
}: PublicTournamentStandingsPageProps) {
  const tournament = await getTournamentBySlug(slug);

  if (!tournament) {
    notFound();
  }

  const isGroupedTournament = isGroupedTournamentFormat(tournament.format);
  const [standings, groupStandings] = await Promise.all([
    isGroupedTournament ? Promise.resolve(null) : getTournamentStandings(tournament.id),
    isGroupedTournament ? getTournamentGroupStandings(tournament.id) : Promise.resolve(null),
  ]);
  const leader = standings?.[0];
  const underfilledGroups = groupStandings?.filter((group) => group.teamCount < 2) ?? [];
  const totalGroupedTeams =
    groupStandings?.reduce((count, group) => count + group.teamCount, 0) ?? 0;
  const totalGroupedMatches =
    groupStandings?.reduce((count, group) => count + group.playedMatchCount, 0) ?? 0;

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Classifica</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isGroupedTournament
              ? "Ogni girone ha una classifica separata ordinata per punti, differenza reti, gol fatti e nome squadra."
              : "Le squadre sono ordinate per punti, differenza reti, gol fatti e nome squadra."}
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Legenda: P = partite, V = vittorie, N = pareggi, S = sconfitte, GF = gol fatti, GA = gol subiti, DR = differenza reti, Pt = punti.
          </p>
        </article>

        <div className="grid grid-cols-2 gap-4">
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              {isGroupedTournament ? "Gironi" : "Squadre classificate"}
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {isGroupedTournament ? groupStandings?.length ?? 0 : standings?.length ?? 0}
            </p>
          </article>
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              {isGroupedTournament ? "Squadre inserite" : "Capolista"}
            </p>
            {isGroupedTournament ? (
              <p className="mt-2 text-3xl font-semibold text-slate-950">{totalGroupedTeams}</p>
            ) : (
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">
                {leader ? leader.teamName : "Nessuna capolista al momento"}
              </p>
            )}
          </article>
        </div>
      </section>

      {isGroupedTournament ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Gironi configurati</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {groupStandings?.length ?? 0}
              </p>
            </article>
            <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Squadre inserite</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{totalGroupedTeams}</p>
            </article>
            <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Risultati finali</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{totalGroupedMatches}</p>
            </article>
            <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Formula</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">
                Le classifiche dei gironi si aggiornano in modo indipendente.
              </p>
            </article>
          </section>

          {groupStandings && groupStandings.length === 0 ? (
            <section className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/92 p-6 text-sm text-slate-600 shadow-sm">
              <p className="font-medium text-slate-900">I gironi non sono ancora stati configurati.</p>
              <p className="mt-2 leading-6">
                L&apos;organizzazione deve ancora creare i gironi del torneo prima di poter pubblicare
                qui le classifiche separate.
              </p>
            </section>
          ) : (
            <>
              {underfilledGroups.length > 0 ? (
                <section className="rounded-[1.75rem] border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
                  <p className="font-medium">Alcuni gironi non sono ancora completi.</p>
                  <p className="mt-2 leading-6">
                    {underfilledGroups.length === 1
                      ? `${underfilledGroups[0].groupName} ha attualmente meno di 2 squadre, quindi la sua classifica può restare limitata finché il girone non viene completato.`
                      : `${underfilledGroups.length} gironi hanno attualmente meno di 2 squadre, quindi le relative classifiche possono restare limitate finché non vengono completati.`}
                  </p>
                </section>
              ) : null}

              <div className="grid gap-6">
                {groupStandings?.map((group) => (
                  <section
                    key={group.groupId}
                    className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                          {group.groupName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {group.teamCount} squadre · {group.playedMatchCount} partite concluse
                        </p>
                      </div>
                      <span className="text-sm text-slate-500">Aggiornata solo con i risultati finali</span>
                    </div>

                    <div className="mt-5">
                      <StandingsTable
                        rows={group.rows}
                        emptyMessage={`La classifica di ${group.groupName} comparirà appena saranno disponibili risultati finali.`}
                      />
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <section className="rounded-[1.75rem] border border-slate-300 bg-white/92 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">Classifica completa</h3>
              <p className="mt-1 text-sm text-slate-600">
                Da mobile trovi una vista a schede; sugli schermi più larghi compare la tabella completa.
              </p>
            </div>
            <span className="text-sm text-slate-500">Aggiornata solo con i risultati finali</span>
          </div>

          <div className="mt-5">
            <StandingsTable
              rows={standings ?? []}
              emptyMessage="La classifica comparirà appena saranno disponibili risultati finali."
            />
          </div>
        </section>
      )}
    </div>
  );
}
