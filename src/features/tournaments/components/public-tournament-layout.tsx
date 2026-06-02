import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getTournamentBySlug } from "@/features/tournaments/server/get-tournament-by-slug";
import { getTournamentFormatLabel } from "@/features/tournaments/utils/tournament-format";
import { BRAND } from "@/lib/brand";
import { formatDateRangeLabel } from "@/lib/format-date";

import { PublicShareLink } from "./public-share-link";
import { PublicTournamentNav } from "./public-tournament-nav";

const publicTournamentStatusLabels = {
  DRAFT: "bozza",
  PUBLISHED: "pubblicato",
  COMPLETED: "concluso",
} as const;

type PublicTournamentLayoutProps = {
  slug: string;
  children: ReactNode;
};

export async function PublicTournamentLayout({
  slug,
  children,
}: PublicTournamentLayoutProps) {
  const tournament = await getTournamentBySlug(slug);

  if (!tournament) {
    notFound();
  }

  return (
    <main className={`min-h-screen px-3 py-4 text-slate-950 sm:px-6 sm:py-10 ${BRAND.classes.pageBackground}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
        <Link
          href="/tournaments"
          className="w-fit rounded-full bg-white/85 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:text-slate-950"
        >
          Torna ai tornei
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-slate-300 bg-white/94 shadow-sm">
          <div className={`p-5 sm:p-8 ${BRAND.classes.heroBackground}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex max-w-3xl items-start gap-4">
                <div className="shrink-0 overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white/95 p-3 shadow-sm">
                  <Image
                    src={BRAND.logoPath}
                    alt={BRAND.appName}
                    width={72}
                    height={72}
                    className="h-14 w-14 object-contain sm:h-16 sm:w-16"
                  />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold uppercase tracking-[0.26em] sm:text-sm ${BRAND.classes.accentText}`}>
                    {BRAND.appName}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 sm:text-sm">
                    {tournament.organizationName}
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {tournament.name}
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base">
                    {BRAND.tagline}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                    {tournament.sport} · {tournament.seasonLabel} ·{" "}
                    {getTournamentFormatLabel(tournament.format)} ·{" "}
                    {formatDateRangeLabel(tournament.startsAt, tournament.endsAt)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
                    <span className={`rounded-full px-3 py-1 shadow-sm ${BRAND.classes.accentBadge}`}>
                      Stato: {publicTournamentStatusLabels[tournament.status]}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                      Formula: {getTournamentFormatLabel(tournament.format)}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                      Località: {tournament.locationLabel ?? "Da definire"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <PublicShareLink
                  path={`/tournaments/${slug}`}
                  title={`Pagina torneo ${tournament.name}`}
                />
                <Link
                  href={`/tournaments/${slug}/calendar`}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${BRAND.classes.primaryButton}`}
                >
                  Vedi calendario
                </Link>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white px-4 py-3 text-left shadow-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Squadre</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{tournament.teamCount}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-left shadow-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Partite</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{tournament.matchCount}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-left shadow-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Risultati finali</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">
                  {tournament.completedMatchCount}
                </p>
              </div>
              <div className="min-w-0 rounded-2xl bg-white px-4 py-3 text-left shadow-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Contatto</p>
                <p className="mt-1 min-w-0 break-words text-sm font-medium text-slate-700">
                  {BRAND.supportContact.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{BRAND.supportContact.note}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white/95 p-4 sm:p-6">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Naviga il torneo
              </p>
              <PublicTournamentNav slug={slug} />
            </div>
          </div>
        </section>

        <section>{children}</section>
      </div>
    </main>
  );
}
