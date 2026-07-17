import type { Metadata } from "next";

import { PublicMatchEventsPage } from "@/features/matches/components/public-match-events-page";
import { buildPublicTournamentMetadata } from "@/features/tournaments/server/build-public-tournament-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; matchId: string }>;
}): Promise<Metadata> {
  const { slug, matchId } = await params;

  return buildPublicTournamentMetadata({
    slug,
    path: `/tournaments/${slug}/matches/${matchId}`,
    pageTitle: "Cronologia partita",
    pageDescription: "Consulta la cronologia pubblica degli eventi giocatore della partita.",
  });
}

export default async function TournamentMatchEventsPage({
  params,
}: {
  params: Promise<{ slug: string; matchId: string }>;
}) {
  const { slug, matchId } = await params;

  return <PublicMatchEventsPage slug={slug} matchId={matchId} />;
}
