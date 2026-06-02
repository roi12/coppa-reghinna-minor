import Link from "next/link";
import { notFound } from "next/navigation";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { DashboardTournamentGroupsPanel } from "@/features/groups/components/dashboard-tournament-groups-panel";
import { listTournamentGroupsWithTeams } from "@/features/groups/server/list-tournament-groups-with-teams";
import { DashboardMatchResultsPanel } from "@/features/matches/components/dashboard-match-results-panel";
import {
  createTournamentMatchAction,
  generateGroupStageMatchesAction,
  generateTournamentRoundRobinCalendarAction,
} from "@/features/matches/server/match-actions";
import { listTournamentMatches } from "@/features/matches/server/list-tournament-matches";
import { createTeamPlayerAction } from "@/features/players/server/player-actions";
import { listTeamPlayers } from "@/features/players/server/list-team-players";
import { DashboardTeamRegistrationsPanel } from "@/features/team-registrations/components/dashboard-team-registrations-panel";
import { listTournamentTeamRegistrations } from "@/features/team-registrations/server/list-tournament-team-registrations";
import { listOrganizationTeams } from "@/features/teams/server/list-organization-teams";
import {
  assignExistingTeamToTournamentAction,
  createTournamentTeamAction,
} from "@/features/teams/server/team-actions";
import { listTournamentTeams } from "@/features/teams/server/list-tournament-teams";
import { getDashboardTournamentBySlug } from "@/features/tournaments/server/get-dashboard-tournament-by-slug";
import { updateTournamentAction } from "@/features/tournaments/server/tournament-actions";
import { TOURNAMENT_FORMAT_VALUES } from "@/features/tournaments/types/tournament-format.types";
import {
  EMPTY_KNOCKOUT_BRACKET_FOUNDATION,
  getTournamentFormatDashboardMessage,
  getTournamentFormatLabel,
} from "@/features/tournaments/utils/tournament-format";
import type { DashboardFeedback } from "@/lib/dashboard-feedback";
import {
  formatDateInputValue,
  formatDateRangeLabel,
  formatDateTimeInputValue,
  formatTimeInputValue,
} from "@/lib/format-date";

type DashboardTournamentPageProps = {
  slug: string;
  feedback: DashboardFeedback | null;
};

