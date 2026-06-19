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
            Nuovo torneo
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Crea un torneo</h2>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-950">
          Torna alla dashboard
        </Link>
      </div>

      <FeedbackBanner feedback={feedback} />

      {organizations.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Non ci sono ancora organizzazioni disponibili. Crea prima un&apos;organizzazione per aprire un nuovo torneo.
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <form action={createTournamentAction} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Organizzazione
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
                Nome torneo
                <input
                  name="name"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="Coppa Reghinna Minor 2026"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Slug
                <input
                  name="slug"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="coppa-reghinna-minor-2026"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Sport
                <input
                  name="sport"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="Calcio a 5"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Etichetta stagione
                <input
                  name="seasonLabel"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="Estate 2026"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Formula torneo
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
                  Scegli la formula da usare per impostazioni, gironi, calendario e pagine pubbliche.
                </span>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Località
                <input
                  name="locationLabel"
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="Maiori"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Data inizio
                <input
                  type="date"
                  name="startsAt"
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Data fine
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
                Crea torneo in bozza
              </button>
              <p className="text-sm text-slate-500">
                I nuovi tornei partono in bozza finché non vengono pubblicati.
              </p>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
