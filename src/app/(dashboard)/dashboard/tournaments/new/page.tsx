import { DashboardNewTournamentPage } from "@/features/tournaments/components/dashboard-new-tournament-page";
import { readDashboardFeedback } from "@/lib/dashboard-feedback";

export default async function NewTournamentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const feedback = await readDashboardFeedback(searchParams);

  return <DashboardNewTournamentPage feedback={feedback} />;
}
