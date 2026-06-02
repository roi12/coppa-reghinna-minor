import type { Metadata } from "next";

import { PublicTournamentOverviewPage } from "@/features/tournaments/components/public-tournament-overview-page";
import { buildPublicTournamentMetadata } from "@/features/tournaments/server/build-public-tournament-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return buildPublicTournamentMetadata({
    slug,
    path: `/tournaments/${slug}`,
    pageTitle: "Panoramica",
    pageDescription:
      "Consulta la panoramica pubblica del torneo con risultati, classifica rapida e collegamenti a squadre e calendario.",
  });
}

export default async function TournamentPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <PublicTournamentOverviewPage slug={slug} />;
}
