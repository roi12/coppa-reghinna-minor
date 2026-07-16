import { MatchStatus, TournamentStatus } from "@prisma/client";

import { filterPublicTournamentMatches } from "@/features/matches/server/public-match-visibility";
import {
  mapMatchSummary,
  matchSummarySelect,
  sortMatchSummaries,
} from "@/features/matches/server/match-summary";
import type { MatchSummary } from "@/features/matches/types/match.types";
import { assembleStandingsTable } from "@/features/standings/server/assemble-standings-table";
import { calculateStandings } from "@/features/standings/server/calculate-standings";
import type { GroupStandingSummary } from "@/features/standings/types/standings.types";
import { getKnockoutStageVisibilityState } from "@/features/tournaments/server/tournament-stage-visibility";
import type { PublicTournamentLiveState } from "@/features/tournaments/types/public-tournament-live-state.types";
import { normalizeTournamentFormat } from "@/features/tournaments/utils/tournament-format";
import { prisma } from "@/lib/prisma";

function buildStandingsFromMatches(matches: MatchSummary[], teams: Array<{ id: string; name: string }>) {
  const finishedMatches = matches.flatMap((match) => {
    if (
      match.status !== MatchStatus.FINISHED ||
      !match.homeTeamId ||
      !match.awayTeamId
    ) {
      return [];
    }

    return [
      {
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
    ];
  });

  return assembleStandingsTable(calculateStandings(finishedMatches), teams);
}

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
          type: true,
          isPublic: true,
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

  const groupStandings: GroupStandingSummary[] = tournament.groups.map((group) => {
    const groupMatches = matches.filter((match) => match.groupId === group.id);
    const groupTeams = group.teams.map((entry) => entry.team);

    return {
      groupId: group.id,
      groupName: group.name,
      sequence: group.sequence,
      teamCount: groupTeams.length,
      playedMatchCount: groupMatches.filter((match) => match.status === MatchStatus.FINISHED).length,
      rows: buildStandingsFromMatches(groupMatches, groupTeams),
    };
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
    },
    matches,
    standings: buildStandingsFromMatches(matches, teams),
    groupStandings,
  };
}
