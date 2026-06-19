"use client";

import { useState } from "react";

import {
  buildDefaultCompetitionSettings,
  buildTournamentFormatPreview,
} from "@/features/tournaments/server/tournament-competition";
import { saveTournamentCompetitionSettingsAction } from "@/features/tournaments/server/tournament-competition-actions";
import type {
  GroupStageConfigurationInput,
  KnockoutStageConfigurationInput,
  KnockoutRoundValue,
  TournamentCompetitionSettingsInput,
  TournamentFormatValue,
} from "@/features/tournaments/types/tournament-format.types";
import { TOURNAMENT_FORMAT_VALUES } from "@/features/tournaments/types/tournament-format.types";
import {
  getTournamentFormatDashboardMessage,
  getTournamentFormatLabel,
} from "@/features/tournaments/utils/tournament-format";

type DashboardTournamentCompetitionSettingsFormProps = {
  tournamentId: string;
  tournamentSlug: string;
  status: "COMPLETE" | "INCOMPLETE" | "LOCKED";
  isLocked: boolean;
  lockedMessage: string | null;
  initialFormat: TournamentFormatValue;
  initialExpectedTeamCount: number | null;
  initialScheduleStartDate: string;
  initialScheduleMaxMatchesPerDay: number | null;
  initialScheduleMinimumRestDays: number | null;
  initialSlotTimes: string;
  initialSlotDurationMinutes: number;
  initialGroupStageConfiguration:
    | Pick<GroupStageConfigurationInput, "groupCount" | "teamsPerGroup" | "legs" | "qualifiersPerGroup">
    | null;
  initialKnockoutStageConfiguration:
    | Pick<
        KnockoutStageConfigurationInput,
        "knockoutTeamCount" | "knockoutRound" | "includeThirdPlaceMatch" | "pairingRule"
      >
    | null;
};

type CompetitionSettingsFormState = {
  format: TournamentFormatValue;
  expectedTeamCount: string;
  scheduleStartDate: string;
  scheduleMaxMatchesPerDay: string;
  scheduleMinimumRestDays: string;
  slotTimes: string;
  slotDurationMinutes: string;
  groupCount: string;
  teamsPerGroup: string;
  legs: string;
  qualifiersPerGroup: string;
  knockoutTeamCount: string;
  knockoutRound: string;
  pairingRule: string;
  includeThirdPlaceMatch: boolean;
};

function stringifyNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function buildFormStateFromFormat(
  format: TournamentFormatValue,
  baseState?: Pick<CompetitionSettingsFormState, "scheduleStartDate">,
) {
  const defaults = buildDefaultCompetitionSettings(format);
  const groupStage = defaults.stages.find((stage) => stage.type === "GROUP_STAGE");
  const knockoutStage = defaults.stages.find((stage) => stage.type === "KNOCKOUT_STAGE");

  return {
    format,
    expectedTeamCount: stringifyNumber(defaults.expectedTeamCount),
    scheduleStartDate: baseState?.scheduleStartDate ?? "",
    scheduleMaxMatchesPerDay: stringifyNumber(defaults.scheduleMaxMatchesPerDay),
    scheduleMinimumRestDays: stringifyNumber(defaults.scheduleMinimumRestDays ?? 0),
    slotTimes: defaults.scheduleSlots.map((slot) => slot.startTime).join(", "),
    slotDurationMinutes: stringifyNumber(defaults.scheduleSlots[0]?.durationMinutes ?? 60),
    groupCount: groupStage ? String(groupStage.groupCount) : "",
    teamsPerGroup: groupStage ? String(groupStage.teamsPerGroup) : "",
    legs: groupStage ? String(groupStage.legs) : "",
    qualifiersPerGroup: groupStage ? String(groupStage.qualifiersPerGroup) : "",
    knockoutTeamCount: knockoutStage ? String(knockoutStage.knockoutTeamCount) : "",
    knockoutRound: knockoutStage ? knockoutStage.knockoutRound : "",
    pairingRule: knockoutStage?.pairingRule ?? "",
    includeThirdPlaceMatch: knockoutStage?.includeThirdPlaceMatch ?? false,
  } satisfies CompetitionSettingsFormState;
}

