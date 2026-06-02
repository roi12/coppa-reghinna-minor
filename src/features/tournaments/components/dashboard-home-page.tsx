import Link from "next/link";

import { listOrganizations } from "@/features/organizations/server/list-organizations";
import { listDashboardTournaments } from "@/features/tournaments/server/list-dashboard-tournaments";
import { getTournamentFormatLabel } from "@/features/tournaments/utils/tournament-format";
import { formatDateRangeLabel } from "@/lib/format-date";

export async function DashboardHomePage() {
  const [organizations, tournaments] = await Promise.all([
    listOrganizations(),
    listDashboardTournaments(),
  ]);

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
              Organizer Dashboard
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Manage tournaments, teams, players, and manual match schedules.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              The organizer slice now supports tournament creation, tournament editing, roster
              updates, and manual fixture entry using the current Prisma-backed data model.
            </p>
          </div>
          <Link
            href="/dashboard/tournaments/new"
            className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
          >
            Create tournament
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Organizations</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{organizations.length}</p>
        </article>
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Tournaments</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{tournaments.length}</p>
        </article>
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Published</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {tournaments.filter((tournament) => tournament.status === "PUBLISHED").length}
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold tracking-tight">Tournament workspace</h3>
          <span className="text-sm text-slate-500">{tournaments.length} records</span>
        </div>

        {tournaments.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            No tournaments have been created yet. Start with the tournament creation form.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {tournaments.map((tournament) => (
              <article
                key={tournament.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  <span>{tournament.organizationName}</span>
                  <span>{tournament.status.toLowerCase()}</span>
                </div>
                <h4 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  {tournament.name}
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  {tournament.sport} · {tournament.seasonLabel} ·{" "}
                  {getTournamentFormatLabel(tournament.format)}
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  {formatDateRangeLabel(tournament.startsAt, tournament.endsAt)}
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                  <span>{tournament.teamCount} teams</span>
                  <span>{tournament.matchCount} matches</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/tournaments/${tournament.slug}`}
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                  >
                    Manage
                  </Link>
                  <Link
                    href={`/tournaments/${tournament.slug}`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Open public page
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
