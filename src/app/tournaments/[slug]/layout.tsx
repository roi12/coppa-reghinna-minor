import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PublicTournamentLayout } from "@/features/tournaments/components/public-tournament-layout";
import { buildPublicTournamentMetadata } from "@/features/tournaments/server/build-public-tournament-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return buildPublicTournamentMetadata({ slug });
}

export default async function TournamentSlugLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  return <PublicTournamentLayout slug={slug}>{children}</PublicTournamentLayout>;
}
