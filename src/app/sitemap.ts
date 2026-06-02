import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl().toString().replace(/\/$/, "");

  // TODO: Add dynamic tournament URLs through a runtime-safe sitemap flow that does not
  // require Prisma queries during prerender.
  return [
    {
      url: `${siteUrl}/`,
    },
    {
      url: `${siteUrl}/tournaments`,
    },
    {
      url: `${siteUrl}/login`,
    },
  ];
}
