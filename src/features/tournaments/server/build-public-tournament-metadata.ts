import type { Metadata } from "next";

import { getTournamentBySlug } from "@/features/tournaments/server/get-tournament-by-slug";
import { getTournamentFormatLabel } from "@/features/tournaments/utils/tournament-format";
import { BRAND } from "@/lib/brand";

type BuildPublicTournamentMetadataOptions = {
  slug: string;
  path?: string;
  pageTitle?: string;
  pageDescription?: string;
};

export async function buildPublicTournamentMetadata({
  slug,
  path,
  pageTitle,
  pageDescription,
}: BuildPublicTournamentMetadataOptions): Promise<Metadata> {
  const tournament = await getTournamentBySlug(slug);

  if (!tournament) {
    return {
      title: `Torneo non trovato | ${BRAND.appName}`,
      description: "La pagina pubblica richiesta non è disponibile.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const tournamentLabel = `${tournament.name} | ${tournament.organizationName}`;
  const title = pageTitle ? `${pageTitle} | ${tournamentLabel}` : tournamentLabel;
  const description =
    pageDescription ??
    `${tournament.name} è un torneo di ${tournament.sport.toLowerCase()} con formula ${getTournamentFormatLabel(tournament.format).toLowerCase()} per la stagione ${tournament.seasonLabel}. Consulta calendario, squadre e classifica nella pagina pubblica.`;

  return {
    title,
    description,
    alternates: {
      canonical: path ?? `/tournaments/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: BRAND.appName,
      url: path ?? `/tournaments/${slug}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
