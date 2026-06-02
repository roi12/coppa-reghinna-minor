import { DashboardTournamentPage } from "@/features/tournaments/components/dashboard-tournament-page";
import { readDashboardFeedback } from "@/lib/dashboard-feedback";

export default async function DashboardTournamentRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, feedback] = await Promise.all([params, readDashboardFeedback(searchParams)]);

  return <DashboardTournamentPage slug={slug} feedback={feedback} />;
}
