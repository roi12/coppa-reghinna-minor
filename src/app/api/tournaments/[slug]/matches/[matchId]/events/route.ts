import { NextResponse } from "next/server";

import {
  MatchPlayerEventError,
  listPublicMatchPlayerEvents,
} from "@/features/matches/server/match-player-events";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; matchId: string }> },
) {
  const { slug, matchId } = await params;

  try {
    const events = await listPublicMatchPlayerEvents(slug, matchId);

    return NextResponse.json(events, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof MatchPlayerEventError) {
      const status = error.code === "MATCH_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }

    throw error;
  }
}
