import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";

import { PublicTournamentTeamRegistrationPage } from "@/features/team-registrations/components/public-tournament-team-registration-page";
import { readCaptainManageLinkFlash } from "@/features/team-registrations/server/captain-manage-link";
import { buildPublicTournamentMetadata } from "@/features/tournaments/server/build-public-tournament-metadata";
import { readDashboardFeedback } from "@/lib/dashboard-feedback";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return buildPublicTournamentMetadata({
    slug,
    path: `/tournaments/${slug}/register-team`,
    pageTitle: "Registra squadra",
    pageDescription:
      "Invia l'iscrizione di una squadra per questo torneo pubblicato, con dati del capitano e rosa futsal completa.",
  });
}

export default async function TournamentRegisterTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();

  const { slug } = await params;
  const [feedback, manageLinkReveal] = await Promise.all([
    readDashboardFeedback(searchParams),
    readCaptainManageLinkFlash(slug),
  ]);

  return (
    <PublicTournamentTeamRegistrationPage
      slug={slug}
      feedback={feedback}
      manageLinkReveal={manageLinkReveal}
    />
  );
}
