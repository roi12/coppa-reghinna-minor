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
          <h4 className="text-lg font-semibold tracking-tight text-slate-950">Step 2 · Group assignment</h4>
          <p className="mt-1 text-sm text-slate-600">
            Save stable competition settings before assigning teams to the persisted groups.
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
          {status}
        </span>
      </div>

      <div className="grid w-full max-w-full min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Attached teams</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{attachedTeamCount}</p>
        </div>
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Existing groups</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {groupsSnapshot.existingGroupCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Assigned teams</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {groupsSnapshot.assignedTeamCount} / {expectedTeamCount ?? attachedTeamCount}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Groups</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {groupsSnapshot.existingGroupCount} / {expectedGroupCount}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Expected per group</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{expectedTeamsPerGroup}</p>
        </div>
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Unassigned teams</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {groupsSnapshot.unassignedTeamCount}
          </p>
        </div>
      </div>

      <div className="grid w-full max-w-full min-w-0 gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        <p>
          Groups are defined by the saved competition settings. Existing matches are not changed by
          assignment changes until the competition structure is explicitly regenerated.
        </p>
        <p>
          Current configuration expects {expectedGroupCount} groups with {expectedTeamsPerGroup}{" "}
          teams each, for a total of {configuredCapacity} tournament teams.
        </p>
      </div>

      {status === "BLOCKED" ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          Group assignment becomes available after complete competition settings have been saved and
          the persisted tournament groups match the current configuration.
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
                Auto-assign seeded
              </h4>
              <p className="mt-2 text-sm text-slate-600">
                Fill the configured groups using seed order and group slots.
              </p>
            </div>
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-fit"
            >
              Apply seeded distribution
            </button>
          </form>

          <form action={autoAssignTournamentGroupsAction} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5">
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="tournamentSlug" value={tournamentSlug} />
            <input type="hidden" name="assignmentMode" value="RANDOMIZE" />
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Randomize groups
              </h4>
              <p className="mt-2 text-sm text-slate-600">
                Rebuild assignments randomly. This does not delete matches on its own.
              </p>
            </div>
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-fit"
            >
              Randomize assignments
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          Save a complete grouped competition configuration before assigning teams. The current group
          records do not match the configured structure yet.
        </div>
      )}

      {(groupsSnapshot.isUneven ||
        groupsSnapshot.unassignedTeamCount > 0 ||
        underfilledGroups.length > 0) && (
        <div className="grid w-full max-w-full min-w-0 gap-3">
          {groupsSnapshot.isUneven ? (
            <div className="w-full max-w-full min-w-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Group sizes are currently uneven relative to the saved competition settings.
            </div>
          ) : null}
          {groupsSnapshot.unassignedTeamCount > 0 ? (
            <div className="w-full max-w-full min-w-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {groupsSnapshot.unassignedTeamCount} team
              {groupsSnapshot.unassignedTeamCount === 1 ? " is" : "s are"} currently unassigned.
            </div>
          ) : null}
          {underfilledGroups.length > 0 ? (
            <div className="w-full max-w-full min-w-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {underfilledGroups.length === 1
                ? `${underfilledGroups[0].name} has fewer than ${expectedTeamsPerGroup} teams.`
                : `${underfilledGroups.length} groups currently have fewer than ${expectedTeamsPerGroup} teams.`}
            </div>
          ) : null}
        </div>
      )}

      {groupsSnapshot.groups.length === 0 ? (
        <div className="w-full max-w-full min-w-0 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          No groups have been created for this tournament yet.
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
                    Sequence {group.sequence} · {group.teams.length} assigned team
                    {group.teams.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid w-full max-w-full min-w-0 gap-3">
                {group.teams.length === 0 ? (
                  <p className="w-full max-w-full min-w-0 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                    No teams assigned yet.
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
                          {team.playerCount} player{team.playerCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p className="min-w-0 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                        {team.seed ? `Seed ${team.seed}` : "No seed"} · Slot {team.groupSlot ?? "-"}
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
              Manual assignments
            </h4>
            <p className="mt-1 text-sm text-slate-600">
              Move teams between groups, leave them unassigned, or adjust slot order before any
              group-stage matches are created.
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
                      {team.playerCount} player{team.playerCount === 1 ? "" : "s"} ·{" "}
                      {team.seed ? `Seed ${team.seed}` : "No seed"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                      {team.assignedGroupName
                        ? `${team.assignedGroupName} · Slot ${team.groupSlot ?? "-"}`
                        : "Currently unassigned"}
                    </p>
                  </div>

                  <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                    Group
                    <select
                      name={`assignmentGroupId:${team.tournamentTeamId}`}
                      defaultValue={team.assignedGroupId}
                      className="w-full max-w-full min-w-0 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    >
                      <option value="">Unassigned</option>
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
              Slots must be unique within each group. Leave the group set to unassigned if a team
              should stay outside the group stage for now.
            </p>

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 sm:w-fit"
            >
              Save manual assignments
            </button>
            </fieldset>
          </form>
        </section>
      ) : null}

      {groupsSnapshot.unassignedTeams.length > 0 ? (
        <section className="grid w-full max-w-full min-w-0 gap-3">
          <div className="min-w-0">
            <h4 className="text-lg font-semibold tracking-tight text-slate-950">Unassigned teams</h4>
            <p className="mt-1 text-sm text-slate-600">
              These attached teams are not currently placed into a group.
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
                    {team.playerCount} player{team.playerCount === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="w-fit shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  {team.seed ? `Seed ${team.seed}` : "No seed"}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
