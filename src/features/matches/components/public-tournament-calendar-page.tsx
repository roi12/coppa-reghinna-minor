import { notFound } from "next/navigation";

import { getPublicTournamentLiveState } from "@/features/tournaments/server/get-public-tournament-live-state";
import { serializePublicTournamentLiveState } from "@/features/tournaments/types/public-tournament-live-state.types";

import { PublicTournamentLiveCalendar } from "./public-tournament-live-calendar";

type PublicTournamentCalendarPageProps = {
  slug: string;
};

export async function PublicTournamentCalendarPage({
  slug,
}: PublicTournamentCalendarPageProps) {
  const state = await getPublicTournamentLiveState(slug);

  if (!state) {
    notFound();
  }

  return <PublicTournamentLiveCalendar slug={slug} initialState={serializePublicTournamentLiveState(state)} />;
}
