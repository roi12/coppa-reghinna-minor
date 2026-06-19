import {
  autoAssignTournamentGroupsAction,
} from "@/features/tournaments/server/tournament-competition-actions";
import { saveTournamentGroupAssignmentsAction } from "@/features/groups/server/group-actions";
import type {
  TournamentGroupTeamSummary,
  TournamentGroupsSnapshot,
} from "@/features/groups/types/group.types";

type DashboardTournamentGroupsPanelProps = {
  tournamentId: string;
  tournamentSlug: string;
  attachedTeamCount: number;
  groupsSnapshot: TournamentGroupsSnapshot;
  expectedGroupCount: number;
  expectedTeamsPerGroup: number;
  status: "BLOCKED" | "INCOMPLETE" | "COMPLETE" | "INVALID";
  issues: string[];
  isDisabled: boolean;
  expectedTeamCount: number | null;
};

type ManualAssignmentRow = TournamentGroupTeamSummary & {
  assignedGroupId: string;
  assignedGroupName: string | null;
};

function compareManualAssignmentRows(left: ManualAssignmentRow, right: ManualAssignmentRow) {
  const leftSeed = left.seed ?? Number.MAX_SAFE_INTEGER;
  const rightSeed = right.seed ?? Number.MAX_SAFE_INTEGER;

  if (leftSeed !== rightSeed) {
    return leftSeed - rightSeed;
  }

  const teamNameComparison = left.name.localeCompare(right.name, undefined, {
    sensitivity: "base",
  });

  if (teamNameComparison !== 0) {
    return teamNameComparison;
  }

  return left.createdAt.getTime() - right.createdAt.getTime();
}

function renderGroupStatusLabel(
  status: DashboardTournamentGroupsPanelProps["status"],
) {
  switch (status) {
    case "BLOCKED":
      return "Bloccato";
    case "INCOMPLETE":
      return "Incompleto";
    case "COMPLETE":
      return "Completo";
    case "INVALID":
      return "Non valido";
  }
}

