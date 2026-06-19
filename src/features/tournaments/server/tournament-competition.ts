import { estimateMinimumMatchDays } from "@/features/tournaments/server/schedule-competition";
import type {
  CompetitionStageDefinition,
} from "@/features/tournaments/types/competition.types";
import type {
  PersistedTournamentFormatValue,
  TournamentCompetitionSettingsInput,
  TournamentFormatPreview,
  TournamentFormatValue,
  TournamentScheduleSlotInput,
  KnockoutRoundValue,
} from "@/features/tournaments/types/tournament-format.types";
import { normalizeTournamentFormat } from "@/features/tournaments/utils/tournament-format";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function parseScheduleSlotStartMinutes(startTime: string) {
  const [hoursValue, minutesValue] = startTime.split(":");
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);

  assert(
    Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59,
    "Schedule slots must use a valid HH:MM time.",
  );

  return hours * 60 + minutes;
}

export function formatScheduleSlotStartTime(startMinutes: number) {
  const hours = Math.floor(startMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (startMinutes % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

export function buildDefaultScheduleSlots(): TournamentScheduleSlotInput[] {
  return [
    {
      sequence: 1,
      startTime: "22:00",
      durationMinutes: 60,
    },
    {
      sequence: 2,
      startTime: "23:00",
      durationMinutes: 60,
    },
  ];
}

export function buildDefaultCompetitionSettings(
  format: TournamentFormatValue,
): TournamentCompetitionSettingsInput {
  switch (format) {
    case "SINGLE_ROUND_ROBIN":
      return {
        expectedTeamCount: 4,
        scheduleStartDate: null,
        scheduleMaxMatchesPerDay: 2,
        scheduleMinimumRestDays: 0,
        scheduleSlots: buildDefaultScheduleSlots(),
        stages: [
          {
            type: "GROUP_STAGE",
            name: "Girone unico",
            order: 1,
            groupCount: 1,
            teamsPerGroup: 4,
            legs: 1,
            qualifiersPerGroup: 0,
            stageBreakDaysAfter: 0,
          },
        ],
      };
    case "DOUBLE_ROUND_ROBIN":
      return {
        expectedTeamCount: 4,
        scheduleStartDate: null,
        scheduleMaxMatchesPerDay: 2,
        scheduleMinimumRestDays: 0,
        scheduleSlots: buildDefaultScheduleSlots(),
        stages: [
          {
            type: "GROUP_STAGE",
            name: "Girone unico",
            order: 1,
            groupCount: 1,
            teamsPerGroup: 4,
            legs: 2,
            qualifiersPerGroup: 0,
            stageBreakDaysAfter: 0,
          },
        ],
      };
    case "GROUPS_ONLY":
      return {
        expectedTeamCount: 16,
        scheduleStartDate: null,
        scheduleMaxMatchesPerDay: 2,
        scheduleMinimumRestDays: 0,
        scheduleSlots: buildDefaultScheduleSlots(),
        stages: [
          {
            type: "GROUP_STAGE",
            name: "Fase a gironi",
            order: 1,
            groupCount: 4,
            teamsPerGroup: 4,
            legs: 1,
            qualifiersPerGroup: 2,
            stageBreakDaysAfter: 0,
          },
        ],
      };
    case "GROUPS_THEN_KNOCKOUT":
      return {
        expectedTeamCount: 16,
        scheduleStartDate: null,
        scheduleMaxMatchesPerDay: 2,
        scheduleMinimumRestDays: 0,
        scheduleSlots: buildDefaultScheduleSlots(),
        stages: [
          {
            type: "GROUP_STAGE",
            name: "Fase a gironi",
            order: 1,
            groupCount: 4,
            teamsPerGroup: 4,
            legs: 1,
            qualifiersPerGroup: 2,
            stageBreakDaysAfter: 0,
          },
          {
            type: "KNOCKOUT_STAGE",
            name: "Fase finale",
            order: 2,
            knockoutTeamCount: 8,
            knockoutRound: "QUARTER_FINAL",
            includeThirdPlaceMatch: false,
            stageBreakDaysAfter: 0,
            pairingRule: "CROSS_ADJACENT_GROUPS",
          },
        ],
      };
    case "KNOCKOUT_ONLY":
      return {
        expectedTeamCount: 8,
        scheduleStartDate: null,
        scheduleMaxMatchesPerDay: 2,
        scheduleMinimumRestDays: 0,
        scheduleSlots: buildDefaultScheduleSlots(),
        stages: [
          {
            type: "KNOCKOUT_STAGE",
            name: "Tabellone finale",
            order: 1,
            knockoutTeamCount: 8,
            knockoutRound: "QUARTER_FINAL",
            includeThirdPlaceMatch: false,
            stageBreakDaysAfter: 0,
            pairingRule: "SEEDED_BRACKET",
          },
        ],
      };
  }
}

function getGroupStageMatchCount(stage: Extract<CompetitionStageDefinition, { type: "GROUP_STAGE" }>) {
  const matchesPerGroup = (stage.teamsPerGroup * (stage.teamsPerGroup - 1)) / 2;
  return stage.groupCount * matchesPerGroup * stage.legs;
}

function getKnockoutMatchCount(stage: Extract<CompetitionStageDefinition, { type: "KNOCKOUT_STAGE" }>) {
  let teamCount = stage.knockoutTeamCount;
  let total = 0;

  while (teamCount > 1) {
    total += teamCount / 2;
    teamCount /= 2;
  }

  if (stage.includeThirdPlaceMatch) {
    total += 1;
  }

  return total;
}

export function buildTournamentFormatPreview(
  format: TournamentFormatValue,
  settings: Pick<TournamentCompetitionSettingsInput, "scheduleMaxMatchesPerDay" | "stages">,
): TournamentFormatPreview {
  const groupStage = settings.stages.find(
    (stage): stage is Extract<CompetitionStageDefinition, { type: "GROUP_STAGE" }> =>
      stage.type === "GROUP_STAGE",
  );
  const knockoutStage = settings.stages.find(
    (stage): stage is Extract<CompetitionStageDefinition, { type: "KNOCKOUT_STAGE" }> =>
      stage.type === "KNOCKOUT_STAGE",
  );

  const groupStageMatchCount = groupStage ? getGroupStageMatchCount(groupStage) : 0;
  const knockoutMatchCount = knockoutStage ? getKnockoutMatchCount(knockoutStage) : 0;
  const quarterFinals =
    knockoutStage?.knockoutRound === "QUARTER_FINAL" ? knockoutStage.knockoutTeamCount / 2 : 0;
  const semiFinals =
    knockoutStage?.knockoutRound === "QUARTER_FINAL"
      ? knockoutStage.knockoutTeamCount / 4
      : knockoutStage?.knockoutRound === "SEMI_FINAL"
        ? knockoutStage.knockoutTeamCount / 2
        : 0;
  const finals =
    knockoutStage?.knockoutRound === "FINAL"
      ? 1
      : knockoutStage
        ? 1
        : 0;
  const totalMatchCount = groupStageMatchCount + knockoutMatchCount;

  return {
    groupCount: groupStage?.groupCount ?? 0,
    groupStageMatchCount,
    knockoutRoundCounts: {
      quarterFinals,
      semiFinals,
      finals,
      thirdPlaceMatches: knockoutStage?.includeThirdPlaceMatch ? 1 : 0,
    },
    totalMatchCount,
    estimatedMinimumMatchDays: estimateMinimumMatchDays(
      totalMatchCount,
      settings.scheduleMaxMatchesPerDay ?? 1,
    ),
  };
}

function parseStageConfiguration(configuration: unknown) {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    return {};
  }

  return configuration as Record<string, unknown>;
}

type PersistedStage = {
  id: string;
  order: number;
  type: "GROUP_STAGE" | "KNOCKOUT_STAGE";
  name: string;
  groupCount: number | null;
  teamsPerGroup: number | null;
  legs: number | null;
  qualifiersPerGroup: number | null;
  knockoutTeamCount: number | null;
  knockoutRound: string | null;
  includeThirdPlaceMatch: boolean | null;
  stageBreakDaysAfter: number | null;
  configuration: unknown;
};

export function mapPersistedStagesToCompetitionInput(stages: PersistedStage[]) {
  return stages
    .sort((left, right) => left.order - right.order)
    .map((stage): CompetitionStageDefinition => {
      if (stage.type === "GROUP_STAGE") {
        return {
          stageId: stage.id,
          type: stage.type,
          order: stage.order,
          name: stage.name,
          groupCount: stage.groupCount ?? 1,
          teamsPerGroup: stage.teamsPerGroup ?? 0,
          legs: stage.legs ?? 1,
          qualifiersPerGroup: stage.qualifiersPerGroup ?? 0,
          stageBreakDaysAfter: stage.stageBreakDaysAfter ?? 0,
        };
      }

      const configuration = parseStageConfiguration(stage.configuration);

      return {
        stageId: stage.id,
        type: stage.type,
        order: stage.order,
        name: stage.name,
        knockoutTeamCount: stage.knockoutTeamCount ?? 0,
        knockoutRound: (stage.knockoutRound as KnockoutRoundValue | null) ?? "FINAL",
        includeThirdPlaceMatch: stage.includeThirdPlaceMatch ?? false,
        stageBreakDaysAfter: stage.stageBreakDaysAfter ?? 0,
        pairingRule:
          typeof configuration.pairingRule === "string" ? configuration.pairingRule : null,
      };
    });
}

export function deriveTournamentFormatFromPersistedStages(
  stages: PersistedStage[],
  fallbackFormat: PersistedTournamentFormatValue,
): TournamentFormatValue {
  if (stages.length === 0) {
    return normalizeTournamentFormat(fallbackFormat);
  }

  const mappedStages = mapPersistedStagesToCompetitionInput(stages);
  const groupStage = mappedStages.find(
    (stage): stage is Extract<CompetitionStageDefinition, { type: "GROUP_STAGE" }> =>
      stage.type === "GROUP_STAGE",
  );
  const knockoutStage = mappedStages.find(
    (stage): stage is Extract<CompetitionStageDefinition, { type: "KNOCKOUT_STAGE" }> =>
      stage.type === "KNOCKOUT_STAGE",
  );

  if (groupStage && knockoutStage) {
    return "GROUPS_THEN_KNOCKOUT";
  }

  if (groupStage) {
    if (groupStage.groupCount === 1 && groupStage.qualifiersPerGroup === 0) {
      return groupStage.legs >= 2 ? "DOUBLE_ROUND_ROBIN" : "SINGLE_ROUND_ROBIN";
    }

    return "GROUPS_ONLY";
  }

  if (knockoutStage) {
    return "KNOCKOUT_ONLY";
  }

  return normalizeTournamentFormat(fallbackFormat);
}
