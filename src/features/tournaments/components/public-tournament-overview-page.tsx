import { notFound } from "next/navigation";

import { PublicTournamentLiveOverview } from "@/features/tournaments/components/public-tournament-live-overview";
import { getPublicTournamentLiveState } from "@/features/tournaments/server/get-public-tournament-live-state";
import { serializePublicTournamentLiveState } from "@/features/tournaments/types/public-tournament-live-state.types";

type PublicTournamentOverviewPageProps = {
  slug: string;
};

export async function PublicTournamentOverviewPage({
  slug,
}: PublicTournamentOverviewPageProps) {
  const state = await getPublicTournamentLiveState(slug);

  if (!state) {
    notFound();
  }

  return <PublicTournamentLiveOverview slug={slug} initialState={serializePublicTournamentLiveState(state)} />;
}
