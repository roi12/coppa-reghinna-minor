export const TOURNAMENT_FORMAT_VALUES = [
  "ROUND_ROBIN",
  "KNOCKOUT",
  "GROUPS_PLUS_KNOCKOUT",
] as const;

export type TournamentFormatValue = (typeof TOURNAMENT_FORMAT_VALUES)[number];

export type KnockoutRoundDefinition = {
  id: string;
  label: string;
  sequence: number;
  bestOf: 1 | 3 | 5 | 7;
  expectedMatchCount: number;
};

export type KnockoutBracketDefinition = {
  format: "KNOCKOUT";
  thirdPlaceMatch: boolean;
  rounds: KnockoutRoundDefinition[];
  seedingNotes: string[];
};

export type GroupStageDefinition = {
  id: string;
  name: string;
  teamCount: number;
  qualifierCount: number;
};

export type KnockoutQualificationRule = {
  sourceGroupId: string;
  finishingPosition: number;
  bracketSlotLabel: string;
};

export type GroupsPlusKnockoutDefinition = {
  format: "GROUPS_PLUS_KNOCKOUT";
  groups: GroupStageDefinition[];
  knockoutRounds: KnockoutRoundDefinition[];
  qualificationRules: KnockoutQualificationRule[];
};
