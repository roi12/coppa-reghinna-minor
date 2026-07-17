import { MatchStatus, TournamentStatus } from "@prisma/client";

import { filterPublicTournamentMatches } from "@/features/matches/server/public-match-visibility";
import {
  mapMatchSummary,
  matchSummarySelect,
  sortMatchSummaries,
} from "@/features/matches/server/match-summary";
import { getTournamentStandingsSnapshot } from "@/features/standings/server/get-tournament-standings-snapshot";
import { getDisplayRoundLabel } from "@/features/standings/server/preliminary-standings";
import { getKnockoutStageVisibilityState } from "@/features/tournaments/server/tournament-stage-visibility";
import type { PublicTournamentLiveState } from "@/features/tournaments/types/public-tournament-live-state.types";
import { normalizeTournamentFormat } from "@/features/tournaments/utils/tournament-format";
import { prisma } from "@/lib/prisma";

export async function getPublicTournamentLiveState(
  slug: string,
): Promise<PublicTournamentLiveState | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      format: true,
      locationLabel: true,
      status: true,
      stages: {
        select: {
          id: true,
          name: true,
          type: true,
          isPublic: true,
        },
      },
      _count: {
        select: {
          teams: true,
        },
      },
    },
  });

  if (!tournament || tournament.status === TournamentStatus.DRAFT) {
    return null;
  }

  const standingsSnapshot = await getTournamentStandingsSnapshot(tournament.id);
  const rawMatches = await prisma.match.findMany({
    where: { tournamentId: tournament.id },
    select: matchSummarySelect,
  });
  const matches = filterPublicTournamentMatches(
    rawMatches.sort(sortMatchSummaries).map((match) => {
      const summary = mapMatchSummary(match);

      return {
        ...summary,
        roundLabel: getDisplayRoundLabel({
          roundLabel: summary.roundLabel,
          groupName: summary.groupName ?? null,
          standingsMode: standingsSnapshot.mode,
          stageType: summary.stageType ?? null,
        }),
      };
    }),
  );
  const completedMatchCount = matches.filter((match) => match.status === MatchStatus.FINISHED).length;
  const preliminaryStage = tournament.stages.find((stage) => stage.type === "GROUP_STAGE");

  return {
    generatedAt: new Date(),
    tournament: {
      id: tournament.id,
      slug: tournament.slug,
      name: tournament.name,
      format: normalizeTournamentFormat(tournament.format),
      locationLabel: tournament.locationLabel,
      teamCount: tournament._count.teams,
      completedMatchCount,
      knockoutStageIsPublic: getKnockoutStageVisibilityState(tournament.stages).knockoutStageIsPublic,
      preliminaryStandingsMode: standingsSnapshot.mode,
      preliminaryStandingsLabel:
        standingsSnapshot.mode === "GLOBAL"
          ? "Classifica generale"
          : preliminaryStage?.name ?? "Classifiche gironi",
    },
    matches,
    standings: standingsSnapshot.standings,
    groupStandings: standingsSnapshot.groupStandings,
  };
}
