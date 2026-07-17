import { NextResponse } from "next/server";

import { canManageDashboard, getCurrentUser } from "@/features/auth/server/session";
import { updateMatchPlayerEventSchema } from "@/features/matches/schemas/update-match-player-event.schema";
import {
  MatchPlayerEventError,
  updateMatchPlayerEvent,
} from "@/features/matches/server/match-player-events";

export const dynamic = "force-dynamic";

async function requireApiDashboardUser() {
  const user = await getCurrentUser();

  if (!user || !canManageDashboard(user.role)) {
    return null;
  }

  return user;
}

function getStatusCode(error: MatchPlayerEventError) {
  switch (error.code) {
    case "MATCH_NOT_FOUND":
    case "EVENT_NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    default:
      return 400;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matchId: string; eventId: string }> },
) {
  const user = await requireApiDashboardUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { matchId, eventId } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = updateMatchPlayerEventSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid player-event update payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await updateMatchPlayerEvent({
      matchId,
      eventId,
      ...parsed.data,
      userId: user.id,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof MatchPlayerEventError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: getStatusCode(error) });
    }

    throw error;
  }
}
