type DashboardTournamentGenerationFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  tournamentId: string;
  tournamentSlug: string;
  isReady: boolean;
};

export function DashboardTournamentGenerationForm({
  action,
  tournamentId,
  tournamentSlug,
  isReady,
}: DashboardTournamentGenerationFormProps) {
  const formId = `generate-competition-structure-${tournamentId}`;

  return (
    <form
      id={formId}
      action={action}
      className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5"
    >
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="tournamentSlug" value={tournamentSlug} />

      <div>
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Generazione struttura
        </h4>
        <p className="mt-2 text-sm text-slate-600">
          Crea la struttura gestita del torneo solo quando impostazioni e gironi risultano validi.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Gestione partite esistenti
        <select
          form={formId}
          name="replacementMode"
          defaultValue="BLOCK_ON_EXISTING"
          disabled={!isReady}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="BLOCK_ON_EXISTING">Blocca se esistono già partite</option>
          <option value="REPLACE_MANAGED_SCHEDULED">Sostituisci solo le partite generate e non concluse</option>
          <option value="REPLACE_LEGACY_SCHEDULED">Sostituisci solo le partite legacy non concluse</option>
        </select>
      </label>

      <button
        type="submit"
        form={formId}
        disabled={!isReady}
        className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-fit"
      >
        Genera struttura del torneo
      </button>
    </form>
  );
}
