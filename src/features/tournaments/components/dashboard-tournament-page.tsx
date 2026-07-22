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
import {
  countFinishedPreliminaryMatches,
  resolvePreliminaryStandingsScope,
} from "@/features/standings/server/preliminary-standings";
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
import { DashboardTournamentPreliminaryStandingsScopeForm } from "@/features/tournaments/components/dashboard-tournament-preliminary-standings-scope-form";
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

function getTournamentStatusLabel(status: "DRAFT" | "PUBLISHED" | "COMPLETED") {
  switch (status) {
    case "DRAFT":
      return "Bozza";
    case "PUBLISHED":
      return "Pubblicato";
    case "COMPLETED":
      return "Concluso";
  }
}

function getStepStatusLabel(status: "BLOCKED" | "INCOMPLETE" | "COMPLETE" | "LOCKED" | "INVALID") {
  switch (status) {
    case "BLOCKED":
      return "Bloccato";
    case "INCOMPLETE":
      return "Incompleto";
    case "COMPLETE":
      return "Completo";
    case "LOCKED":
      return "Bloccato";
    case "INVALID":
      return "Non valido";
  }
}

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
    : { unresolvedSlots: [], warningMessage: null };
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
  const preliminaryStage = tournament.stages.find((stage) => stage.type === "GROUP_STAGE") ?? null;
  const preliminaryStandingsScope = resolvePreliminaryStandingsScope({
    tournamentFormat: tournament.format,
    configuration: preliminaryStage?.configuration ?? null,
  });
  const finishedPreliminaryMatchCount = countFinishedPreliminaryMatches(
    matches.map((match) => ({
      stageId: match.stageId,
      groupId: match.groupId,
      status: match.status,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
    })),
    preliminaryStage?.id ?? null,
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
            Area torneo
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
            Torna alla dashboard
          </Link>
          <Link
            href={`/tournaments/${tournament.slug}`}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            Apri pagina pubblica
          </Link>
        </div>
      </div>

      <FeedbackBanner feedback={feedback} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Stato</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {getTournamentStatusLabel(tournament.status)}
          </p>
        </article>
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Formula</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {getTournamentFormatLabel(tournament.format)}
          </p>
        </article>
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Squadre</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{tournament.teamCount}</p>
        </article>
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Partite</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{tournament.matchCount}</p>
        </article>
        <article className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Località</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {tournament.locationLabel ?? "Da definire"}
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold tracking-tight">Dettagli torneo</h3>
        <p className="mt-2 text-sm text-slate-600">
          Aggiorna le informazioni pubbliche principali prima della pubblicazione.
        </p>

        <form action={updateTournamentAction} className="mt-5 grid gap-5">
          <input type="hidden" name="tournamentId" value={tournament.id} />
          <input type="hidden" name="currentSlug" value={tournament.slug} />
          <input type="hidden" name="organizationId" value={tournament.organizationId} />

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Nome torneo
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
              Etichetta stagione
              <input
                name="seasonLabel"
                required
                defaultValue={tournament.seasonLabel}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Formula torneo
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
                Scegli la formula del torneo da usare nella dashboard organizzatori e nelle pagine pubbliche.
              </span>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Località
              <input
                name="locationLabel"
                defaultValue={tournament.locationLabel ?? ""}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Stato
              <select
                name="status"
                defaultValue={tournament.status}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              >
                <option value="DRAFT">Bozza</option>
                <option value="PUBLISHED">Pubblicato</option>
                <option value="COMPLETED">Concluso</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Data inizio
              <input
                type="date"
                name="startsAt"
                defaultValue={formatDateInputValue(tournament.startsAt)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Data fine
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
            Salva dettagli torneo
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

          {preliminaryStage ? (
            <DashboardTournamentPreliminaryStandingsScopeForm
              tournamentId={tournament.id}
              tournamentSlug={tournament.slug}
              currentScope={preliminaryStandingsScope}
              finishedPreliminaryMatchCount={finishedPreliminaryMatchCount}
            />
          ) : null}

          <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">Visibilità pubblica</h3>
                <p className="mt-2 text-sm text-slate-600">
                  In dashboard vedi sempre tutte le fasi. Le pagine pubbliche possono nascondere la fase finale finché non decidi di mostrarla.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Fase a gironi</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {stageVisibility.groupStageIsPublic === false ? "Nascosta" : "Pubblica"}
                </p>
              </article>
              <article className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Fase finale</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {stageVisibility.knockoutStageIsPublic === null
                    ? "Non configurata"
                    : stageVisibility.knockoutStageIsPublic
                      ? "Pubblica"
                      : "Nascosta"}
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
                    ? "Quarti, semifinali e finale sono attualmente visibili nelle pagine pubbliche del torneo."
                    : "Quarti, semifinali e finale sono attualmente nascosti nelle pagine pubbliche del torneo."}
                </p>

                <button
                  type="submit"
                  className="w-fit rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-900"
                >
                  {stageVisibility.knockoutStageIsPublic
                    ? "Nascondi pubblicamente la fase finale"
                    : "Mostra pubblicamente la fase finale"}
                </button>
              </form>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Salva prima una configurazione con fase finale per poter gestire la visibilità pubblica.
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
                  3. Generazione calendario e struttura
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Genera fasi, partite dei gironi e incroci della fase finale solo quando la configurazione salvata è completa e valida.
                </p>
              </div>
              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                  setupState.structure.readyToGenerate
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                Pronto alla generazione: {setupState.structure.readyToGenerate ? "Sì" : "No"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Partite generate</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {setupState.structure.generatedMatchCount} / {setupState.structure.expectedMatchCount}
                </p>
              </article>
              <article className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Fasi</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {setupState.structure.existingStageCount} / {setupState.structure.expectedStageCount}
                </p>
              </article>
              <article className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Slot orari</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {setupState.structure.configuredSlotCount} / {setupState.structure.expectedSlotCount}
                </p>
              </article>
              <article className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Partite legacy</p>
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
                    Elimina struttura generata
                  </h4>
                  <p className="mt-2 text-sm text-rose-900">
                    Rimuove solo le partite generate e non concluse. Partite finali, live e legacy restano protette.
                  </p>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-full border border-rose-300 bg-white px-5 py-3 text-sm font-medium text-rose-700 sm:w-fit"
                >
                  Elimina struttura generata
                </button>
              </form>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">4. Programmazione calendario</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Assegna date e orari solo dopo la generazione della struttura del torneo.
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
                  {getStepStatusLabel(setupState.calendar.status)}
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <article className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Partite generate</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {setupState.calendar.generatedMatchCount} / {setupState.calendar.expectedMatchCount}
                  </p>
                </article>
                <article className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Partite programmate</p>
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
                        Ripianifica calendario
                      </h4>
                      <p className="mt-2 text-sm text-slate-600">
                        Ricalcola date e orari usando data iniziale, slot salvati e regole di riposo.
                      </p>
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-fit"
                    >
                      Ripianifica partite generate
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
                        Risolvi qualificazioni
                      </h4>
                      <p className="mt-2 text-sm text-slate-600">
                        Compila la fase finale usando le classifiche definitive e i risultati già conclusi, senza creare squadre fittizie.
                      </p>
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 sm:w-fit"
                    >
                      Aggiorna partecipanti fase finale
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
            <h3 className="text-xl font-semibold tracking-tight">Partita manuale</h3>
            <p className="mt-2 text-sm text-slate-600">
              Aggiungi manualmente una partita tra due squadre già inserite nel torneo.
            </p>

            {tournamentTeams.length < 2 ? (
              <p className="mt-5 text-sm text-slate-600">
                Servono almeno due squadre del torneo prima di poter creare una partita manuale.
              </p>
            ) : (
              <form action={createTournamentMatchAction} className="mt-5 grid gap-4">
                <input type="hidden" name="tournamentId" value={tournament.id} />
                <input type="hidden" name="tournamentSlug" value={tournament.slug} />
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Squadra casa
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
                    Squadra ospite
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
                    Etichetta turno
                    <input
                      name="roundLabel"
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                      placeholder="3ª giornata"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Data e ora
                    <input
                      type="datetime-local"
                      name="startsAt"
                      defaultValue={formatDateTimeInputValue(null)}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                    Campo / località
                    <input
                      name="locationLabel"
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                      placeholder="Campo principale"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
                >
                  Crea partita
                </button>
              </form>
            )}
          </article>
        </div>

        <article className="min-w-0 rounded-3xl border border-slate-300 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold tracking-tight">5. Gestione risultati</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {matches.length} partite
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Aggiorna risultati, marcatori ed eventi.
              </p>
            </div>
          </div>

          {!setupState.results.isActive ? (
            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              {setupState.results.message}
            </div>
          ) : null}

          <DashboardMatchResultsPanel matches={matches} />
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6">
          <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">Iscrizioni squadre</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Controlla le iscrizioni inviate dai capitani e approva le squadre da trasformare in partecipanti reali.
                </p>
              </div>
              <span className="text-sm text-slate-500">{registrations.length} richieste</span>
            </div>
            <DashboardTeamRegistrationsPanel
              manageLinkReveal={manageLinkReveal}
              registrations={registrations}
              tournamentSlug={tournament.slug}
            />
          </article>

          <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold tracking-tight">Aggiungi squadra esistente</h3>
            <p className="mt-2 text-sm text-slate-600">
              Riutilizza una squadra dell&apos;organizzazione non ancora collegata a questo torneo.
            </p>

            {availableOrganizationTeams.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">
                Non ci sono squadre riutilizzabili. Puoi crearne una nuova qui sotto.
              </p>
            ) : (
              <form action={assignExistingTeamToTournamentAction} className="mt-5 grid gap-4">
                <input type="hidden" name="tournamentId" value={tournament.id} />
                <input type="hidden" name="tournamentSlug" value={tournament.slug} />
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Squadra organizzazione
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
                  Aggiungi squadra al torneo
                </button>
              </form>
            )}
          </article>

          <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold tracking-tight">Crea nuova squadra</h3>
            <p className="mt-2 text-sm text-slate-600">
              Le nuove squadre vengono create nell&apos;organizzazione e collegate subito al torneo.
            </p>

            <form action={createTournamentTeamAction} className="mt-5 grid gap-4">
              <input type="hidden" name="organizationId" value={tournament.organizationId} />
              <input type="hidden" name="tournamentId" value={tournament.id} />
              <input type="hidden" name="tournamentSlug" value={tournament.slug} />
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nome squadra
                <input
                  name="name"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="Costa Azzurra"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Slug
                <input
                  name="slug"
                  required
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  placeholder="costa-azzurra"
                />
              </label>
              <button
                type="submit"
                className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
              >
                Crea e aggiungi squadra
              </button>
            </form>
          </article>
        </div>

        <article className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Squadre del torneo</h3>
              <p className="mt-2 text-sm text-slate-600">
                Gestisci le squadre partecipanti e completa le rose con i giocatori.
              </p>
            </div>
            <span className="text-sm text-slate-500">{tournamentTeams.length} squadre</span>
          </div>

          {rosters.length === 0 ? (
            <p className="mt-5 text-sm text-slate-600">
              Non ci sono ancora squadre assegnate. Aggiungi o crea una squadra per iniziare.
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {rosters.map(({ team, players }) => (
                <section key={team.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        {team.seed ? `Testa di serie ${team.seed}` : "Squadra del torneo"}
                      </p>
                      <h4 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                        {team.name}
                      </h4>
                    </div>
                    <span className="text-sm text-slate-500">{players.length} giocatori</span>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {players.length === 0 ? (
                      <p className="text-sm text-slate-600">Nessun giocatore inserito.</p>
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
                        Nome
                        <input
                          name="firstName"
                          required
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Cognome
                        <input
                          name="lastName"
                          required
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Nome visualizzato
                        <input
                          name="displayName"
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Numero maglia
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
                      Aggiungi giocatore
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
