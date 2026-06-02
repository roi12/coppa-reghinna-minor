import { cache } from "react";

import type { TeamSummary } from "@/features/teams/types/team.types";
import { prisma } from "@/lib/prisma";

export const listOrganizationTeams = cache(async (organizationId: string): Promise<TeamSummary[]> => {
  return prisma.team.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      organizationId: true,
      name: true,
      slug: true,
    },
  });
});
