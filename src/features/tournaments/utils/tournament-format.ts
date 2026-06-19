import type {
  PersistedTournamentFormatValue,
  TournamentFormatValue,
} from "@/features/tournaments/types/tournament-format.types";

const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormatValue, string> = {
  SINGLE_ROUND_ROBIN: "Girone unico",
  DOUBLE_ROUND_ROBIN: "Girone unico andata e ritorno",
  GROUPS_ONLY: "Solo gironi",
  GROUPS_THEN_KNOCKOUT: "Gironi + eliminazione diretta",
  KNOCKOUT_ONLY: "Eliminazione diretta",
};

const TOURNAMENT_FORMAT_DESCRIPTIONS: Record<TournamentFormatValue, string> = {
  SINGLE_ROUND_ROBIN: "Each team plays every other team once in a single league table.",
  DOUBLE_ROUND_ROBIN: "Each team plays every other team twice, home and away.",
  GROUPS_ONLY: "Teams are split into groups and play only the configured group stage.",
  GROUPS_THEN_KNOCKOUT: "Teams start in groups before the top finishers advance into knockout rounds.",
  KNOCKOUT_ONLY: "Teams advance through elimination rounds toward a final bracket.",
};

export function normalizeTournamentFormat(
  format: PersistedTournamentFormatValue,
): TournamentFormatValue {
  switch (format) {
    case "ROUND_ROBIN":
      return "SINGLE_ROUND_ROBIN";
    case "KNOCKOUT":
      return "KNOCKOUT_ONLY";
    case "GROUPS_PLUS_KNOCKOUT":
      return "GROUPS_THEN_KNOCKOUT";
    default:
      return format;
  }
}

export function getTournamentFormatLabel(format: PersistedTournamentFormatValue) {
  return TOURNAMENT_FORMAT_LABELS[normalizeTournamentFormat(format)];
}

export function getTournamentFormatDescription(format: PersistedTournamentFormatValue) {
  return TOURNAMENT_FORMAT_DESCRIPTIONS[normalizeTournamentFormat(format)];
}

export function getTournamentFormatDashboardMessage(format: PersistedTournamentFormatValue) {
  switch (normalizeTournamentFormat(format)) {
    case "SINGLE_ROUND_ROBIN":
    case "DOUBLE_ROUND_ROBIN":
      return "Competition generation and calendar scheduling are available for league-style tournaments.";
    case "GROUPS_ONLY":
      return "Configure the group stage, assign teams, and generate only the group fixtures.";
    case "GROUPS_THEN_KNOCKOUT":
      return "Configure groups, qualification, and knockout structure before generating and scheduling the competition.";
    case "KNOCKOUT_ONLY":
      return "Knockout structure and scheduling are available once the tournament format is fully configured.";
  }
}

export function isGroupedTournamentFormat(format: PersistedTournamentFormatValue) {
  const normalized = normalizeTournamentFormat(format);
  return normalized === "GROUPS_ONLY" || normalized === "GROUPS_THEN_KNOCKOUT";
}

export function isKnockoutTournamentFormat(format: PersistedTournamentFormatValue) {
  const normalized = normalizeTournamentFormat(format);
  return normalized === "GROUPS_THEN_KNOCKOUT" || normalized === "KNOCKOUT_ONLY";
}
