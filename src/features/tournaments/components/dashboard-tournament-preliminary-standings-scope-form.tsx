"use client";

import { useFormStatus } from "react-dom";

import type { PreliminaryStandingsScope } from "@/features/standings/server/preliminary-standings";
import { updateTournamentPreliminaryStandingsScopeAction } from "@/features/tournaments/server/preliminary-standings-scope-actions";

type DashboardTournamentPreliminaryStandingsScopeFormProps = {
  tournamentId: string;
  tournamentSlug: string;
  currentScope: PreliminaryStandingsScope;
  finishedPreliminaryMatchCount: number;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Salvataggio in corso..." : "Salva formato classifica"}
    </button>
  );
}

export function DashboardTournamentPreliminaryStandingsScopeForm({
  tournamentId,
  tournamentSlug,
  currentScope,
  finishedPreliminaryMatchCount,
}: DashboardTournamentPreliminaryStandingsScopeFormProps) {
  return (
    <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Formato classifica preliminare</h3>
          <p className="mt-2 text-sm text-slate-600">
            I gironi possono essere utilizzati per organizzare il calendario senza dividere la classifica.
          </p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
          {currentScope === "GLOBAL" ? "Classifica generale" : "Classifiche per girone"}
        </span>
      </div>

      <form
        action={updateTournamentPreliminaryStandingsScopeAction}
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          const form = event.currentTarget;
          const nextScope = new FormData(form).get("standingsScope");

          if (
            finishedPreliminaryMatchCount > 0 &&
            nextScope !== currentScope &&
            !window.confirm(
              "Questa modifica cambia il modo in cui vengono calcolate classifica e qualificazione, ma non modifica calendario o risultati.",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="tournamentSlug" value={tournamentSlug} />

        <div className="grid gap-3">
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <input
              type="radio"
              name="standingsScope"
              value="GLOBAL"
              defaultChecked={currentScope === "GLOBAL"}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-slate-950">Classifica generale</span>
              <span className="mt-1 block text-slate-600">
                Somma tutte le partite concluse della fase preliminare in un&apos;unica tabella.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <input
              type="radio"
              name="standingsScope"
              value="GROUPS"
              defaultChecked={currentScope === "GROUPS"}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-slate-950">
                Classifiche separate per girone
              </span>
              <span className="mt-1 block text-slate-600">
                Mantiene una tabella indipendente per ogni girone competitivo della fase preliminare.
              </span>
            </span>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Cambia il criterio con cui vengono interpretate classifica e qualificazione, ma non modifica calendario, gironi, partite, squadre o risultati.
        </div>

        {finishedPreliminaryMatchCount > 0 ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Sono già presenti {finishedPreliminaryMatchCount} risultati finali nella fase preliminare. Prima del salvataggio verrà richiesta una conferma esplicita.
          </div>
        ) : null}

        <SubmitButton />
      </form>
    </article>
  );
}
