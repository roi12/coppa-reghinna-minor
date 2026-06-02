import { cache } from "react";

import type { OrganizationSummary } from "@/features/organizations/types/organization.types";
import { prisma } from "@/lib/prisma";

export const listOrganizations = cache(async (): Promise<OrganizationSummary[]> => {
  return prisma.organization.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
});
