import { NextResponse } from "next/server";

import { canManageDashboard, getCurrentUser } from "@/features/auth/server/session";
import {
  createMatchPlayerEventSchema,
  reconcileMissingGoalsSchema,
} from "@/features/matches/schemas/create-match-player-event.schema";
import {
  createMatchPlayerEvent,
  MatchPlayerEventError,
  readDashboardMatchEventContext,
  reconcileMissingGoals,
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const user = await requireApiDashboardUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { matchId } = await params;

  try {
    const context = await readDashboardMatchEventContext(matchId);

    return NextResponse.json(context, {
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const user = await requireApiDashboardUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { matchId } = await params;
  const payload = await request.json().catch(() => null);

  if (payload && typeof payload === "object" && payload !== null && payload.action === "reconcile_missing_goals") {
    const parsed = reconcileMissingGoalsSchema.safeParse({
      teamId: (payload as { teamId?: unknown }).teamId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reconciliation payload.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    try {
      const result = await reconcileMissingGoals({
        matchId,
        teamId: parsed.data.teamId,
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

  const parsed = createMatchPlayerEventSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid player-event payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await createMatchPlayerEvent({
      matchId,
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
