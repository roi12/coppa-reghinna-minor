import { cache } from "react";

import type { PlayerSummary } from "@/features/players/types/player.types";
import { prisma } from "@/lib/prisma";

export const listTeamPlayers = cache(async (teamId: string): Promise<PlayerSummary[]> => {
  return prisma.player.findMany({
    where: { teamId },
    orderBy: [{ jerseyNumber: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      organizationId: true,
      teamId: true,
      firstName: true,
      lastName: true,
      displayName: true,
      jerseyNumber: true,
      role: true,
    },
  });
});
