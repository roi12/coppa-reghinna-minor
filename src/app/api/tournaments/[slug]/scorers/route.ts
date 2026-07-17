import { NextResponse } from "next/server";

import { listPublicTournamentScorers } from "@/features/matches/server/match-player-events";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const scorers = await listPublicTournamentScorers(slug);

  return NextResponse.json(scorers, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
