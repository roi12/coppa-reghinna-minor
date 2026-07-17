import type { Metadata } from "next";

import { PublicTournamentScorersPage } from "@/features/matches/components/public-tournament-scorers-page";
import { buildPublicTournamentMetadata } from "@/features/tournaments/server/build-public-tournament-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return buildPublicTournamentMetadata({
    slug,
    path: `/tournaments/${slug}/scorers`,
    pageTitle: "Marcatori",
    pageDescription: "Consulta la classifica pubblica dei marcatori del torneo.",
  });
}

export default async function TournamentScorersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <PublicTournamentScorersPage slug={slug} />;
}
