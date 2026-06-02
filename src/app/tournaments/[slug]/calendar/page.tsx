import type { Metadata } from "next";

import { PublicTournamentCalendarPage } from "@/features/matches/components/public-tournament-calendar-page";
import { buildPublicTournamentMetadata } from "@/features/tournaments/server/build-public-tournament-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return buildPublicTournamentMetadata({
    slug,
    path: `/tournaments/${slug}/calendar`,
    pageTitle: "Calendario",
    pageDescription:
      "Consulta il calendario pubblico del torneo con partite in programma e risultati finali.",
  });
}

export default async function TournamentCalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <PublicTournamentCalendarPage slug={slug} />;
}
