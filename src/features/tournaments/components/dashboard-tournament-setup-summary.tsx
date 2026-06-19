import type { TournamentSetupState } from "@/features/tournaments/server/dashboard-tournament-setup";

type DashboardTournamentSetupSummaryProps = {
  setupState: TournamentSetupState;
};

function renderStatusTone(status: string) {
  switch (status) {
    case "COMPLETE":
      return "bg-emerald-100 text-emerald-800";
    case "LOCKED":
    case "INVALID":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

export function DashboardTournamentSetupSummary({
  setupState,
}: DashboardTournamentSetupSummaryProps) {
  return (
    <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Tournament setup status</h3>
          <p className="mt-2 text-sm text-slate-600">
            Follow the setup lifecycle in order: settings, groups, structure, calendar, then results.
          </p>
        </div>
        <span className="w-fit rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
          Next: {setupState.nextAllowedAction}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Competition settings</p>
          <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${renderStatusTone(setupState.settings.status)}`}>
            {setupState.settings.status}
          </p>
        </article>
        <article className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Groups</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {setupState.groups.assignedTeamCount} / {setupState.groups.expectedTeamCount ?? 0} assigned
          </p>
          <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${renderStatusTone(setupState.groups.status)}`}>
            {setupState.groups.status}
          </p>
        </article>
        <article className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Groups valid</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {setupState.groups.isValid ? "Yes" : "No"}
          </p>
        </article>
        <article className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Matches generated</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {setupState.structure.generatedMatchCount} / {setupState.structure.expectedMatchCount}
          </p>
        </article>
        <article className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Calendar scheduled</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {setupState.calendar.scheduledMatchCount} / {setupState.calendar.expectedMatchCount}
          </p>
        </article>
      </div>
    </article>
  );
}
