import type { Metadata } from "next";

import { PublicTournamentStandingsPage } from "@/features/standings/components/public-tournament-standings-page";
import { buildPublicTournamentMetadata } from "@/features/tournaments/server/build-public-tournament-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return buildPublicTournamentMetadata({
    slug,
    path: `/tournaments/${slug}/standings`,
    pageTitle: "Classifica",
    pageDescription:
      "Consulta la classifica pubblica del torneo, aggiornata in base ai risultati finali.",
  });
}

export default async function TournamentStandingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <PublicTournamentStandingsPage slug={slug} />;
}
