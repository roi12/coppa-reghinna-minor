import { cache } from "react";

import type { OrganizationSummary } from "@/features/organizations/types/organization.types";
import { prisma } from "@/lib/prisma";

export const getOrganizationBySlug = cache(async (slug: string): Promise<OrganizationSummary | null> => {
  return prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
});
