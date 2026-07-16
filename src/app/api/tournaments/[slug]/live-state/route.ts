import { NextResponse } from "next/server";

import { getPublicTournamentLiveState } from "@/features/tournaments/server/get-public-tournament-live-state";
import { serializePublicTournamentLiveState } from "@/features/tournaments/types/public-tournament-live-state.types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const state = await getPublicTournamentLiveState(slug);

  if (!state) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  return NextResponse.json(serializePublicTournamentLiveState(state), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
