import { MatchStatus, TournamentStatus } from "@prisma/client";

import { filterPublicTournamentMatches } from "@/features/matches/server/public-match-visibility";
import {
  mapMatchSummary,
  matchSummarySelect,
  sortMatchSummaries,
} from "@/features/matches/server/match-summary";
import type { MatchSummary } from "@/features/matches/types/match.types";
import {
  buildPreliminaryStandings,
  getPreliminaryStandingsLabel,
  resolvePreliminaryStandingsScope,
} from "@/features/standings/server/preliminary-standings";
import type { GroupStandingSummary } from "@/features/standings/types/standings.types";
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
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          type: true,
          isPublic: true,
          configuration: true,
        },
      },
      teams: {
        orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
        select: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      groups: {
        orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          stageId: true,
          name: true,
          sequence: true,
          teams: {
            orderBy: [{ groupSlot: "asc" }, { seed: "asc" }, { createdAt: "asc" }],
            select: {
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
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

  const rawMatches = await prisma.match.findMany({
    where: { tournamentId: tournament.id },
    select: matchSummarySelect,
  });
  const matches = filterPublicTournamentMatches(rawMatches.sort(sortMatchSummaries).map(mapMatchSummary));
  const completedMatchCount = matches.filter((match) => match.status === MatchStatus.FINISHED).length;
  const teams = tournament.teams.map((entry) => entry.team);
  const preliminaryStage =
    tournament.stages.find((stage) => stage.type === "GROUP_STAGE") ?? null;
  const preliminaryStandingsMode = resolvePreliminaryStandingsScope({
    tournamentFormat: tournament.format,
    configuration: preliminaryStage?.configuration ?? null,
  });
  const { standings, groupStandings }: {
    standings: PublicTournamentLiveState["standings"];
    groupStandings: GroupStandingSummary[];
  } = buildPreliminaryStandings({
    scope: preliminaryStandingsMode,
    preliminaryStageId: preliminaryStage?.id ?? null,
    teams,
    groups: tournament.groups.map((group) => ({
      id: group.id,
      stageId: group.stageId,
      name: group.name,
      sequence: group.sequence,
      teams: group.teams.map((entry) => entry.team),
    })),
    matches: matches.map((match: MatchSummary) => ({
      stageId: match.stageId,
      groupId: match.groupId,
      status: match.status,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
    })),
  });

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
      preliminaryStandingsMode,
      preliminaryStandingsLabel: getPreliminaryStandingsLabel(preliminaryStandingsMode),
    },
    matches,
    standings,
    groupStandings,
  };
}
