import type { ZodError } from "zod";

import type { SaveTournamentCompetitionSettingsInput } from "@/features/tournaments/schemas/save-tournament-competition-settings.schema";
import type { TournamentCompetitionSettingsInput } from "@/features/tournaments/types/tournament-format.types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function extractCompetitionSettingsFormInput(formData: FormData) {
  return {
    tournamentId: formData.get("tournamentId"),
    tournamentSlug: formData.get("tournamentSlug"),
    format: formData.get("format"),
    expectedTeamCount: formData.get("expectedTeamCount"),
    groupCount: formData.get("groupCount"),
    teamsPerGroup: formData.get("teamsPerGroup"),
    legs: formData.get("legs"),
    qualifiersPerGroup: formData.get("qualifiersPerGroup"),
    knockoutTeamCount: formData.get("knockoutTeamCount"),
    knockoutRound: formData.get("knockoutRound"),
    includeThirdPlaceMatch: formData.get("includeThirdPlaceMatch"),
    pairingRule: formData.get("pairingRule"),
    scheduleStartDate: formData.get("scheduleStartDate"),
    scheduleMaxMatchesPerDay: formData.get("scheduleMaxMatchesPerDay"),
    scheduleMinimumRestDays: formData.get("scheduleMinimumRestDays"),
    slotTimes: formData.get("slotTimes"),
    slotDurationMinutes: formData.get("slotDurationMinutes"),
  };
}

export function summarizeCompetitionSettingsFormInput(
  input: ReturnType<typeof extractCompetitionSettingsFormInput>,
) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, typeof value === "string" ? value : value ?? null]),
  );
}

export function summarizeCompetitionSettingsValidationErrors(error: ZodError) {
  return error.flatten().fieldErrors;
}

