import type {
  TeamRegistrationPlayerDocumentStatusValue,
  TeamRegistrationRosterPlayer,
} from "@/features/team-registrations/types/team-registration.types";

export const TEAM_REGISTRATION_PLAYER_DOCUMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const TEAM_REGISTRATION_PLAYER_DOCUMENT_ACCEPT =
  TEAM_REGISTRATION_PLAYER_DOCUMENT_ALLOWED_MIME_TYPES.join(",");

export const TEAM_REGISTRATION_PLAYER_DOCUMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const TEAM_REGISTRATION_PLAYER_DOCUMENT_MAX_SIZE_LABEL = "5 MB";

export const teamRegistrationPlayerDocumentStatusLabels: Record<
  TeamRegistrationPlayerDocumentStatusValue,
  string
> = {
  MISSING: "Mancante",
  UPLOADED: "Caricato",
  PAPER_DELIVERY: "Consegna cartacea",
};

export const teamRegistrationPlayerDocumentStatusBadgeClassNames: Record<
  TeamRegistrationPlayerDocumentStatusValue,
  string
> = {
  MISSING: "bg-slate-100 text-slate-700",
  UPLOADED: "bg-emerald-100 text-emerald-800",
  PAPER_DELIVERY: "bg-amber-100 text-amber-900",
};

export function summarizeTeamRegistrationPlayerDocuments(
  players: TeamRegistrationRosterPlayer[],
) {
  return players.reduce(
    (summary, player) => {
      if (player.documentStatus === "UPLOADED") {
        summary.uploaded += 1;
      } else if (player.documentStatus === "PAPER_DELIVERY") {
        summary.paperDelivery += 1;
      } else {
        summary.missing += 1;
      }

      return summary;
    },
    {
      uploaded: 0,
      paperDelivery: 0,
      missing: 0,
    },
  );
}

export function formatTeamRegistrationDocumentSize(sizeBytes: number | null) {
  if (!sizeBytes || sizeBytes <= 0) {
    return null;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
