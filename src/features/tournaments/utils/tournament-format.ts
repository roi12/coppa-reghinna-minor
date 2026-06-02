import type {
  GroupStageDefinition,
  GroupsPlusKnockoutDefinition,
  KnockoutBracketDefinition,
  TournamentFormatValue,
} from "@/features/tournaments/types/tournament-format.types";

const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormatValue, string> = {
  ROUND_ROBIN: "Girone unico",
  KNOCKOUT: "Eliminazione diretta",
  GROUPS_PLUS_KNOCKOUT: "Gironi + eliminazione diretta",
};

const TOURNAMENT_FORMAT_DESCRIPTIONS: Record<TournamentFormatValue, string> = {
  ROUND_ROBIN: "Each team plays every other team once in a single league table.",
  KNOCKOUT: "Teams advance through elimination rounds toward a final bracket.",
  GROUPS_PLUS_KNOCKOUT:
    "Teams start in groups before the top finishers advance into knockout rounds.",
};

export const EMPTY_KNOCKOUT_BRACKET_FOUNDATION: KnockoutBracketDefinition = {
  format: "KNOCKOUT",
  thirdPlaceMatch: false,
  rounds: [],
  seedingNotes: [],
};

export const EMPTY_GROUP_STAGE_FOUNDATION: GroupStageDefinition[] = [];

export const EMPTY_GROUPS_PLUS_KNOCKOUT_FOUNDATION: GroupsPlusKnockoutDefinition = {
  format: "GROUPS_PLUS_KNOCKOUT",
  groups: EMPTY_GROUP_STAGE_FOUNDATION,
  knockoutRounds: [],
  qualificationRules: [],
};

export function getTournamentFormatLabel(format: TournamentFormatValue) {
  return TOURNAMENT_FORMAT_LABELS[format];
}

export function getTournamentFormatDescription(format: TournamentFormatValue) {
  return TOURNAMENT_FORMAT_DESCRIPTIONS[format];
}

export function getTournamentFormatDashboardMessage(format: TournamentFormatValue) {
  switch (format) {
    case "ROUND_ROBIN":
      return "Calendar generation is available now for this format.";
    case "KNOCKOUT":
      return "Knockout bracket generation is coming soon. Manual match entry remains available.";
    case "GROUPS_PLUS_KNOCKOUT":
      return "Group-stage generation is available after groups are configured. Knockout-stage generation is coming later. Manual match entry remains available.";
  }
}
