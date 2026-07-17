"use client";

import { StandingsTable } from "@/features/standings/components/standings-table";
import { usePublicTournamentLiveState } from "@/features/tournaments/components/use-public-tournament-live-state";
import type { PublicTournamentLiveStateTransport } from "@/features/tournaments/types/public-tournament-live-state.types";
import { isGroupedTournamentFormat } from "@/features/tournaments/utils/tournament-format";

type PublicTournamentLiveStandingsProps = {
  slug: string;
  initialState: PublicTournamentLiveStateTransport;
};

export function PublicTournamentLiveStandings({
  slug,
  initialState,
}: PublicTournamentLiveStandingsProps) {
  const { state, connectionStatus, errorMessage } = usePublicTournamentLiveState(slug, initialState);
  const isGroupedTournament = isGroupedTournamentFormat(state.tournament.format);
  const leader = state.standings[0];
  const underfilledGroups = state.groupStandings.filter((group) => group.teamCount < 2);
  const totalGroupedTeams = state.groupStandings.reduce((count, group) => count + group.teamCount, 0);
  const totalGroupedMatches = state.groupStandings.reduce(
    (count, group) => count + group.playedMatchCount,
    0,
  );

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
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">
            {connectionStatus === "connected"
              ? "Aggiornamento live attivo"
              : connectionStatus === "reconnecting"
                ? "Connessione live in ripristino"
                : connectionStatus === "polling"
                  ? "Aggiornamento automatico ogni 5 secondi"
                  : "Connessione live in avvio"}
          </p>
          {errorMessage ? <p className="mt-2 text-sm text-amber-700">{errorMessage}</p> : null}
        </article>

        <div className="grid grid-cols-2 gap-4">
          <article className="rounded-[1.75rem] border border-slate-300 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              {isGroupedTournament ? "Gironi" : "Squadre classificate"}
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {isGroupedTournament ? state.groupStandings.length : state.standings.length}
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
                {state.groupStandings.length}
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

          {state.groupStandings.length === 0 ? (
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
                {state.groupStandings.map((group) => (
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
              rows={state.standings}
              emptyMessage="La classifica comparirà appena saranno disponibili risultati finali."
            />
          </div>
        </section>
      )}
    </div>
  );
}
