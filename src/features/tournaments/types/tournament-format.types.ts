export const LEGACY_TOURNAMENT_FORMAT_VALUES = [
  "ROUND_ROBIN",
  "KNOCKOUT",
  "GROUPS_PLUS_KNOCKOUT",
] as const;

export const TOURNAMENT_FORMAT_VALUES = [
  "SINGLE_ROUND_ROBIN",
  "DOUBLE_ROUND_ROBIN",
  "GROUPS_ONLY",
  "GROUPS_THEN_KNOCKOUT",
  "KNOCKOUT_ONLY",
] as const;

export const PERSISTED_TOURNAMENT_FORMAT_VALUES = [
  ...LEGACY_TOURNAMENT_FORMAT_VALUES,
  ...TOURNAMENT_FORMAT_VALUES,
] as const;

export type LegacyTournamentFormatValue = (typeof LEGACY_TOURNAMENT_FORMAT_VALUES)[number];
export type TournamentFormatValue = (typeof TOURNAMENT_FORMAT_VALUES)[number];
export type PersistedTournamentFormatValue = (typeof PERSISTED_TOURNAMENT_FORMAT_VALUES)[number];

export type TournamentStageTypeValue = "GROUP_STAGE" | "KNOCKOUT_STAGE";
export type KnockoutRoundValue =
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "FINAL"
  | "THIRD_PLACE";

export type MatchParticipantSourceTypeValue =
  | "DIRECT_TEAM"
  | "GROUP_POSITION"
  | "MATCH_WINNER"
  | "MATCH_LOSER";

export type TournamentScheduleSlotInput = {
  sequence: number;
  startTime: string;
  durationMinutes: number;
};

export type GroupStageConfigurationInput = {
  type: "GROUP_STAGE";
  name: string;
  order: number;
  groupCount: number;
  teamsPerGroup: number;
  legs: number;
  qualifiersPerGroup: number;
  stageBreakDaysAfter: number;
};

export type KnockoutStageConfigurationInput = {
  type: "KNOCKOUT_STAGE";
  name: string;
  order: number;
  knockoutTeamCount: number;
  knockoutRound: KnockoutRoundValue;
  includeThirdPlaceMatch: boolean;
  stageBreakDaysAfter: number;
  pairingRule: string | null;
};

export type TournamentStageConfigurationInput =
  | GroupStageConfigurationInput
  | KnockoutStageConfigurationInput;

export type TournamentCompetitionSettingsInput = {
  expectedTeamCount: number | null;
  scheduleStartDate: Date | null;
  scheduleMaxMatchesPerDay: number | null;
  scheduleMinimumRestDays: number | null;
  scheduleSlots: TournamentScheduleSlotInput[];
  stages: TournamentStageConfigurationInput[];
};

export type TournamentFormatPreview = {
  groupCount: number;
  groupStageMatchCount: number;
  knockoutRoundCounts: {
    quarterFinals: number;
    semiFinals: number;
    finals: number;
    thirdPlaceMatches: number;
  };
  totalMatchCount: number;
  estimatedMinimumMatchDays: number;
};