export function DashboardTournamentGroupsPanel({
  tournamentId,
  tournamentSlug,
  attachedTeamCount,
  groupsSnapshot,
  expectedGroupCount,
  expectedTeamsPerGroup,
  status,
  issues,
  isDisabled,
  expectedTeamCount,
}: DashboardTournamentGroupsPanelProps) {
  const configuredCapacity = expectedGroupCount * expectedTeamsPerGroup;
  const groupsReady = groupsSnapshot.groups.length === expectedGroupCount;
  const underfilledGroups = groupsSnapshot.groups.filter(
    (group) => group.teams.length < expectedTeamsPerGroup,
  );
  const manualAssignmentRows = [
    ...groupsSnapshot.groups.flatMap((group) =>
      group.teams.map((team) => ({
        ...team,
        assignedGroupId: group.id,
        assignedGroupName: group.name,
      })),
    ),
    ...groupsSnapshot.unassignedTeams.map((team) => ({
      ...team,
      assignedGroupId: "",
      assignedGroupName: null,
    })),
  ].sort(compareManualAssignmentRows);

  return (
    <div className="mt-5 grid w-full max-w-full min-w-0 gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-lg font-semibold tracking-tight text-slate-950">2. Assegnazione gironi</h4>
          <p className="mt-1 text-sm text-slate-600">
            Assegna le squadre ai gironi salvati dopo aver confermato le impostazioni del torneo.
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
            status === "COMPLETE"
              ? "bg-emerald-100 text-emerald-800"
              : status === "INVALID"
                ? "bg-rose-100 text-rose-800"
                : "bg-amber-100 text-amber-800"
          }`}
        >
          {renderGroupStatusLabel(status)}
        </span>
      </div>

      <div className="grid w-full max-w-full min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Squadre collegate</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{attachedTeamCount}</p>
        </div>
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Gironi creati</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {groupsSnapshot.existingGroupCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Squadre assegnate</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {groupsSnapshot.assignedTeamCount} / {expectedTeamCount ?? attachedTeamCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Gironi</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {groupsSnapshot.existingGroupCount} / {expectedGroupCount}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Attese per girone</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{expectedTeamsPerGroup}</p>
        </div>
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Squadre non assegnate</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {groupsSnapshot.unassignedTeamCount}
          </p>
        </div>
      </div>

      <div className="grid w-full max-w-full min-w-0 gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        <p>
          I gironi dipendono dalle impostazioni salvate. Cambiare le assegnazioni non modifica le partite finché la struttura non viene rigenerata.
        </p>
        <p>
          La configurazione corrente prevede {expectedGroupCount} gironi da {expectedTeamsPerGroup}{" "}
          squadre, per un totale di {configuredCapacity} squadre nel torneo.
        </p>
      </div>

      {status === "BLOCKED" ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          L&apos;assegnazione dei gironi si sblocca quando le impostazioni sono complete e i gironi salvati corrispondono alla configurazione corrente.
        </div>
      ) : null}

      {issues.length > 0 ? (
        <div className="grid gap-3 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          {issues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      ) : null}

      {groupsReady ? (
        <div className="grid gap-4 md:grid-cols-2">
          <form action={autoAssignTournamentGroupsAction} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5">
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="tournamentSlug" value={tournamentSlug} />
            <input type="hidden" name="assignmentMode" value="SEEDED" />
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Assegna automaticamente
              </h4>
              <p className="mt-2 text-sm text-slate-600">
                Riempie i gironi configurati seguendo l&apos;ordine delle teste di serie e gli slot disponibili.
              </p>
            </div>
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-fit"
            >
              Applica distribuzione per teste di serie
            </button>
          </form>

          <form action={autoAssignTournamentGroupsAction} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5">
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="tournamentSlug" value={tournamentSlug} />
            <input type="hidden" name="assignmentMode" value="RANDOMIZE" />
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Mescola i gironi
              </h4>
              <p className="mt-2 text-sm text-slate-600">
                Ricrea le assegnazioni in modo casuale. Non elimina automaticamente le partite.
              </p>
            </div>
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-fit"
            >
              Mescola assegnazioni
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          Salva prima una configurazione completa con gironi. I gironi attuali non corrispondono ancora alla struttura richiesta.
        </div>
      )}

      {(groupsSnapshot.isUneven ||
        groupsSnapshot.unassignedTeamCount > 0 ||
        underfilledGroups.length > 0) && (
        <div className="grid w-full max-w-full min-w-0 gap-3">
          {groupsSnapshot.isUneven ? (
            <div className="w-full max-w-full min-w-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              La distribuzione attuale dei gironi non rispetta ancora la configurazione salvata.
            </div>
          ) : null}
          {groupsSnapshot.unassignedTeamCount > 0 ? (
            <div className="w-full max-w-full min-w-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {groupsSnapshot.unassignedTeamCount} squadr{groupsSnapshot.unassignedTeamCount === 1 ? "a non è" : "e non sono"} ancora assegnat{groupsSnapshot.unassignedTeamCount === 1 ? "a" : "e"}.
            </div>
          ) : null}
          {underfilledGroups.length > 0 ? (
            <div className="w-full max-w-full min-w-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {underfilledGroups.length === 1
                ? `${underfilledGroups[0].name} ha meno di ${expectedTeamsPerGroup} squadre.`
                : `${underfilledGroups.length} gironi hanno meno di ${expectedTeamsPerGroup} squadre.`}
            </div>
          ) : null}
        </div>
      )}

      {groupsSnapshot.groups.length === 0 ? (
        <div className="w-full max-w-full min-w-0 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          Non ci sono ancora gironi creati per questo torneo.
        </div>
      ) : (
        <div className="grid w-full max-w-full min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {groupsSnapshot.groups.map((group) => (
            <section
              key={group.id}
              className="w-full max-w-full min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="min-w-0 border-b border-slate-200 pb-4">
                <div className="min-w-0">
                  <h4 className="text-lg font-semibold tracking-tight text-slate-950">{group.name}</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    Ordine {group.sequence} · {group.teams.length} squadr{group.teams.length === 1 ? "a assegnata" : "e assegnate"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid w-full max-w-full min-w-0 gap-3">
                {group.teams.length === 0 ? (
                  <p className="w-full max-w-full min-w-0 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                    Nessuna squadra assegnata.
                  </p>
                ) : (
                  group.teams.map((team) => (
                    <div
                      key={team.tournamentTeamId}
                      className="grid min-w-0 gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700"
                    >
                      <div className="min-w-0">
                        <p className="text-pretty break-words font-medium text-slate-950">
                          {team.name}
                        </p>
                        <p className="mt-1 text-slate-500">
                          {team.playerCount} giocator{team.playerCount === 1 ? "e" : "i"}
                        </p>
                      </div>
                      <p className="min-w-0 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                        {team.seed ? `Testa di serie ${team.seed}` : "Senza testa di serie"} · Slot {team.groupSlot ?? "-"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {groupsSnapshot.groups.length > 0 ? (
        <section className="grid w-full max-w-full min-w-0 gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="min-w-0">
            <h4 className="text-lg font-semibold tracking-tight text-slate-950">
              Assegnazione manuale
            </h4>
            <p className="mt-1 text-sm text-slate-600">
              Sposta le squadre tra i gironi, lasciale non assegnate oppure cambia gli slot prima della generazione delle partite.
            </p>
          </div>

          <form action={saveTournamentGroupAssignmentsAction} className="grid w-full max-w-full min-w-0 gap-4">
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="tournamentSlug" value={tournamentSlug} />

            <fieldset disabled={isDisabled} className="grid gap-4 disabled:opacity-60">
            <div className="grid w-full max-w-full min-w-0 gap-3">
              {manualAssignmentRows.map((team) => (
                <div
                  key={team.tournamentTeamId}
                  className="grid w-full max-w-full min-w-0 gap-4 rounded-2xl bg-white px-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_130px]"
                >
                  <input type="hidden" name="tournamentTeamId" value={team.tournamentTeamId} />

                  <div className="min-w-0">
                    <p className="text-pretty break-words font-medium text-slate-950">{team.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {team.playerCount} giocator{team.playerCount === 1 ? "e" : "i"} ·{" "}
                      {team.seed ? `Testa di serie ${team.seed}` : "Senza testa di serie"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                      {team.assignedGroupName
                        ? `${team.assignedGroupName} · Slot ${team.groupSlot ?? "-"}`
                        : "Attualmente non assegnata"}
                    </p>
                  </div>

                  <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                    Girone
                    <select
                      name={`assignmentGroupId:${team.tournamentTeamId}`}
                      defaultValue={team.assignedGroupId}
                      className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    >
                      <option value="">Non assegnata</option>
                      {groupsSnapshot.groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                    Slot
                    <input
                      type="number"
                      name={`assignmentGroupSlot:${team.tournamentTeamId}`}
                      min="1"
                      defaultValue={team.groupSlot ?? ""}
                      className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    />
                  </label>
                </div>
              ))}
            </div>

            <p className="text-sm text-slate-500">
              Gli slot devono essere unici all&apos;interno di ogni girone. Lascia una squadra non assegnata se non deve ancora entrare nella fase a gironi.
            </p>

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 sm:w-fit"
            >
              Salva assegnazioni manuali
            </button>
            </fieldset>
          </form>
        </section>
      ) : null}

      {groupsSnapshot.unassignedTeams.length > 0 ? (
        <section className="grid w-full max-w-full min-w-0 gap-3">
          <div className="min-w-0">
            <h4 className="text-lg font-semibold tracking-tight text-slate-950">Squadre non assegnate</h4>
            <p className="mt-1 text-sm text-slate-600">
              Queste squadre del torneo non sono ancora state inserite in un girone.
            </p>
          </div>
          <div className="grid w-full max-w-full min-w-0 gap-2">
            {groupsSnapshot.unassignedTeams.map((team) => (
              <div
                key={team.tournamentTeamId}
                className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-pretty break-words font-medium text-slate-950">{team.name}</p>
                  <p className="text-slate-500">
                    {team.playerCount} giocator{team.playerCount === 1 ? "e" : "i"}
                  </p>
                </div>
                <p className="w-fit shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  {team.seed ? `Testa di serie ${team.seed}` : "Senza testa di serie"}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
