import Link from "next/link";
import { notFound } from "next/navigation";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { DashboardTournamentGroupsPanel } from "@/features/groups/components/dashboard-tournament-groups-panel";
import { listTournamentGroupsWithTeams } from "@/features/groups/server/list-tournament-groups-with-teams";
import { DashboardMatchResultsPanel } from "@/features/matches/components/dashboard-match-results-panel";
import { createTournamentMatchAction } from "@/features/matches/server/match-actions";
import { listTournamentMatches } from "@/features/matches/server/list-tournament-matches";
import { createTeamPlayerAction } from "@/features/players/server/player-actions";
import { listTeamPlayers } from "@/features/players/server/list-team-players";
import { DashboardTeamRegistrationsPanel } from "@/features/team-registrations/components/dashboard-team-registrations-panel";
import { readDashboardCaptainManageLinkFlash } from "@/features/team-registrations/server/captain-manage-link";
import { listTournamentTeamRegistrations } from "@/features/team-registrations/server/list-tournament-team-registrations";
import { listOrganizationTeams } from "@/features/teams/server/list-organization-teams";
import {
  assignExistingTeamToTournamentAction,
  createTournamentTeamAction,
} from "@/features/teams/server/team-actions";
import { listTournamentTeams } from "@/features/teams/server/list-tournament-teams";
import { DashboardTournamentQualificationResolutionPanel } from "@/features/tournaments/components/dashboard-tournament-qualification-resolution-panel";
import { DashboardTournamentCompetitionSettingsForm } from "@/features/tournaments/components/dashboard-tournament-competition-settings-form";
import { DashboardTournamentGenerationForm } from "@/features/tournaments/components/dashboard-tournament-generation-form";
import { DashboardTournamentSetupSummary } from "@/features/tournaments/components/dashboard-tournament-setup-summary";
import { deriveDashboardTournamentSetupState } from "@/features/tournaments/server/dashboard-tournament-setup";
import { getDashboardTournamentBySlug } from "@/features/tournaments/server/get-dashboard-tournament-by-slug";
import { getTournamentQualificationResolution } from "@/features/tournaments/server/get-tournament-qualification-resolution";
import type { QualificationResolutionSnapshot } from "@/features/tournaments/server/qualification-resolution";
import {
  buildDefaultCompetitionSettings,
  buildDefaultScheduleSlots,
  formatScheduleSlotStartTime,
  mapPersistedStagesToCompetitionInput,
} from "@/features/tournaments/server/tournament-competition";
import {
  deleteTournamentCompetitionStructureAction,
  generateTournamentCompetitionStructureAction,
  rescheduleTournamentCompetitionAction,
  resolveTournamentKnockoutParticipantsAction,
  toggleTournamentFinalPhaseVisibilityAction,
} from "@/features/tournaments/server/tournament-competition-actions";
import { getKnockoutStageVisibilityState } from "@/features/tournaments/server/tournament-stage-visibility";
import { updateTournamentAction } from "@/features/tournaments/server/tournament-actions";
import { TOURNAMENT_FORMAT_VALUES } from "@/features/tournaments/types/tournament-format.types";
import {
  getTournamentFormatLabel,
  isGroupedTournamentFormat,
  isKnockoutTournamentFormat,
} from "@/features/tournaments/utils/tournament-format";
import type { DashboardFeedback } from "@/lib/dashboard-feedback";
import {
  formatDateInputValue,
  formatDateRangeLabel,
  formatDateTimeInputValue,
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

  const [tournamentTeams, organizationTeams, matches, registrations, groupsSnapshot, manageLinkReveal] =
    await Promise.all([
      listTournamentTeams(tournament.id),
      listOrganizationTeams(tournament.organizationId),
      listTournamentMatches(tournament.id),
      listTournamentTeamRegistrations(tournament.id),
      isGroupedTournamentFormat(tournament.format)
        ? listTournamentGroupsWithTeams(tournament.id)
        : Promise.resolve(null),
      readDashboardCaptainManageLinkFlash(tournament.slug),
    ]);

  const teamIds = new Set(tournamentTeams.map((team) => team.id));
  const availableOrganizationTeams = organizationTeams.filter((team) => !teamIds.has(team.id));
  const rosters = await Promise.all(
    tournamentTeams.map(async (team) => ({
      team,
      players: await listTeamPlayers(team.id),
    })),
  );
  const isGroupedTournament = isGroupedTournamentFormat(tournament.format);
  const isKnockoutTournament = isKnockoutTournamentFormat(tournament.format);
  const qualificationResolutionSnapshot: QualificationResolutionSnapshot = isKnockoutTournament
    ? await getTournamentQualificationResolution(tournament.id)
    : { unresolvedSlots: [] };
  const defaultCompetitionSettings = buildDefaultCompetitionSettings(tournament.format);
  const persistedCompetitionStages = tournament.stages.length > 0
    ? mapPersistedStagesToCompetitionInput(tournament.stages).map((stage) =>
        stage.type === "GROUP_STAGE"
          ? {
              type: stage.type,
              order: stage.order,
              name: stage.name,
              groupCount: stage.groupCount,
              teamsPerGroup: stage.teamsPerGroup,
              legs: stage.legs,
              qualifiersPerGroup: stage.qualifiersPerGroup,
              stageBreakDaysAfter: stage.stageBreakDaysAfter,
            }
          : {
              type: stage.type,
              order: stage.order,
              name: stage.name,
              knockoutTeamCount: stage.knockoutTeamCount,
              knockoutRound: stage.knockoutRound,
              includeThirdPlaceMatch: stage.includeThirdPlaceMatch,
              stageBreakDaysAfter: stage.stageBreakDaysAfter,
              pairingRule: stage.pairingRule,
            },
      )
    : defaultCompetitionSettings.stages;
  const groupStageConfiguration = persistedCompetitionStages.find(
    (stage) => stage.type === "GROUP_STAGE",
  );
  const knockoutStageConfiguration = persistedCompetitionStages.find(
    (stage) => stage.type === "KNOCKOUT_STAGE",
  );
  const scheduleSlotDefaults = tournament.scheduleSlots.length > 0
    ? tournament.scheduleSlots
    : buildDefaultScheduleSlots().map((slot) => ({
        id: `default-${slot.sequence}`,
        sequence: slot.sequence,
        startMinutes: Number(slot.startTime.slice(0, 2)) * 60 + Number(slot.startTime.slice(3, 5)),
        durationMinutes: slot.durationMinutes,
      }));
  const slotTimesDefault = scheduleSlotDefaults
    .map((slot) => formatScheduleSlotStartTime(slot.startMinutes))
    .join(", ");
  const slotDurationDefault = scheduleSlotDefaults[0]?.durationMinutes ?? 60;
  const legacyMatches = matches.filter((match) => match.stageId === null);
  const setupState = deriveDashboardTournamentSetupState({
    tournament,
    attachedTeamCount: tournamentTeams.length,
    groupsSnapshot,
    matches,
  });
  const stageVisibility = getKnockoutStageVisibilityState(tournament.stages);

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

      <DashboardTournamentSetupSummary setupState={setupState} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid min-w-0 gap-6">
          <DashboardTournamentCompetitionSettingsForm
            tournamentId={tournament.id}
            tournamentSlug={tournament.slug}
            status={setupState.settings.status}
            isLocked={setupState.settings.isLocked}
            lockedMessage={setupState.settings.message}
            initialFormat={tournament.format}
            initialExpectedTeamCount={tournament.expectedTeamCount ?? defaultCompetitionSettings.expectedTeamCount}
            initialScheduleStartDate={formatDateInputValue(
              tournament.scheduleStartDate ?? tournament.startsAt,
            )}
            initialScheduleMaxMatchesPerDay={
              tournament.scheduleMaxMatchesPerDay ?? defaultCompetitionSettings.scheduleMaxMatchesPerDay
            }
            initialScheduleMinimumRestDays={
              tournament.scheduleMinimumRestDays ?? defaultCompetitionSettings.scheduleMinimumRestDays
            }
            initialSlotTimes={slotTimesDefault}
            initialSlotDurationMinutes={slotDurationDefault}
            initialGroupStageConfiguration={
              groupStageConfiguration?.type === "GROUP_STAGE"
                ? {
                    groupCount: groupStageConfiguration.groupCount,
                    teamsPerGroup: groupStageConfiguration.teamsPerGroup,
                    legs: groupStageConfiguration.legs,
                    qualifiersPerGroup: groupStageConfiguration.qualifiersPerGroup,
                  }
                : null
            }
            initialKnockoutStageConfiguration={
              knockoutStageConfiguration?.type === "KNOCKOUT_STAGE"
                ? {
                    knockoutTeamCount: knockoutStageConfiguration.knockoutTeamCount,
                    knockoutRound: knockoutStageConfiguration.knockoutRound,
                    includeThirdPlaceMatch: knockoutStageConfiguration.includeThirdPlaceMatch,
                    pairingRule: knockoutStageConfiguration.pairingRule,
                  }
                : null
            }
          />

          <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">Public visibility</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Dashboard users always see every stage. Public pages can keep the final phase hidden until you decide to reveal it.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Group stage</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {stageVisibility.groupStageIsPublic === false ? "Hidden" : "Public"}
                </p>
              </article>
              <article className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Final phase</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {stageVisibility.knockoutStageIsPublic === null
                    ? "Not configured"
                    : stageVisibility.knockoutStageIsPublic
                      ? "Public"
                      : "Hidden"}
                </p>
              </article>
            </div>

            {stageVisibility.hasKnockoutStage ? (
              <form action={toggleTournamentFinalPhaseVisibilityAction} className="mt-5 grid gap-3">
                <input type="hidden" name="tournamentId" value={tournament.id} />
                <input type="hidden" name="tournamentSlug" value={tournament.slug} />
                <input
                  type="hidden"
                  name="isPublic"
                  value={stageVisibility.knockoutStageIsPublic ? "false" : "true"}
                />

                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {stageVisibility.knockoutStageIsPublic
                    ? "The quarter-finals, semi-finals, and final are currently visible on public tournament pages."
                    : "The quarter-finals, semi-finals, and final are currently hidden on public tournament pages."}
                </p>

                <button
                  type="submit"
                  className="w-fit rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900"
                >
                  {stageVisibility.knockoutStageIsPublic
                    ? "Hide final phase publicly"
                    : "Show final phase publicly"}
                </button>
              </form>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Save a knockout configuration before changing final-phase visibility.
              </p>
            )}
          </article>

          {isGroupedTournament &&
          groupsSnapshot &&
          groupStageConfiguration?.type === "GROUP_STAGE" ? (
            <article className="min-w-0 rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
              <DashboardTournamentGroupsPanel
                tournamentId={tournament.id}
                tournamentSlug={tournament.slug}
                attachedTeamCount={tournamentTeams.length}
                groupsSnapshot={groupsSnapshot}
                expectedGroupCount={groupStageConfiguration.groupCount}
                expectedTeamsPerGroup={groupStageConfiguration.teamsPerGroup}
                status={setupState.groups.status}
                issues={setupState.groups.issues}
                isDisabled={setupState.groups.isBlocked}
                expectedTeamCount={setupState.groups.expectedTeamCount}
              />
            </article>
          ) : null}

          <article className="min-w-0 rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">
                  Step 3 · Generate competition structure
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Create stages, group fixtures, and knockout dependencies only when the persisted
                  tournament setup is complete and valid.
                </p>
              </div>
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                  setupState.structure.readyToGenerate
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                Ready to generate: {setupState.structure.readyToGenerate ? "Yes" : "No"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Generated matches</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {setupState.structure.generatedMatchCount} / {setupState.structure.expectedMatchCount}
                </p>
              </article>
              <article className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Stages</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {setupState.structure.existingStageCount} / {setupState.structure.expectedStageCount}
                </p>
              </article>
              <article className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Schedule slots</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {setupState.structure.configuredSlotCount} / {setupState.structure.expectedSlotCount}
                </p>
              </article>
              <article className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Legacy matches</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{legacyMatches.length}</p>
              </article>
            </div>

            {setupState.structure.issues.length > 0 ? (
              <div className="mt-5 grid gap-3 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
                {setupState.structure.issues.map((issue) => (
                  <p key={issue}>{issue}</p>
                ))}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <DashboardTournamentGenerationForm
                action={generateTournamentCompetitionStructureAction}
                tournamentId={tournament.id}
                tournamentSlug={tournament.slug}
                isReady={setupState.structure.readyToGenerate}
              />

              <form
                action={deleteTournamentCompetitionStructureAction}
                className="grid gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-5"
              >
                <input type="hidden" name="tournamentId" value={tournament.id} />
                <input type="hidden" name="tournamentSlug" value={tournament.slug} />
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">
                    Delete managed structure
                  </h4>
                  <p className="mt-2 text-sm text-rose-900">
                    Removes only generated scheduled matches. Completed, live, and legacy matches are protected.
                  </p>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-full border border-rose-300 bg-white px-5 py-3 text-sm font-medium text-rose-700 sm:w-fit"
                >
                  Delete generated structure
                </button>
              </form>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">Step 4 · Schedule calendar</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Assign dates and kickoff times only after the competition structure has been generated.
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                    setupState.calendar.status === "COMPLETE"
                      ? "bg-emerald-100 text-emerald-800"
                      : setupState.calendar.status === "INCOMPLETE"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {setupState.calendar.status}
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <article className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Generated matches</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {setupState.calendar.generatedMatchCount} / {setupState.calendar.expectedMatchCount}
                  </p>
                </article>
                <article className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Scheduled matches</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {setupState.calendar.scheduledMatchCount} / {setupState.calendar.expectedMatchCount}
                  </p>
                </article>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                {setupState.calendar.message}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <form
                  action={rescheduleTournamentCompetitionAction}
                  className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <input type="hidden" name="tournamentId" value={tournament.id} />
                  <input type="hidden" name="tournamentSlug" value={tournament.slug} />
                  <fieldset
                    disabled={!setupState.calendar.canSchedule}
                    className="grid gap-3 disabled:opacity-60"
                  >
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Reschedule calendar
                      </h4>
                      <p className="mt-2 text-sm text-slate-600">
                        Reassign dates and times using the saved start date, slot list, and rest rules.
                      </p>
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-fit"
                    >
                      Reschedule generated matches
                    </button>
                  </fieldset>
                </form>

                {isKnockoutTournament ? (
                  <form
                    action={resolveTournamentKnockoutParticipantsAction}
                    className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <input type="hidden" name="tournamentId" value={tournament.id} />
                    <input type="hidden" name="tournamentSlug" value={tournament.slug} />
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Resolve qualifiers
                      </h4>
                      <p className="mt-2 text-sm text-slate-600">
                        Fills knockout participants from final group standings and completed upstream
                        matches without creating fake teams.
                      </p>
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 sm:w-fit"
                    >
                      Resolve knockout participants
                    </button>
                  </form>
                ) : null}
              </div>

              {isKnockoutTournament ? (
                <div className="mt-5">
                  <DashboardTournamentQualificationResolutionPanel
                    tournamentId={tournament.id}
                    tournamentSlug={tournament.slug}
                    resolutionSnapshot={qualificationResolutionSnapshot}
                  />
                </div>
              ) : null}
            </div>
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
              <h3 className="text-xl font-semibold tracking-tight">Step 5 · Results / standings</h3>
              <p className="mt-2 text-sm text-slate-600">
                Update match status, enter scores, and publish completed results only after matches exist.
              </p>
            </div>
            <span className="text-sm text-slate-500">{matches.length} matches</span>
          </div>

          {!setupState.results.isActive ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              {setupState.results.message}
            </div>
          ) : null}

          <DashboardMatchResultsPanel matches={matches} tournamentSlug={tournament.slug} />
        </article>
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
              manageLinkReveal={manageLinkReveal}
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

    </div>
  );
}
