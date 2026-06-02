import { cache } from "react";

import type {
  TournamentGroupDetail,
  TournamentGroupsSnapshot,
  TournamentGroupTeamSummary,
} from "@/features/groups/types/group.types";
import { prisma } from "@/lib/prisma";

function mapTournamentGroupTeam(entry: {
  id: string;
  createdAt: Date;
  seed: number | null;
  groupSlot: number | null;
  team: {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    _count: {
      players: number;
    };
  };
}): TournamentGroupTeamSummary {
  return {
    tournamentTeamId: entry.id,
    teamId: entry.team.id,
    organizationId: entry.team.organizationId,
    name: entry.team.name,
    slug: entry.team.slug,
    seed: entry.seed,
    groupSlot: entry.groupSlot,
    playerCount: entry.team._count.players,
    createdAt: entry.createdAt,
  };
}

export const listTournamentGroupsWithTeams = cache(
  async (tournamentId: string): Promise<TournamentGroupsSnapshot> => {
    const [groups, unassignedEntries] = await Promise.all([
      prisma.tournamentGroup.findMany({
        where: { tournamentId },
        orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          tournamentId: true,
          name: true,
          sequence: true,
          createdAt: true,
          updatedAt: true,
          teams: {
            orderBy: [{ groupSlot: "asc" }, { seed: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              createdAt: true,
              seed: true,
              groupSlot: true,
              team: {
                select: {
                  id: true,
                  organizationId: true,
                  name: true,
                  slug: true,
                  _count: {
                    select: {
                      players: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.tournamentTeam.findMany({
        where: {
          tournamentId,
          groupId: null,
        },
        orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          createdAt: true,
          seed: true,
          groupSlot: true,
          team: {
            select: {
              id: true,
              organizationId: true,
              name: true,
              slug: true,
              _count: {
                select: {
                  players: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const mappedGroups: TournamentGroupDetail[] = groups.map((group) => ({
      id: group.id,
      tournamentId: group.tournamentId,
      name: group.name,
      sequence: group.sequence,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      teams: group.teams.map(mapTournamentGroupTeam),
    }));

    const unassignedTeams = unassignedEntries.map(mapTournamentGroupTeam);
    const assignedTeamCount = mappedGroups.reduce((count, group) => count + group.teams.length, 0);
    const groupSizes = mappedGroups.map((group) => group.teams.length);

    return {
      groups: mappedGroups,
      existingGroupCount: mappedGroups.length,
      assignedTeamCount,
      unassignedTeamCount: unassignedTeams.length,
      unassignedTeams,
      isUneven:
        groupSizes.length > 1 && new Set(groupSizes).size > 1,
    };
  },
);