function buildInitialFormState(
  props: DashboardTournamentCompetitionSettingsFormProps,
): CompetitionSettingsFormState {
  const defaults = buildFormStateFromFormat(props.initialFormat, {
    scheduleStartDate: props.initialScheduleStartDate,
  });

  return {
    ...defaults,
    expectedTeamCount:
      props.initialExpectedTeamCount === null
        ? defaults.expectedTeamCount
        : String(props.initialExpectedTeamCount),
    scheduleMaxMatchesPerDay:
      props.initialScheduleMaxMatchesPerDay === null
        ? defaults.scheduleMaxMatchesPerDay
        : String(props.initialScheduleMaxMatchesPerDay),
    scheduleMinimumRestDays:
      props.initialScheduleMinimumRestDays === null
        ? defaults.scheduleMinimumRestDays
        : String(props.initialScheduleMinimumRestDays),
    slotTimes: props.initialSlotTimes,
    slotDurationMinutes: String(props.initialSlotDurationMinutes),
    groupCount:
      props.initialGroupStageConfiguration === null
        ? defaults.groupCount
        : String(props.initialGroupStageConfiguration.groupCount),
    teamsPerGroup:
      props.initialGroupStageConfiguration === null
        ? defaults.teamsPerGroup
        : String(props.initialGroupStageConfiguration.teamsPerGroup),
    legs:
      props.initialGroupStageConfiguration === null
        ? defaults.legs
        : String(props.initialGroupStageConfiguration.legs),
    qualifiersPerGroup:
      props.initialGroupStageConfiguration === null
        ? defaults.qualifiersPerGroup
        : String(props.initialGroupStageConfiguration.qualifiersPerGroup),
    knockoutTeamCount:
      props.initialKnockoutStageConfiguration === null
        ? defaults.knockoutTeamCount
        : String(props.initialKnockoutStageConfiguration.knockoutTeamCount),
    knockoutRound:
      props.initialKnockoutStageConfiguration === null
        ? defaults.knockoutRound
        : props.initialKnockoutStageConfiguration.knockoutRound,
    pairingRule:
      props.initialKnockoutStageConfiguration?.pairingRule ?? defaults.pairingRule,
    includeThirdPlaceMatch:
      props.initialKnockoutStageConfiguration?.includeThirdPlaceMatch ?? defaults.includeThirdPlaceMatch,
  };
}

