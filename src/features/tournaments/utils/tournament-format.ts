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
  SINGLE_ROUND_ROBIN: "Ogni squadra affronta tutte le altre una sola volta in un girone unico.",
  DOUBLE_ROUND_ROBIN: "Ogni squadra affronta tutte le altre due volte, andata e ritorno.",
  GROUPS_ONLY: "Le squadre vengono divise in gironi e disputano solo la fase a gironi configurata.",
  GROUPS_THEN_KNOCKOUT: "Le squadre partono dai gironi e poi passano alla fase finale a eliminazione diretta.",
  KNOCKOUT_ONLY: "Le squadre avanzano in un tabellone a eliminazione diretta fino alla finale.",
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
      return "Configura il girone unico e poi genera calendario e partite della competizione.";
    case "GROUPS_ONLY":
      return "Configura i gironi, assegna le squadre e genera solo le partite della fase a gironi.";
    case "GROUPS_THEN_KNOCKOUT":
      return "Configura gironi, qualificazioni e fase finale prima di generare il calendario del torneo.";
    case "KNOCKOUT_ONLY":
      return "Configura il tabellone a eliminazione diretta prima di generare e programmare le partite.";
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
