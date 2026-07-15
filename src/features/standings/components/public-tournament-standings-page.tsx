import { notFound } from "next/navigation";

import { getPublicTournamentLiveState } from "@/features/tournaments/server/get-public-tournament-live-state";

import { PublicTournamentLiveStandings } from "./public-tournament-live-standings";

type PublicTournamentStandingsPageProps = {
  slug: string;
};

export async function PublicTournamentStandingsPage({
  slug,
}: PublicTournamentStandingsPageProps) {
  const state = await getPublicTournamentLiveState(slug);

  if (!state) {
    notFound();
  }

  return <PublicTournamentLiveStandings slug={slug} initialState={state} />;
}
