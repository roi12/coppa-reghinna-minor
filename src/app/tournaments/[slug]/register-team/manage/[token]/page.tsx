import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicTeamRegistrationManagePage } from "@/features/team-registrations/components/public-team-registration-manage-page";
import { getTeamRegistrationByManageToken } from "@/features/team-registrations/server/get-team-registration-by-manage-token";
import { readDashboardFeedback } from "@/lib/dashboard-feedback";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gestione iscrizione squadra",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TournamentRegistrationManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();

  const { slug, token } = await params;

  if (!/^[a-f0-9]{64}$/.test(token)) {
    notFound();
  }

  const registration = await getTeamRegistrationByManageToken(slug, token);

  if (!registration) {
    notFound();
  }

  const feedback = await readDashboardFeedback(searchParams);

  return (
    <PublicTeamRegistrationManagePage
      feedback={feedback}
      registration={registration}
      token={token}
    />
  );
}
