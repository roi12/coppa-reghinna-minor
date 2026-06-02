import Link from "next/link";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { listOrganizations } from "@/features/organizations/server/list-organizations";
import { createTournamentAction } from "@/features/tournaments/server/tournament-actions";
import { TOURNAMENT_FORMAT_VALUES } from "@/features/tournaments/types/tournament-format.types";
import { getTournamentFormatLabel } from "@/features/tournaments/utils/tournament-format";
import type { DashboardFeedback } from "@/lib/dashboard-feedback";

type DashboardNewTournamentPageProps = {
  feedback: DashboardFeedback | null;
};

export async function DashboardNewTournamentPage({
  feedback,
}: DashboardNewTournamentPageProps) {
  const organizations = await listOrganizations();

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
            Tournament Setup
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Create a tournament</h2>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-950">
          Back to dashboard
        </Link>
      </div>

      <FeedbackBanner feedback={feedback} />

      {organizations.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
          No organizations are available. Seed the local database before creating tournaments.
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <form action={createTournamentAction} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Organization
                <select
                  name="organizationId"
                  required
                  defaultValue={organizations[0]?.id}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                >
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Tournament name
                <input
                  name="name"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="Summer League 2026"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Slug
                <input
                  name="slug"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="summer-league-2026"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Sport
                <input
                  name="sport"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="Football"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Season label
                <input
                  name="seasonLabel"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="Summer 2026"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Tournament format
                <select
                  name="format"
                  required
                  defaultValue="ROUND_ROBIN"
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                >
                  {TOURNAMENT_FORMAT_VALUES.map((format) => (
                    <option key={format} value={format}>
                      {getTournamentFormatLabel(format)}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-normal leading-5 text-slate-500">
                  Round-robin scheduling is available now. Knockout and combined formats are
                  scaffolded for later phases.
                </span>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Location
                <input
                  name="locationLabel"
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="Harbor City"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Start date
                <input
                  type="date"
                  name="startsAt"
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                End date
                <input
                  type="date"
                  name="endsAt"
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
              >
                Create draft tournament
              </button>
              <p className="text-sm text-slate-500">
                New tournaments start in draft status until you publish them.
              </p>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
