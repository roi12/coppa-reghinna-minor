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
          Generate structure
        </h4>
        <p className="mt-2 text-sm text-slate-600">
          Builds the managed 31-match structure only after the saved settings and group
          assignments are valid.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Existing match handling
        <select
          form={formId}
          name="replacementMode"
          defaultValue="BLOCK_ON_EXISTING"
          disabled={!isReady}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="BLOCK_ON_EXISTING">Block if matches already exist</option>
          <option value="REPLACE_MANAGED_SCHEDULED">Replace generated scheduled matches only</option>
          <option value="REPLACE_LEGACY_SCHEDULED">Replace legacy scheduled matches only</option>
        </select>
      </label>

      <button
        type="submit"
        form={formId}
        disabled={!isReady}
        className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-fit"
      >
        Generate competition structure
      </button>
    </form>
  );
}
