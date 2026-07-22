import type { Metadata } from "next";

import { PublicTournamentTeamsPage } from "@/features/teams/components/public-tournament-teams-page";
import { buildPublicTournamentMetadata } from "@/features/tournaments/server/build-public-tournament-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return buildPublicTournamentMetadata({
    slug,
    path: `/tournaments/${slug}/teams`,
    pageTitle: "Squadre",
    pageDescription:
      "Consulta le squadre partecipanti e le rose pubbliche dei giocatori per questo torneo.",
  });
}

export default async function TournamentTeamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ team?: string | string[] }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const highlightedTeamId = Array.isArray(resolvedSearchParams.team)
    ? resolvedSearchParams.team[0] ?? null
    : resolvedSearchParams.team ?? null;

  return <PublicTournamentTeamsPage slug={slug} highlightedTeamId={highlightedTeamId} />;
}