export async function DashboardTournamentPage({
  slug,
  feedback,
}: DashboardTournamentPageProps) {
  const tournament = await getDashboardTournamentBySlug(slug);

  if (!tournament) {
    notFound();
  }

  const [tournamentTeams, organizationTeams, matches, registrations, groupsSnapshot] =
    await Promise.all([
      listTournamentTeams(tournament.id),
      listOrganizationTeams(tournament.organizationId),
      listTournamentMatches(tournament.id),
      listTournamentTeamRegistrations(tournament.id),
      tournament.format === "GROUPS_PLUS_KNOCKOUT"
        ? listTournamentGroupsWithTeams(tournament.id)
        : Promise.resolve(null),
    ]);

  const teamIds = new Set(tournamentTeams.map((team) => team.id));
  const availableOrganizationTeams = organizationTeams.filter((team) => !teamIds.has(team.id));
  const rosters = await Promise.all(
    tournamentTeams.map(async (team) => ({
      team,
      players: await listTeamPlayers(team.id),
    })),
  );
  const groupStageGroupsReady =
    tournament.format === "GROUPS_PLUS_KNOCKOUT" &&
    groupsSnapshot !== null &&
    groupsSnapshot.groups.length > 0 &&
    groupsSnapshot.groups.every((group) => group.teams.length >= 2);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
            Tournament Workspace
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{tournament.name}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {tournament.organizationName} · {getTournamentFormatLabel(tournament.format)} ·{" "}
            {formatDateRangeLabel(tournament.startsAt, tournament.endsAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Dashboard
          </Link>
          <Link
            href={`/tournaments/${tournament.slug}`}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            Open public page
          </Link>
        </div>
      </div>

      <FeedbackBanner feedback={feedback} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Status</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{tournament.status}</p>
        </article>
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Format</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {getTournamentFormatLabel(tournament.format)}
          </p>
        </article>
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Teams</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{tournament.teamCount}</p>
        </article>
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Matches</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{tournament.matchCount}</p>
        </article>
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Location</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {tournament.locationLabel ?? "To be announced"}
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold tracking-tight">Tournament details</h3>
        <p className="mt-2 text-sm text-slate-600">
          Update the public-facing basics before publishing the tournament.
        </p>

        <form action={updateTournamentAction} className="mt-5 grid gap-5">
          <input type="hidden" name="tournamentId" value={tournament.id} />
          <input type="hidden" name="currentSlug" value={tournament.slug} />
          <input type="hidden" name="organizationId" value={tournament.organizationId} />

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Tournament name
              <input
                name="name"
                required
                defaultValue={tournament.name}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Slug
              <input
                name="slug"
                required
                defaultValue={tournament.slug}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Sport
              <input
                name="sport"
                required
                defaultValue={tournament.sport}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Season label
              <input
                name="seasonLabel"
                required
                defaultValue={tournament.seasonLabel}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Tournament format
              <select
                name="format"
                defaultValue={tournament.format}
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
                defaultValue={tournament.locationLabel ?? ""}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Status
              <select
                name="status"
                defaultValue={tournament.status}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Start date
              <input
                type="date"
                name="startsAt"
                defaultValue={formatDateInputValue(tournament.startsAt)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              End date
              <input
                type="date"
                name="endsAt"
                defaultValue={formatDateInputValue(tournament.endsAt)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
          </div>

          <button
            type="submit"
            className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
          >
            Save tournament details
          </button>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6">
          <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">Team registrations</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Review captain-submitted squads and decide whether they should become real teams.
                </p>
              </div>
              <span className="text-sm text-slate-500">{registrations.length} entries</span>
            </div>
            <DashboardTeamRegistrationsPanel
              registrations={registrations}
              tournamentSlug={tournament.slug}
            />
          </article>

          <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold tracking-tight">Add existing team</h3>
            <p className="mt-2 text-sm text-slate-600">
              Reuse organization teams that are not yet linked to this tournament.
            </p>

            {availableOrganizationTeams.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">
                No reusable teams are available. Create a new tournament team below.
              </p>
            ) : (
              <form action={assignExistingTeamToTournamentAction} className="mt-5 grid gap-4">
                <input type="hidden" name="tournamentId" value={tournament.id} />
                <input type="hidden" name="tournamentSlug" value={tournament.slug} />
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Organization team
                  <select
                    name="teamId"
                    required
                    defaultValue={availableOrganizationTeams[0]?.id}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  >
                    {availableOrganizationTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
                >
                  Add team to tournament
                </button>
              </form>
            )}
          </article>

          <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold tracking-tight">Create new team</h3>
            <p className="mt-2 text-sm text-slate-600">
              New teams are created in the organization and immediately attached to this tournament.
            </p>

            <form action={createTournamentTeamAction} className="mt-5 grid gap-4">
              <input type="hidden" name="organizationId" value={tournament.organizationId} />
              <input type="hidden" name="tournamentId" value={tournament.id} />
              <input type="hidden" name="tournamentSlug" value={tournament.slug} />
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Team name
                <input
                  name="name"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="Marina Athletic"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Slug
                <input
                  name="slug"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="marina-athletic"
                />
              </label>
              <button
                type="submit"
                className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
              >
                Create and add team
              </button>
            </form>
          </article>
        </div>

        <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Tournament teams</h3>
              <p className="mt-2 text-sm text-slate-600">
                Manage participating teams and add players to each roster.
              </p>
            </div>
            <span className="text-sm text-slate-500">{tournamentTeams.length} teams</span>
          </div>

          {rosters.length === 0 ? (
            <p className="mt-5 text-sm text-slate-600">
              No teams are assigned yet. Add or create a team to start building the rosters.
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {rosters.map(({ team, players }) => (
                <section key={team.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        {team.seed ? `Seed ${team.seed}` : "Tournament team"}
                      </p>
                      <h4 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                        {team.name}
                      </h4>
                    </div>
                    <span className="text-sm text-slate-500">{players.length} players</span>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {players.length === 0 ? (
                      <p className="text-sm text-slate-600">No players added yet.</p>
                    ) : (
                      players.map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-medium text-slate-950">
                              {player.displayName ?? `${player.firstName} ${player.lastName}`}
                            </p>
                            <p className="text-slate-500">
                              {player.firstName} {player.lastName}
                            </p>
                          </div>
                          <span className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-700">
                            #{player.jerseyNumber ?? "-"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <form action={createTeamPlayerAction} className="mt-5 grid gap-4">
                    <input type="hidden" name="organizationId" value={tournament.organizationId} />
                    <input type="hidden" name="teamId" value={team.id} />
                    <input type="hidden" name="tournamentSlug" value={tournament.slug} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        First name
                        <input
                          name="firstName"
                          required
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Last name
                        <input
                          name="lastName"
                          required
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Display name
                        <input
                          name="displayName"
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Jersey number
                        <input
                          name="jerseyNumber"
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="w-fit rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      Add player
                    </button>
                  </form>
                </section>
              ))}
            </div>
          )}
        </article>
      </section>

      {tournament.format === "GROUPS_PLUS_KNOCKOUT" && groupsSnapshot ? (
        <section className="min-w-0">
          <article className="min-w-0 rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-xl font-semibold tracking-tight">Group stage setup</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Create flexible groups from the current approved tournament teams before any
                  group-stage fixtures are generated.
                </p>
              </div>
              <span className="w-fit shrink-0 text-sm text-slate-500">
                {groupsSnapshot.existingGroupCount} group
                {groupsSnapshot.existingGroupCount === 1 ? "" : "s"}
              </span>
            </div>
            <DashboardTournamentGroupsPanel
              tournamentId={tournament.id}
              tournamentSlug={tournament.slug}
              attachedTeamCount={tournamentTeams.length}
              groupsSnapshot={groupsSnapshot}
            />
          </article>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid min-w-0 gap-6">
          <article className="min-w-0 rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold tracking-tight">Format workflow</h3>
            <p className="mt-2 text-sm text-slate-600">
              {getTournamentFormatDashboardMessage(tournament.format)}
            </p>

            {tournament.format === "ROUND_ROBIN" ? (
              tournamentTeams.length < 2 ? (
                <p className="mt-5 text-sm text-slate-600">
                  At least two tournament teams are required before a calendar can be generated.
                </p>
              ) : (
                <form
                  action={generateTournamentRoundRobinCalendarAction}
                  className="mt-5 grid min-w-0 gap-4"
                >
                  <input type="hidden" name="tournamentId" value={tournament.id} />
                  <input type="hidden" name="tournamentSlug" value={tournament.slug} />
                  <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
                    <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                      Start date
                      <input
                        type="date"
                        name="startDate"
                        required
                        defaultValue={formatDateInputValue(tournament.startsAt)}
                        className="min-w-0 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                      />
                    </label>
                    <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                      Matchday interval in days
                      <input
                        type="number"
                        name="intervalDays"
                        min="1"
                        required
                        defaultValue="7"
                        className="min-w-0 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                      />
                    </label>
                    <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                      Default match time
                      <input
                        type="time"
                        name="defaultMatchTime"
                        defaultValue={formatTimeInputValue(tournament.startsAt)}
                        className="min-w-0 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                      />
                    </label>
                    <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                      Existing match handling
                      <select
                        name="generationMode"
                        defaultValue="PRESERVE_EXISTING"
                        className="min-w-0 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                      >
                        <option value="PRESERVE_EXISTING">Preserve existing matches</option>
                        <option value="REPLACE_SCHEDULED">Replace scheduled matches only</option>
                      </select>
                    </label>
                  </div>
                  <p className="min-w-0 text-sm text-slate-500">
                    Preserve mode adds only missing pairings. Replace mode deletes scheduled
                    matches, keeps completed results, and rebuilds the remaining round-robin
                    calendar.
                  </p>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white sm:w-fit"
                  >
                    Generate calendar
                  </button>
                </form>
              )
            ) : tournament.format === "KNOCKOUT" ? (
              <div className="mt-5 grid gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                <p>
                  Automatic knockout bracket generation is not available yet for this tournament.
                </p>
                <p>
                  Foundation prepared: {EMPTY_KNOCKOUT_BRACKET_FOUNDATION.rounds.length} bracket
                  rounds configured by default, third-place match toggle, and seeding notes schema.
                </p>
              </div>
            ) : groupsSnapshot === null || groupsSnapshot.groups.length === 0 ? (
              <div className="mt-5 grid gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                <p>Create tournament groups before generating group-stage matches.</p>
                <p>
                  Group-stage scheduling only works from the current group assignments. Knockout
                  generation remains out of scope for this phase.
                </p>
              </div>
            ) : !groupStageGroupsReady ? (
              <div className="mt-5 grid gap-4 rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
                <p>Every group needs at least two assigned teams before group-stage matches can be generated.</p>
                <p>
                  Current setup: {groupsSnapshot.groups.length} groups, {groupsSnapshot.assignedTeamCount} assigned teams,{" "}
                  {groupsSnapshot.unassignedTeamCount} unassigned teams.
                </p>
              </div>
            ) : (
              <form
                action={generateGroupStageMatchesAction}
                className="mt-5 grid min-w-0 gap-4"
              >
                <input type="hidden" name="tournamentId" value={tournament.id} />
                <input type="hidden" name="tournamentSlug" value={tournament.slug} />
                <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
                  <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                    Start date
                    <input
                      type="date"
                      name="startDate"
                      required
                      defaultValue={formatDateInputValue(tournament.startsAt)}
                      className="min-w-0 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    />
                  </label>
                  <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                    Matchday interval in days
                    <input
                      type="number"
                      name="intervalDays"
                      min="1"
                      required
                      defaultValue="7"
                      className="min-w-0 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    />
                  </label>
                  <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                    Default match time
                    <input
                      type="time"
                      name="defaultMatchTime"
                      defaultValue={formatTimeInputValue(tournament.startsAt)}
                      className="min-w-0 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    />
                  </label>
                  <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                    Existing match handling
                    <select
                      name="generationMode"
                      defaultValue="PRESERVE_EXISTING"
                      className="min-w-0 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    >
                      <option value="PRESERVE_EXISTING">Preserve existing matches</option>
                      <option value="REPLACE_SCHEDULED_GROUP_STAGE">
                        Replace scheduled group-stage matches only
                      </option>
                    </select>
                  </label>
                </div>
                <p className="min-w-0 text-sm text-slate-500">
                  Matches are generated only inside each group. Preserve mode adds only missing
                  pairings. Replace mode deletes scheduled group-stage matches, keeps completed
                  results, and rebuilds the remaining group round robins.
                </p>
                <button
                  type="submit"
                  className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white sm:w-fit"
                >
                  Generate group-stage matches
                </button>
              </form>
            )}
          </article>

          <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold tracking-tight">Create manual match</h3>
            <p className="mt-2 text-sm text-slate-600">
              Add fixtures manually with participating tournament teams.
            </p>

            {tournamentTeams.length < 2 ? (
              <p className="mt-5 text-sm text-slate-600">
                At least two tournament teams are required before a match can be scheduled.
              </p>
            ) : (
              <form action={createTournamentMatchAction} className="mt-5 grid gap-4">
                <input type="hidden" name="tournamentId" value={tournament.id} />
                <input type="hidden" name="tournamentSlug" value={tournament.slug} />
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Home team
                    <select
                      name="homeTeamId"
                      required
                      defaultValue={tournamentTeams[0]?.id}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    >
                      {tournamentTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Away team
                    <select
                      name="awayTeamId"
                      required
                      defaultValue={tournamentTeams[1]?.id}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    >
                      {tournamentTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Round label
                    <input
                      name="roundLabel"
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                      placeholder="Round 3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Kickoff
                    <input
                      type="datetime-local"
                      name="startsAt"
                      defaultValue={formatDateTimeInputValue(null)}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                    Location
                    <input
                      name="locationLabel"
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                      placeholder="Harbor Main Field"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
                >
                  Create match
                </button>
              </form>
            )}
          </article>
        </div>

        <article className="min-w-0 rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Match results</h3>
              <p className="mt-2 text-sm text-slate-600">
                Update match status, enter scores, and publish completed results.
              </p>
            </div>
            <span className="text-sm text-slate-500">{matches.length} matches</span>
          </div>
          <DashboardMatchResultsPanel matches={matches} tournamentSlug={tournament.slug} />
        </article>
      </section>
    </div>
  );
}
