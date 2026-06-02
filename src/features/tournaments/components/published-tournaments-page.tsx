import Image from "next/image";
import Link from "next/link";

import { listPublishedTournaments } from "@/features/tournaments/server/list-published-tournaments";
import { getTournamentFormatLabel } from "@/features/tournaments/utils/tournament-format";
import { BRAND } from "@/lib/brand";
import { formatDateRangeLabel } from "@/lib/format-date";

export async function PublishedTournamentsPage() {
  const tournaments = await listPublishedTournaments();

  return (
    <main className={`min-h-screen px-4 py-10 text-slate-950 sm:px-6 sm:py-14 ${BRAND.classes.pageBackground}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-300 bg-white/95 shadow-sm">
          <div className={`grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr] ${BRAND.classes.heroBackground}`}>
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-3 shadow-sm">
              <Image
                src={BRAND.logoPath}
                alt={BRAND.appName}
                width={92}
                height={92}
                className="h-20 w-20 object-contain sm:h-24 sm:w-24"
              />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${BRAND.classes.accentText}`}>
                {BRAND.sport}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {BRAND.appName}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 sm:text-base">
                {BRAND.tagline}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Consulta i tornei pubblicati, verifica calendario e risultati, e trova subito la
                pagina di iscrizione dedicata ai capitani.
              </p>
            </div>
          </div>
        </section>

        {tournaments.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-sm text-slate-600">
            Al momento non ci sono tornei pubblicati. Riprova più tardi oppure carica i dati
            locali di esempio in ambiente di sviluppo.
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {tournaments.map((tournament) => (
              <article
                key={tournament.id}
                className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  <span>{tournament.sport}</span>
                  <span>{tournament.seasonLabel}</span>
                  <span>{getTournamentFormatLabel(tournament.format)}</span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">{tournament.name}</h2>
                <p className="mt-2 text-sm text-slate-600">{tournament.organizationName}</p>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Date</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {formatDateRangeLabel(tournament.startsAt, tournament.endsAt)}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Località</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {tournament.locationLabel ?? "Da definire"}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Formula</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {getTournamentFormatLabel(tournament.format)}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Squadre</dt>
                    <dd className="mt-1 font-medium text-slate-900">{tournament.teamCount}</dd>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Partite</dt>
                    <dd className="mt-1 font-medium text-slate-900">{tournament.matchCount}</dd>
                  </div>
                </dl>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/tournaments/${tournament.slug}`}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${BRAND.classes.primaryButton}`}
                  >
                    Apri torneo
                  </Link>
                  <Link
                    href={`/tournaments/${tournament.slug}/calendar`}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${BRAND.classes.secondaryButton}`}
                  >
                    Vedi calendario
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