function parseOptionalPositiveInteger(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function parseOptionalNonNegativeInteger(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

function renderStatusLabel(status: DashboardTournamentCompetitionSettingsFormProps["status"]) {
  switch (status) {
    case "COMPLETE":
      return "Completa";
    case "INCOMPLETE":
      return "Incompleta";
    case "LOCKED":
      return "Bloccata";
  }
}

function buildPreviewSettings(state: CompetitionSettingsFormState): Pick<
  TournamentCompetitionSettingsInput,
  "scheduleMaxMatchesPerDay" | "stages"
> {
  const scheduleMaxMatchesPerDay = parseOptionalPositiveInteger(state.scheduleMaxMatchesPerDay);

  switch (state.format) {
    case "SINGLE_ROUND_ROBIN":
      return {
        scheduleMaxMatchesPerDay,
        stages: [
          {
            type: "GROUP_STAGE",
            name: "Girone unico",
            order: 1,
            groupCount: 1,
            teamsPerGroup: parseOptionalPositiveInteger(state.expectedTeamCount) ?? 0,
            legs: 1,
            qualifiersPerGroup: 0,
            stageBreakDaysAfter: 0,
          },
        ],
      };
    case "DOUBLE_ROUND_ROBIN":
      return {
        scheduleMaxMatchesPerDay,
        stages: [
          {
            type: "GROUP_STAGE",
            name: "Girone unico",
            order: 1,
            groupCount: 1,
            teamsPerGroup: parseOptionalPositiveInteger(state.expectedTeamCount) ?? 0,
            legs: 2,
            qualifiersPerGroup: 0,
            stageBreakDaysAfter: 0,
          },
        ],
      };
    case "GROUPS_ONLY":
      return {
        scheduleMaxMatchesPerDay,
        stages: [
          {
            type: "GROUP_STAGE",
            name: "Fase a gironi",
            order: 1,
            groupCount: parseOptionalPositiveInteger(state.groupCount) ?? 0,
            teamsPerGroup: parseOptionalPositiveInteger(state.teamsPerGroup) ?? 0,
            legs: parseOptionalPositiveInteger(state.legs) ?? 0,
            qualifiersPerGroup: parseOptionalNonNegativeInteger(state.qualifiersPerGroup) ?? 0,
            stageBreakDaysAfter: 0,
          },
        ],
      };
    case "GROUPS_THEN_KNOCKOUT":
      return {
        scheduleMaxMatchesPerDay,
        stages: [
          {
            type: "GROUP_STAGE",
            name: "Fase a gironi",
            order: 1,
            groupCount: parseOptionalPositiveInteger(state.groupCount) ?? 0,
            teamsPerGroup: parseOptionalPositiveInteger(state.teamsPerGroup) ?? 0,
            legs: parseOptionalPositiveInteger(state.legs) ?? 0,
            qualifiersPerGroup: parseOptionalNonNegativeInteger(state.qualifiersPerGroup) ?? 0,
            stageBreakDaysAfter: 0,
          },
          {
            type: "KNOCKOUT_STAGE",
            name: "Fase finale",
            order: 2,
            knockoutTeamCount: parseOptionalPositiveInteger(state.knockoutTeamCount) ?? 0,
            knockoutRound: (state.knockoutRound || "FINAL") as KnockoutRoundValue,
            includeThirdPlaceMatch: state.includeThirdPlaceMatch,
            stageBreakDaysAfter: 0,
            pairingRule: state.pairingRule.trim() || "CROSS_ADJACENT_GROUPS",
          },
        ],
      };
    case "KNOCKOUT_ONLY":
      return {
        scheduleMaxMatchesPerDay,
        stages: [
          {
            type: "KNOCKOUT_STAGE",
            name: "Tabellone finale",
            order: 1,
            knockoutTeamCount: parseOptionalPositiveInteger(state.knockoutTeamCount) ?? 0,
            knockoutRound: (state.knockoutRound || "FINAL") as KnockoutRoundValue,
            includeThirdPlaceMatch: state.includeThirdPlaceMatch,
            stageBreakDaysAfter: 0,
            pairingRule: state.pairingRule.trim() || "SEEDED_BRACKET",
          },
        ],
      };
  }
}

export function DashboardTournamentCompetitionSettingsForm(
  props: DashboardTournamentCompetitionSettingsFormProps,
) {
  const [formState, setFormState] = useState(() => buildInitialFormState(props));
  const isGroupedFormat =
    formState.format === "GROUPS_ONLY" || formState.format === "GROUPS_THEN_KNOCKOUT";
  const isKnockoutFormat =
    formState.format === "GROUPS_THEN_KNOCKOUT" || formState.format === "KNOCKOUT_ONLY";
  const competitionPreview = buildTournamentFormatPreview(formState.format, buildPreviewSettings(formState));

  return (
    <article className="min-w-0 rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">1. Impostazioni torneo</h3>
          <p className="mt-2 text-sm text-slate-600">
            {getTournamentFormatDashboardMessage(formState.format)}
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
            props.status === "COMPLETE"
              ? "bg-emerald-100 text-emerald-800"
              : props.status === "LOCKED"
                ? "bg-rose-100 text-rose-800"
                : "bg-amber-100 text-amber-800"
          }`}
        >
          {renderStatusLabel(props.status)}
        </span>
      </div>

      {props.lockedMessage ? (
        <div className="mt-5 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          {props.lockedMessage}
        </div>
      ) : null}

      {!props.isLocked && props.status === "INCOMPLETE" ? (
        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          Salva una configurazione completa prima di passare all&apos;assegnazione dei gironi.
        </div>
      ) : null}

      <form action={saveTournamentCompetitionSettingsAction} className="mt-5 grid gap-5">
        <input type="hidden" name="tournamentId" value={props.tournamentId} />
        <input type="hidden" name="tournamentSlug" value={props.tournamentSlug} />

        <fieldset disabled={props.isLocked} className="grid gap-5 disabled:opacity-60">
          <div className="grid gap-5 xl:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Formula torneo
              <select
                name="format"
                value={formState.format}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...buildFormStateFromFormat(event.target.value as TournamentFormatValue, {
                      scheduleStartDate: currentState.scheduleStartDate,
                    }),
                  }))
                }
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              >
                {TOURNAMENT_FORMAT_VALUES.map((format) => (
                  <option key={format} value={format}>
                    {getTournamentFormatLabel(format)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Numero squadre previsto
              <input
                type="number"
                name="expectedTeamCount"
                min="2"
                required
                value={formState.expectedTeamCount}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    expectedTeamCount: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Data di inizio calendario
              <input
                type="date"
                name="scheduleStartDate"
                value={formState.scheduleStartDate}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    scheduleStartDate: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Partite massime al giorno
              <input
                type="number"
                name="scheduleMaxMatchesPerDay"
                min="1"
                required
                value={formState.scheduleMaxMatchesPerDay}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    scheduleMaxMatchesPerDay: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Giorni minimi di riposo
              <input
                type="number"
                name="scheduleMinimumRestDays"
                min="0"
                required
                value={formState.scheduleMinimumRestDays}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    scheduleMinimumRestDays: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Orari giornalieri
              <input
                name="slotTimes"
                required
                value={formState.slotTimes}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    slotTimes: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
              <span className="text-xs font-normal text-slate-500">
                Inserisci gli orari separati da virgola, per esempio `22:00, 23:00`.
              </span>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Durata slot (minuti)
              <input
                type="number"
                name="slotDurationMinutes"
                min="15"
                required
                value={formState.slotDurationMinutes}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    slotDurationMinutes: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>
          </div>

          {isGroupedFormat ? (
            <div className="grid gap-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 xl:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Numero gironi
                <input
                  type="number"
                  name="groupCount"
                  min="1"
                  value={formState.groupCount}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      groupCount: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Squadre per girone
                <input
                  type="number"
                  name="teamsPerGroup"
                  min="2"
                  value={formState.teamsPerGroup}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      teamsPerGroup: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Andata/ritorno
                <input
                  type="number"
                  name="legs"
                  min="1"
                  value={formState.legs}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      legs: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Qualificate per girone
                <input
                  type="number"
                  name="qualifiersPerGroup"
                  min="0"
                  value={formState.qualifiersPerGroup}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      qualifiersPerGroup: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </label>
            </div>
          ) : (
            <>
              <input type="hidden" name="groupCount" value="" />
              <input type="hidden" name="teamsPerGroup" value="" />
              <input type="hidden" name="legs" value="" />
              <input type="hidden" name="qualifiersPerGroup" value="" />
            </>
          )}

          {isKnockoutFormat ? (
            <div className="grid gap-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 xl:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Squadre in fase finale
                <input
                  type="number"
                  name="knockoutTeamCount"
                  min="2"
                  value={formState.knockoutTeamCount}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      knockoutTeamCount: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Turno iniziale
                <select
                  name="knockoutRound"
                  value={formState.knockoutRound}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      knockoutRound: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                >
                  <option value="ROUND_OF_32">Sedicesimi</option>
                  <option value="ROUND_OF_16">Ottavi</option>
                  <option value="QUARTER_FINAL">Quarti</option>
                  <option value="SEMI_FINAL">Semifinali</option>
                  <option value="FINAL">Finale</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Regola abbinamenti
                <input
                  name="pairingRule"
                  value={formState.pairingRule}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      pairingRule: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  name="includeThirdPlaceMatch"
                  checked={formState.includeThirdPlaceMatch}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      includeThirdPlaceMatch: event.target.checked,
                    }))
                  }
                />
                Includi finale 3° posto
              </label>
            </div>
          ) : (
            <>
              <input type="hidden" name="knockoutTeamCount" value="" />
              <input type="hidden" name="knockoutRound" value="" />
              <input type="hidden" name="pairingRule" value="" />
              <input type="hidden" name="includeThirdPlaceMatch" value="" />
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Gironi</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{competitionPreview.groupCount}</p>
            </article>
            <article className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Partite gironi</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {competitionPreview.groupStageMatchCount}
              </p>
            </article>
            <article className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Partite fase finale</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {competitionPreview.knockoutRoundCounts.quarterFinals +
                  competitionPreview.knockoutRoundCounts.semiFinals +
                  competitionPreview.knockoutRoundCounts.finals +
                  competitionPreview.knockoutRoundCounts.thirdPlaceMatches}
              </p>
            </article>
            <article className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Giornate minime</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {competitionPreview.estimatedMinimumMatchDays}
              </p>
            </article>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-fit"
            >
              Salva impostazioni torneo
            </button>
            <p className="text-sm text-slate-500">
              Anteprima: {competitionPreview.totalMatchCount} partite totali, con{" "}
              {competitionPreview.knockoutRoundCounts.quarterFinals} quarti,{" "}
              {competitionPreview.knockoutRoundCounts.semiFinals} semifinali,{" "}
              {competitionPreview.knockoutRoundCounts.finals} finale
              {competitionPreview.knockoutRoundCounts.thirdPlaceMatches > 0
                ? " e finale 3° posto."
                : "."}
            </p>
          </div>
        </fieldset>
      </form>
    </article>
  );
}