export function parseSlotTimes(slotTimes: string, slotDurationMinutes: number) {
  const uniqueTimes = Array.from(
    new Set(
      slotTimes
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );

  assert(uniqueTimes.length > 0, "At least one daily slot is required.");

  return uniqueTimes.map((startTime, index) => ({
    sequence: index + 1,
    startTime,
    durationMinutes: slotDurationMinutes,
  }));
}

export function buildCompetitionSettingsFromParsedInput(
  parsed: SaveTournamentCompetitionSettingsInput,
): TournamentCompetitionSettingsInput {
  assert(parsed.expectedTeamCount, "Expected team count is required.");
  assert(parsed.scheduleMaxMatchesPerDay, "Maximum matches per day is required.");
  assert(parsed.slotDurationMinutes, "Slot duration is required.");

  const scheduleSlots = parseSlotTimes(parsed.slotTimes, parsed.slotDurationMinutes);
  const scheduleMinimumRestDays = parsed.scheduleMinimumRestDays ?? 0;

  switch (parsed.format) {
    case "SINGLE_ROUND_ROBIN":
      return {
        expectedTeamCount: parsed.expectedTeamCount,
        scheduleStartDate: parsed.scheduleStartDate,
        scheduleMaxMatchesPerDay: parsed.scheduleMaxMatchesPerDay,
        scheduleMinimumRestDays,
        scheduleSlots,
        stages: [
          {
            type: "GROUP_STAGE",
            name: "Girone unico",
            order: 1,
            groupCount: 1,
            teamsPerGroup: parsed.expectedTeamCount,
            legs: 1,
            qualifiersPerGroup: 0,
            stageBreakDaysAfter: 0,
          },
        ],
      };
    case "DOUBLE_ROUND_ROBIN":
      return {
        expectedTeamCount: parsed.expectedTeamCount,
        scheduleStartDate: parsed.scheduleStartDate,
        scheduleMaxMatchesPerDay: parsed.scheduleMaxMatchesPerDay,
        scheduleMinimumRestDays,
        scheduleSlots,
        stages: [
          {
            type: "GROUP_STAGE",
            name: "Girone unico",
            order: 1,
            groupCount: 1,
            teamsPerGroup: parsed.expectedTeamCount,
            legs: 2,
            qualifiersPerGroup: 0,
            stageBreakDaysAfter: 0,
          },
        ],
      };
    case "GROUPS_ONLY":
      assert(parsed.groupCount, "Group count is required.");
      assert(parsed.teamsPerGroup, "Teams per group is required.");
      assert(parsed.legs, "Leg count is required.");
      assert(parsed.qualifiersPerGroup !== null, "Qualifiers per group is required.");

      return {
        expectedTeamCount: parsed.expectedTeamCount,
        scheduleStartDate: parsed.scheduleStartDate,
        scheduleMaxMatchesPerDay: parsed.scheduleMaxMatchesPerDay,
        scheduleMinimumRestDays,
        scheduleSlots,
        stages: [
          {
            type: "GROUP_STAGE",
            name: "Fase a gironi",
            order: 1,
            groupCount: parsed.groupCount,
            teamsPerGroup: parsed.teamsPerGroup,
            legs: parsed.legs,
            qualifiersPerGroup: parsed.qualifiersPerGroup,
            stageBreakDaysAfter: 0,
          },
        ],
      };
    case "GROUPS_THEN_KNOCKOUT":
      assert(parsed.groupCount, "Group count is required.");
      assert(parsed.teamsPerGroup, "Teams per group is required.");
      assert(parsed.legs, "Leg count is required.");
      assert(parsed.qualifiersPerGroup !== null, "Qualifiers per group is required.");
      assert(parsed.knockoutTeamCount, "Knockout entry size is required.");
      assert(parsed.knockoutRound, "Knockout starting round is required.");

      return {
        expectedTeamCount: parsed.expectedTeamCount,
        scheduleStartDate: parsed.scheduleStartDate,
        scheduleMaxMatchesPerDay: parsed.scheduleMaxMatchesPerDay,
        scheduleMinimumRestDays,
        scheduleSlots,
        stages: [
          {
            type: "GROUP_STAGE",
            name: "Fase a gironi",
            order: 1,
            groupCount: parsed.groupCount,
            teamsPerGroup: parsed.teamsPerGroup,
            legs: parsed.legs,
            qualifiersPerGroup: parsed.qualifiersPerGroup,
            stageBreakDaysAfter: 0,
          },
          {
            type: "KNOCKOUT_STAGE",
            name: "Fase finale",
            order: 2,
            knockoutTeamCount: parsed.knockoutTeamCount,
            knockoutRound: parsed.knockoutRound,
            includeThirdPlaceMatch: parsed.includeThirdPlaceMatch,
            stageBreakDaysAfter: 0,
            pairingRule: parsed.pairingRule ?? "CROSS_ADJACENT_GROUPS",
          },
        ],
      };
    case "KNOCKOUT_ONLY":
      assert(parsed.knockoutTeamCount, "Knockout entry size is required.");
      assert(parsed.knockoutRound, "Knockout starting round is required.");

      return {
        expectedTeamCount: parsed.expectedTeamCount,
        scheduleStartDate: parsed.scheduleStartDate,
        scheduleMaxMatchesPerDay: parsed.scheduleMaxMatchesPerDay,
        scheduleMinimumRestDays,
        scheduleSlots,
        stages: [
          {
            type: "KNOCKOUT_STAGE",
            name: "Tabellone finale",
            order: 1,
            knockoutTeamCount: parsed.knockoutTeamCount,
            knockoutRound: parsed.knockoutRound,
            includeThirdPlaceMatch: parsed.includeThirdPlaceMatch,
            stageBreakDaysAfter: 0,
            pairingRule: parsed.pairingRule ?? "SEEDED_BRACKET",
          },
        ],
      };
  }
}

export function validateCompetitionSettings(settings: TournamentCompetitionSettingsInput) {
  const groupedStage = settings.stages.find((stage) => stage.type === "GROUP_STAGE");
  const knockoutStage = settings.stages.find((stage) => stage.type === "KNOCKOUT_STAGE");

  if (groupedStage) {
    assert(
      groupedStage.groupCount * groupedStage.teamsPerGroup === settings.expectedTeamCount,
      "Expected team count must equal group count multiplied by teams per group.",
    );
    assert(
      groupedStage.qualifiersPerGroup <= groupedStage.teamsPerGroup,
      "Qualifiers per group cannot exceed teams per group.",
    );
  }

  if (groupedStage && knockoutStage) {
    assert(
      groupedStage.groupCount * groupedStage.qualifiersPerGroup === knockoutStage.knockoutTeamCount,
      "Knockout entry size must match the total number of qualifiers from the group stage.",
    );
  }

  assert(
    settings.scheduleMaxMatchesPerDay !== null &&
      settings.scheduleMaxMatchesPerDay <= settings.scheduleSlots.length,
    "Maximum matches per day cannot exceed the number of configured daily slots.",
  );
}
