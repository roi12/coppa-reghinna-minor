import { NextResponse } from "next/server";

import { canManageDashboard, getCurrentUser } from "@/features/auth/server/session";
import { updateLiveMatchSchema } from "@/features/matches/schemas/update-live-match.schema";
import { applyMatchScoringAction } from "@/features/matches/server/match-scoring";
import { MatchScoringError } from "@/features/matches/server/match-scoring-state";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireApiDashboardUser() {
  const user = await getCurrentUser();

  if (!user || !canManageDashboard(user.role)) {
    return null;
  }

  return user;
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
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      status: true,
      homeScore: true,
      awayScore: true,
      scoreVersion: true,
      lastScoreUpdatedAt: true,
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  return NextResponse.json(match, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
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
  const parsed = updateLiveMatchSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid live match update payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await applyMatchScoringAction({
      matchId,
      ...parsed.data,
      userId: user.id,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof MatchScoringError) {
      const status =
        error.code === "MATCH_NOT_FOUND"
          ? 404
          : error.code === "CONFLICT"
            ? 409
            : error.code === "UNAUTHORIZED"
              ? 401
              : 400;

      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }

    throw error;
  }
}
