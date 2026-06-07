import { NextResponse } from "next/server";

import { clearDashboardCaptainManageLinkFlash } from "@/features/team-registrations/server/captain-manage-link";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  await clearDashboardCaptainManageLinkFlash(slug);

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
