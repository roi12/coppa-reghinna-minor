import { NextResponse } from "next/server";

import { clearCaptainManageLinkFlash } from "@/features/team-registrations/server/captain-manage-link";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  await clearCaptainManageLinkFlash(slug);

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
