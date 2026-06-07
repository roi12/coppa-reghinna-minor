export type TournamentDocument = {
  id: string;
  title: string;
  description: string;
  href: `/${string}`;
  downloadName: string;
};

export const TOURNAMENT_DOCUMENTS: TournamentDocument[] = [
  {
    id: "liability-waiver-adults",
    title: "Dichiarazione esonero responsabilit\u00E0 \u2014 maggiorenni",
    description: "Da compilare per i partecipanti maggiorenni.",
    href: "/documents/dichiarazione-esonero-maggiorenni.pdf",
    downloadName: "dichiarazione-esonero-maggiorenni.pdf",
  },
  {
    id: "liability-waiver-minors",
    title: "Dichiarazione esonero responsabilit\u00E0 \u2014 minorenni",
    description: "Da usare per i partecipanti minorenni con firma del genitore o tutore.",
    href: "/documents/dichiarazione-esonero-minorenni.pdf",
    downloadName: "dichiarazione-esonero-minorenni.pdf",
  },
  {
    id: "privacy-gdpr",
    title: "Informativa privacy / GDPR",
    description: "Informativa sul trattamento dei dati per la partecipazione al torneo.",
    href: "/documents/gdpr-coppa-reghinna-minor-2026.pdf",
    downloadName: "gdpr-coppa-reghinna-minor-2026.pdf",
  },
];
