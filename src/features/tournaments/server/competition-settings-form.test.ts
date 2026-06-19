import assert from "node:assert/strict";
import test from "node:test";

import { saveTournamentCompetitionSettingsSchema } from "@/features/tournaments/schemas/save-tournament-competition-settings.schema";
import {
  buildCompetitionSettingsFromParsedInput,
  extractCompetitionSettingsFormInput,
  summarizeCompetitionSettingsValidationErrors,
} from "@/features/tournaments/server/competition-settings-form";

function buildValidGroupKnockoutFormData() {
  const formData = new FormData();

  formData.set("tournamentId", "cm0000000000000000000001");
  formData.set("tournamentSlug", "coppa-reghinna-minor-2026");
  formData.set("format", "GROUPS_THEN_KNOCKOUT");
  formData.set("expectedTeamCount", "16");
  formData.set("groupCount", "4");
  formData.set("teamsPerGroup", "4");
  formData.set("legs", "1");
  formData.set("qualifiersPerGroup", "2");
  formData.set("knockoutTeamCount", "8");
  formData.set("knockoutRound", "QUARTER_FINAL");
  formData.set("pairingRule", "CROSS_ADJACENT_GROUPS");
  formData.set("scheduleStartDate", "2026-07-01");
  formData.set("scheduleMaxMatchesPerDay", "2");
  formData.set("scheduleMinimumRestDays", "0");
  formData.set("slotTimes", "22:00, 23:00");
  formData.set("slotDurationMinutes", "60");

  return formData;
}

test("valid competition settings FormData payload is accepted and parsed", () => {
  const formData = buildValidGroupKnockoutFormData();
  const parsed = saveTournamentCompetitionSettingsSchema.safeParse(
    extractCompetitionSettingsFormInput(formData),
  );

  assert.equal(parsed.success, true);

  if (!parsed.success) {
    return;
  }

  const settings = buildCompetitionSettingsFromParsedInput(parsed.data);

  assert.equal(settings.expectedTeamCount, 16);
  assert.equal(settings.scheduleSlots.length, 2);
  assert.deepEqual(
    settings.scheduleSlots.map((slot) => `${slot.startTime}/${slot.durationMinutes}`),
    ["22:00/60", "23:00/60"],
  );
  assert.equal(settings.stages.length, 2);
  assert.equal(settings.stages[0]?.type, "GROUP_STAGE");
  assert.equal(settings.stages[1]?.type, "KNOCKOUT_STAGE");
});

test("missing grouped configuration is rejected with field-level errors", () => {
  const formData = buildValidGroupKnockoutFormData();
  formData.set("groupCount", "");
  formData.set("teamsPerGroup", "");
  formData.set("legs", "");
  formData.set("qualifiersPerGroup", "");
  formData.set("knockoutTeamCount", "");
  formData.set("knockoutRound", "");

  const parsed = saveTournamentCompetitionSettingsSchema.safeParse(
    extractCompetitionSettingsFormInput(formData),
  );

  assert.equal(parsed.success, false);

  if (parsed.success) {
    return;
  }

  const fieldErrors = summarizeCompetitionSettingsValidationErrors(parsed.error) as Record<
    string,
    string[] | undefined
  >;

  assert.deepEqual(fieldErrors.groupCount, ["Group count is required for grouped tournaments."]);
  assert.deepEqual(fieldErrors.teamsPerGroup, ["Teams per group is required for grouped tournaments."]);
  assert.deepEqual(fieldErrors.legs, ["Leg count is required for grouped tournaments."]);
  assert.deepEqual(fieldErrors.knockoutTeamCount, ["Knockout entry size is required."]);
  assert.deepEqual(fieldErrors.knockoutRound, ["Knockout starting round is required."]);
});

test("includeThirdPlaceMatch false is parsed correctly when the checkbox is not submitted", () => {
  const formData = buildValidGroupKnockoutFormData();

  const parsed = saveTournamentCompetitionSettingsSchema.safeParse(
    extractCompetitionSettingsFormInput(formData),
  );

  assert.equal(parsed.success, true);

  if (!parsed.success) {
    return;
  }

  assert.equal(parsed.data.includeThirdPlaceMatch, false);
});

test("both configured schedule slots are preserved when building competition settings", () => {
  const formData = buildValidGroupKnockoutFormData();
  const parsed = saveTournamentCompetitionSettingsSchema.safeParse(
    extractCompetitionSettingsFormInput(formData),
  );

  assert.equal(parsed.success, true);

  if (!parsed.success) {
    return;
  }

  const settings = buildCompetitionSettingsFromParsedInput(parsed.data);

  assert.deepEqual(
    settings.scheduleSlots.map((slot) => slot.startTime),
    ["22:00", "23:00"],
  );
  assert.deepEqual(
    settings.scheduleSlots.map((slot) => slot.durationMinutes),
    [60, 60],
  );
});
