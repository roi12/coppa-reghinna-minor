import { manuallyResolveTournamentKnockoutParticipantsAction } from "@/features/tournaments/server/tournament-competition-actions";
import type {
  QualificationResolutionSnapshot,
  QualificationResolutionSlot,
} from "@/features/tournaments/server/qualification-resolution";

type DashboardTournamentQualificationResolutionPanelProps = {
  tournamentId: string;
  tournamentSlug: string;
  resolutionSnapshot: QualificationResolutionSnapshot;
};

export function DashboardTournamentQualificationResolutionPanel({
  tournamentId,
  tournamentSlug,
  resolutionSnapshot,
}: DashboardTournamentQualificationResolutionPanelProps) {
  const unresolvedSlots = resolutionSnapshot.unresolvedSlots.filter((slot) => !slot.locked);
  const lockedSlots = resolutionSnapshot.unresolvedSlots.filter((slot) => slot.locked);

  if (resolutionSnapshot.warningMessage) {
    return (
      <div className="mt-4 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-medium text-amber-950">Attenzione sulla qualificazione</p>
        <p className="mt-2 leading-6">{resolutionSnapshot.warningMessage}</p>
      </div>
    );
  }

  type GroupBlock = {
    groupId: string;
    groupName: string;
    positions: Array<{
      position: number;
      slots: QualificationResolutionSlot[];
    }>;
  };

  if (unresolvedSlots.length === 0) {
    return (
      <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Nessuna posizione qualificante è bloccata da un pareggio.</p>
        <p className="mt-2 leading-6">
          Quando una classifica arriva in parità sulla soglia di qualificazione, appariranno qui le posizioni da assegnare manualmente.
        </p>
        {lockedSlots.length > 0 ? (
          <p className="mt-2 leading-6">
            {lockedSlots.length} {lockedSlots.length === 1 ? "posizione" : "posizioni"} sono già confermate e non verranno sovrascritte automaticamente.
          </p>
        ) : null}
      </div>
    );
  }

  const groupsMap = new Map<string, GroupBlock>();

  for (const slot of unresolvedSlots) {
    const group = groupsMap.get(slot.groupId) ?? {
      groupId: slot.groupId,
      groupName: slot.groupName,
      positions: [],
    };

    const positionEntry = group.positions.find((entry) => entry.position === slot.position);

    if (positionEntry) {
      positionEntry.slots.push(slot);
    } else {
      group.positions.push({
        position: slot.position,
        slots: [slot],
      });
    }

    groupsMap.set(slot.groupId, group);
  }

  const groups = Array.from(groupsMap.values()).sort((left, right) =>
    left.groupName.localeCompare(right.groupName, undefined, { sensitivity: "base" }),
  );

  return (
    <div className="mt-4 grid gap-4">
      <form action={manuallyResolveTournamentKnockoutParticipantsAction} className="grid gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="tournamentSlug" value={tournamentSlug} />

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-900">
            Risoluzione manuale delle qualificazioni
          </h4>
          <p className="mt-2 text-sm text-amber-900">
            Seleziona la squadra corretta per ogni posizione in parità e conferma l&apos;operazione. Le assegnazioni già bloccate non verranno modificate.
          </p>
        </div>

        <div className="grid gap-4">
          {groups.map((group) => (
            <section key={group.groupId} className="rounded-3xl border border-amber-200 bg-white p-4">
              <h5 className="text-base font-semibold text-slate-950">{group.groupName}</h5>
              <div className="mt-3 grid gap-3">
                {group.positions
                  .slice()
                  .sort((left, right) => left.position - right.position)
                  .map(({ position, slots }) => (
                    <div key={`${group.groupId}:${position}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          Posizione {position}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {slots[0]?.candidateTeams.map((team) => team.teamName).join(", ")}
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.45fr)] md:items-end">
                        {slots.map((slot) => (
                          <div key={`${slot.matchId}:${slot.side}`} className="grid gap-2">
                            <input type="hidden" name="assignmentMatchId" value={slot.matchId} />
                            <input type="hidden" name="assignmentSide" value={slot.side} />
                            <label className="grid gap-2 text-sm font-medium text-slate-700">
                              {slot.matchLabel} · {slot.side === "home" ? "Casa" : "Trasferta"}
                              <select
                                name="assignmentTeamId"
                                defaultValue={slot.currentTeamId ?? slot.candidateTeams[0]?.teamId ?? ""}
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                              >
                                {slot.candidateTeams.map((team) => (
                                  <option key={team.teamId} value={team.teamId}>
                                    {team.teamName}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {slot.locked ? (
                              <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">
                                Confermata manualmente
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-white px-4 py-3 text-sm font-medium text-slate-700">
          <input type="checkbox" name="manualConfirmation" value="CONFIRMED" required className="mt-1" />
          Confermo la risoluzione manuale delle posizioni selezionate.
        </label>

        <button
          type="submit"
          className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white sm:w-fit"
        >
          Salva qualificazioni manuali
        </button>
      </form>
    </div>
  );
}
